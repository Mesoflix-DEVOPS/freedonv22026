import { generateDerivApiInstance } from '@deriv/bot-skeleton/src/services/api/appId';
import { db } from './FirebaseConfig';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    limit, 
    serverTimestamp,
    where,
    Timestamp,
    QuerySnapshot,
    DocumentChange,
    FirestoreError
} from 'firebase/firestore';

class CopyTradingLogic {
    private copier_token: string = '';
    private trader_token: string = '';
    private is_copying: boolean = false;
    private is_paused: boolean = false;
    private is_manual_mirror: boolean = false;
    private is_master: boolean = false;
    private broadcast_channel: BroadcastChannel | null = null;
    private unsubscribe_firestore: (() => void) | null = null;
    
    // API Instances
    private copier_api: any = null;
    private trader_api: any = null;

    // Track last copied contract to avoid duplicate buys from subscription updates
    private last_mirrored_contract_id: number | null = null;
    private processed_signal_ids: Set<string> = new Set();

    // Risk targets
    private max_stake: number = 100;
    private min_stake: number = 0.35;

    constructor() {
        if (typeof window !== 'undefined') {
            this.broadcast_channel = new BroadcastChannel('deriv_manual_mirror');
            this.initSignalListeners();
        }
    }

    private initSignalListeners() {
        // 1. Local BroadcastChannel Listener (For same-browser tabs)
        if (this.broadcast_channel) {
            this.broadcast_channel.onmessage = (event) => {
                if (this.is_manual_mirror && !this.is_master && this.is_copying && !this.is_paused) {
                    this.handleSignal(event.data, 'Local-Mirror');
                }
            };
        }

        // 2. Global Firestore Listener (For platform-wide real-time sync)
        const signalsRef = collection(db, 'realtime_copy_signals');
        // Only listen for signals created in the last 1 minute to avoid catching old trades on start
        const oneMinuteAgo = new Date(Date.now() - 60000);
        const q = query(
            signalsRef, 
            where('timestamp', '>', Timestamp.fromDate(oneMinuteAgo)),
            orderBy('timestamp', 'desc'), 
            limit(5)
        );

        this.unsubscribe_firestore = onSnapshot(q, (snapshot: QuerySnapshot) => {
            if (!this.is_manual_mirror || this.is_master || !this.is_copying || this.is_paused) return;

            snapshot.docChanges().forEach((change: DocumentChange) => {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    const signalId = change.doc.id;

                    if (!this.processed_signal_ids.has(signalId)) {
                        console.log('[CopyTrading] NEW Global Signal received:', signal);
                        this.handleSignal(signal, 'Global-Sync');
                        this.processed_signal_ids.add(signalId);
                    }
                }
            });
        }, (error: FirestoreError) => {
            console.error('[CopyTrading] Firestore sync error:', error);
        });
    }

    private handleSignal(tradeData: any, source: string) {
        // Avoid duplicating the same contract multiple times from different sources
        if (tradeData.contract_id !== this.last_mirrored_contract_id) {
            console.log(`[CopyTrading] Processing trade from ${source}:`, tradeData.contract_id);
            this.executeMirroredTrade(tradeData);
            this.last_mirrored_contract_id = tradeData.contract_id;
        }
    }

    setManualMirror(enabled: boolean) {
        this.is_manual_mirror = enabled;
        console.log(`[CopyTrading] Manual Mirror: ${enabled}`);
    }

    setAsMaster(enabled: boolean) {
        this.is_master = enabled;
        console.log(`[CopyTrading] Master Mode: ${enabled}`);
    }

    setRiskSettings(max: number, min: number) {
        this.max_stake = max;
        this.min_stake = min;
    }

    /**
     * Executes a mirrored trade using the "buy with parameters" method for maximum reliability.
     */
    private async executeMirroredTrade(tradeData: any) {
        if (!this.copier_token) return;
        
        try {
            // Ensure copier API is ready and authorized
            if (!this.copier_api) {
                this.copier_api = generateDerivApiInstance();
                await this.copier_api.authorize(this.copier_token);
            }

            const { amount, symbol, contract_type, duration, duration_unit, barrier, basis } = tradeData;

            // Risk Management Logic: Clamp the stake
            const adjusted_amount = Math.min(
                this.max_stake,
                Math.max(this.min_stake, amount || 0)
            );

            // PRD FIX: Use parameters to reconstruct the trade exactly as the master did
            const request = {
                buy: 1,
                price: adjusted_amount,
                parameters: {
                    amount: adjusted_amount,
                    basis: basis || 'stake',
                    contract_type: contract_type,
                    currency: (this.copier_api.account_info?.currency || 'USD'),
                    duration: duration,
                    duration_unit: duration_unit,
                    symbol: symbol,
                    barrier: barrier || undefined
                }
            };

            console.log('[CopyTrading] Executing mirrored trade (Buy with params):', request);
            const res = await this.copier_api.send(request);
            
            if (res.error) {
                console.error('[CopyTrading] Mirror execution error:', res.error.message);
            } else {
                console.log('[CopyTrading] Mirror trade success:', res.buy);
            }
        } catch (e) {
            console.error('[CopyTrading] Mirror execution exception:', e);
        }
    }

    async broadcastTrade(tradeData: any) {
        if (!this.is_manual_mirror || !this.is_master) return;

        // 1. Broadcast locally via BroadcastChannel
        if (this.broadcast_channel) {
            this.broadcast_channel.postMessage(tradeData);
        }

        // 2. Broadcast globally via Firestore
        try {
            const signalsRef = collection(db, 'realtime_copy_signals');
            await addDoc(signalsRef, {
                ...tradeData,
                timestamp: serverTimestamp(),
                master_account: (this.trader_api?.account_info?.loginid || 'unknown')
            });
            console.log('[CopyTrading] Global signal broadcasted to cloud');
        } catch (e) {
            console.error('[CopyTrading] Failed to broadcast to cloud:', e);
        }
    }

    setTokens(copier: string, trader: string) {
        this.copier_token = copier;
        this.trader_token = trader;
    }

    getStatus() {
        return {
            is_copying: this.is_copying,
            is_paused: this.is_paused,
            has_copier_token: !!this.copier_token,
            has_trader_token: !!this.trader_token,
            is_manual_mirror: this.is_manual_mirror,
            is_master: this.is_master
        };
    }

    /**
     * TRADER ENGINE: Enable an account to be copied in Deriv's logic
     */
    async becomeTrader(token: string) {
        const api = generateDerivApiInstance();
        try {
            await api.authorize(token);
            const response = await api.send({
                set_settings: 1,
                allow_copiers: 1
            });
            
            if (response.error) return { error: response.error };
            return { data: response.set_settings };
        } catch (err: any) {
            return { error: err?.error || err };
        } finally {
            api.disconnect();
        }
    }

    /**
     * TRADER ENGINE: Start the "Master" listener that watches for active trades
     */
    async startTradeListener(token: string) {
        if (this.trader_api) this.trader_api.disconnect();
        
        this.trader_api = generateDerivApiInstance();
        try {
            await this.trader_api.authorize(token);
            
            // Subscribe to open contracts to get all trade params in real-time
            this.trader_api.send({
                proposal_open_contract: 1,
                subscribe: 1
            });

            this.trader_api.onMessage().subscribe((response: any) => {
                const data = response.data;
                if (data.msg_type === 'proposal_open_contract') {
                    const contract = data.proposal_open_contract;
                    
                    // IF trade is active (is_sold === 0 and status === 'open')
                    if (contract && contract.is_sold === 0 && contract.status === 'open') {
                        // Gather ALL params to ensure the copier can reconstruct accurately
                        this.broadcastTrade({
                            contract_id: contract.contract_id,
                            amount: contract.buy_price,
                            symbol: contract.underlying,
                            contract_type: contract.contract_type,
                            duration: this.getDuration(contract),
                            duration_unit: this.getDurationUnit(contract),
                            barrier: contract.barrier,
                            basis: 'stake' // Typically stake for copy trading
                        });
                    }
                }
            });

            console.log('[CopyTrading] Trade Listener started for Trader Master');
            return { success: true };
        } catch (err: any) {
            console.error('[CopyTrading] Failed to start listener:', err);
            return { error: err?.error || err };
        }
    }

    private getDuration(contract: any): number {
        // Fallback or calculate from start/end if duration missing
        if (contract.duration) return contract.duration;
        const diff = contract.date_expiry - contract.date_start;
        return (diff > 0) ? diff : 60; // default 60s
    }

    private getDurationUnit(contract: any): string {
        if (contract.duration_unit) return contract.duration_unit;
        return 's'; // default seconds
    }

    stopTradeListener() {
        if (this.trader_api) {
            this.trader_api.disconnect();
            this.trader_api = null;
        }
        console.log('[CopyTrading] Trade Listener stopped');
    }

    /**
     * COPIER ENGINE: Official Deriv Copy Trading
     */
    async startCopying(trader_token: string, copier_token: string, options: any = {}) {
        if (this.copier_api) this.copier_api.disconnect();
        
        this.copier_api = generateDerivApiInstance();
        try {
            // STEP 3 PRD: Authorize with copier token
            await this.copier_api.authorize(copier_token);
            
            const copier_login_id = this.copier_api.account_info?.loginid;
            if (!copier_login_id) throw new Error('Could not retrieve Copier Login ID');

            // STEP 3 PRD: copy_start: TRADER_TOKEN, loginid: COPIER_LOGIN_ID
            const request: any = {
                copy_start: trader_token,
                loginid: copier_login_id,
            };

            if (options.max_trade_stake) request.max_trade_stake = Number(options.max_trade_stake);
            if (options.min_trade_stake) request.min_trade_stake = Number(options.min_trade_stake);

            console.log('[CopyTrading] Initiating OFFICIAL copy_start:', request);

            const response = await this.copier_api.send(request);
            if (response.error) return { error: response.error };
            
            this.is_copying = true;
            this.is_paused = false;
            return { data: response.copy_start };
        } catch (err: any) {
            return { error: err?.error || err };
        }
    }

    async stopCopying(trader_token: string, copier_token: string) {
        if (!this.copier_api) {
            this.copier_api = generateDerivApiInstance();
            await this.copier_api.authorize(copier_token);
        }

        try {
            const response = await this.copier_api.send({
                copy_stop: trader_token
            });
            
            if (response.error) return { error: response.error };
            
            this.is_copying = false;
            this.is_paused = false;
            return { data: response.copy_stop };
        } catch (err: any) {
            return { error: err?.error || err };
        }
    }
}

export const copy_trading_logic = new CopyTradingLogic();
