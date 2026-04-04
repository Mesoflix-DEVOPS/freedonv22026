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
    FirestoreError,
    DocumentData
} from 'firebase/firestore';

interface TradeSignal {
    contract_id: number;
    amount: number;
    symbol: string;
    contract_type: string;
    duration: number;
    duration_unit: string;
    barrier?: string;
    basis: string;
    timestamp?: any;
    master_account?: string;
}

interface DerivApi {
    send: (request: object) => Promise<any>;
    authorize: (token: string) => Promise<any>;
    onMessage: () => { subscribe: (callback: (response: any) => void) => { unsubscribe: () => void } };
    disconnect: () => void;
    account_info?: {
        loginid?: string;
        currency?: string;
    };
}

class CopyTradingLogic {
    private target_token: string = '';
    private is_mirroring: boolean = false;
    private target_api: DerivApi | null = null;
    private active_api: DerivApi | null = null;
    private unsubscribe_active: { unsubscribe: () => void } | null = null;
    private unsubscribe_firestore: (() => void) | null = null;
    
    // Tracking
    private last_mirrored_contract_id: number | null = null;
    private processed_signal_ids: Set<string> = new Set();

    // Risk targets
    private max_stake: number = 100;
    private min_stake: number = 0.35;

    constructor() {
        if (typeof window !== 'undefined') {
            this.initGlobalListener();
        }
    }

    private initGlobalListener() {
        // Global Firestore Listener (For platform-wide real-time sync)
        const signalsRef = collection(db, 'realtime_copy_signals');
        const oneMinuteAgo = new Date(Date.now() - 60000);
        const q = query(
            signalsRef, 
            where('timestamp', '>', Timestamp.fromDate(oneMinuteAgo)),
            orderBy('timestamp', 'desc'), 
            limit(5)
        );

        this.unsubscribe_firestore = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            if (!this.is_mirroring || !this.target_token) return;

            snapshot.docChanges().forEach((change: DocumentChange<DocumentData>) => {
                if (change.type === 'added') {
                    const signal = change.doc.data() as TradeSignal;
                    if (!this.processed_signal_ids.has(change.doc.id)) {
                        console.log('[CopyTrading] NEW Universal Signal:', signal);
                        this.handleSignal(signal);
                        this.processed_signal_ids.add(change.doc.id);
                    }
                }
            });
        }, (error: FirestoreError) => {
            console.error('[CopyTrading] Firestore sync error:', error);
        });
    }

    private handleSignal(tradeData: TradeSignal) {
        if (tradeData.contract_id !== this.last_mirrored_contract_id) {
            this.executeTargetTrade(tradeData);
            this.last_mirrored_contract_id = tradeData.contract_id;
        }
    }

    setTargetToken(token: string) {
        this.target_token = token;
        if (this.target_api) {
            this.target_api.disconnect();
            this.target_api = null;
        }
    }

    setRiskSettings(max: number, min: number) {
        this.max_stake = max;
        this.min_stake = min;
    }

    /**
     * UNIFIED START: Listen to the active account and mirror to the target token.
     */
    async startMirroring(activeApi: any) {
        if (!this.target_token) return { error: { message: 'Target Token missing' } };
        
        try {
            if (!activeApi) return { error: { message: 'Active connection not found' } };
            
            // Standard Deriv API check
            const hasOnMessage = typeof activeApi.onMessage === 'function';
            if (!hasOnMessage) {
                return { error: { message: 'Active API initialized incorrectly' } };
            }

            this.active_api = activeApi;
            this.is_mirroring = true;
            
            // 1. Authorize Target API
            if (!this.target_api) {
                this.target_api = generateDerivApiInstance() as any;
                await (this.target_api as any).authorize(this.target_token);
            }

            // 2. Subscribe to Active Account's trades
            this.unsubscribe_active = this.active_api.onMessage().subscribe((response: any) => {
                const msg = response?.data || response; // Support both structures
                if (msg.msg_type === 'proposal_open_contract') {
                    const contract = msg.proposal_open_contract;
                    if (contract && contract.is_sold === 0 && contract.status === 'open') {
                        this.broadcastTrade({
                            contract_id: contract.contract_id,
                            amount: contract.buy_price,
                            symbol: contract.underlying,
                            contract_type: contract.contract_type,
                            duration: contract.duration || (contract.date_expiry - contract.date_start),
                            duration_unit: contract.duration_unit || 's',
                            barrier: contract.barrier,
                            basis: 'stake'
                        });
                    }
                }
            });

            // Ensure we are watching for trades on active connection
            this.active_api.send({ proposal_open_contract: 1, subscribe: 1 });

            console.log('[CopyTrading] Unified Mirroring Active (Active -> Target)');
            return { success: true };
        } catch (err: any) {
            console.error('[CopyTrading] Start failed:', err);
            this.is_mirroring = false;
            return { error: { message: err?.error?.message || err?.message || 'Connection failed' } };
        }
    }

    stopMirroring() {
        this.is_mirroring = false;
        if (this.unsubscribe_active) {
            this.unsubscribe_active.unsubscribe();
            this.unsubscribe_active = null;
        }
        if (this.target_api) {
            (this.target_api as any).disconnect();
            this.target_api = null;
        }
        console.log('[CopyTrading] Unified Mirroring Stopped');
    }

    private async executeTargetTrade(tradeData: TradeSignal) {
        if (!this.target_api || !this.is_mirroring) return;
        
        try {
            const { amount, symbol, contract_type, duration, duration_unit, barrier, basis } = tradeData;
            const adjusted_amount = Math.min(this.max_stake, Math.max(this.min_stake, amount || 0));

            const request = {
                buy: 1,
                price: adjusted_amount,
                parameters: {
                    amount: adjusted_amount,
                    basis: basis || 'stake',
                    contract_type: contract_type,
                    currency: (this.target_api as any).account_info?.currency || 'USD',
                    duration: duration,
                    duration_unit: duration_unit,
                    symbol: symbol,
                    barrier: barrier || undefined
                }
            };

            const res = await (this.target_api as any).send(request);
            if (res.error) console.error('[CopyTrading] Target trade error:', res.error.message);
            else console.log('[CopyTrading] Mirror successful on target!');
        } catch (e) {
            console.error('[CopyTrading] Execution exception:', e);
        }
    }

    async broadcastTrade(tradeData: TradeSignal) {
        if (!this.is_mirroring) return;

        try {
            const signalsRef = collection(db, 'realtime_copy_signals');
            await addDoc(signalsRef, {
                ...tradeData,
                timestamp: serverTimestamp(),
                master_account: (this.active_api as any)?.account_info?.loginid || 'active_ui'
            });
            // Also handle locally immediately for lower latency
            this.handleSignal(tradeData);
        } catch (e) {
            console.error('[CopyTrading] Cloud broadcast error:', e);
        }
    }

    getStatus() {
        return {
            is_mirroring: this.is_mirroring,
            has_target_token: !!this.target_token
        };
    }
}

export const copy_trading_logic = new CopyTradingLogic();
