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
    barrier2?: string;
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
    private follower_tokens: string[] = [];
    private follower_apis: Map<string, any> = new Map();
    private unsubscribe_firestore: (() => void) | null = null;
    
    private last_trade_time: string | null = null;
    
    // Tracking
    private last_mirrored_contract_id: number | null = null;
    private processed_signal_ids: Set<string> = new Set();

    // Risk targets (Global)
    private max_stake: number = 100;
    private min_stake: number = 0.35;

    private is_mirroring: boolean = false;
    private active_api: any = null;
    private unsubscribe_active: any = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.loadFromStorage();
            this.initGlobalListener();
            // Auto-init session if mirroring was saved as active
            if (this.is_mirroring && this.follower_tokens.length > 0) {
                console.log('[CopyTrading] 🔄 Auto-initializing mirroring session...');
                this.initAuthorizedSession();
            }
        }
    }

    private loadFromStorage() {
        try {
            const saved = localStorage.getItem('deriv_follower_tokens');
            if (saved) {
                this.follower_tokens = JSON.parse(saved);
            } else {
                // Compatibility with old single-token key
                const oldToken = localStorage.getItem('deriv_target_token');
                if (oldToken) {
                    this.follower_tokens = [oldToken];
                    this.saveToStorage();
                    localStorage.removeItem('deriv_target_token'); // Migration
                }
            }
            
            const savedMax = localStorage.getItem('deriv_mirror_max_stake');
            const savedMin = localStorage.getItem('deriv_mirror_min_stake');
            const savedMirroring = localStorage.getItem('deriv_is_mirroring');
            
            if (savedMax) this.max_stake = Number(savedMax);
            if (savedMin) this.min_stake = Number(savedMin);
            if (savedMirroring) this.is_mirroring = savedMirroring === 'true';
        } catch (e) {
            console.error('[CopyTrading] Storage load failed:', e);
        }
    }

    private saveToStorage() {
        localStorage.setItem('deriv_follower_tokens', JSON.stringify(this.follower_tokens));
        localStorage.setItem('deriv_mirror_max_stake', this.max_stake.toString());
        localStorage.setItem('deriv_mirror_min_stake', this.min_stake.toString());
        localStorage.setItem('deriv_is_mirroring', this.is_mirroring.toString());
    }

    /**
     * Authorized all followers in the background. 
     * Used on startup or when shifting into Mirror Mode.
     */
    async initAuthorizedSession() {
        if (this.follower_tokens.length === 0) return;
        
        console.log(`[CopyTrading] 🔐 Authorizing ${this.follower_tokens.length} followers...`);
        const authPromises = this.follower_tokens.map(async (token) => {
            try {
                let api = this.follower_apis.get(token);
                if (!api || !api.send) {
                    api = generateDerivApiInstance() as any;
                    this.follower_apis.set(token, api);
                }
                const res = await api.authorize(token);
                api.account_info = res.authorize;
                console.log(`[CopyTrading] ✅ Follower ${token.substring(0, 4)} Ready: ${res.authorize.loginid}`);
            } catch (e) {
                console.error(`[CopyTrading] ❌ Follower ${token.substring(0, 4)} Auth Failed`, e);
            }
        });
        await Promise.all(authPromises);
    }

    private initGlobalListener() {
        const signalsRef = collection(db, 'realtime_copy_signals');
        // Lenient 5-minute window to avoid missing signals due to clock drift
        const fiveMinutesAgo = new Date(Date.now() - 300000);
        
        console.log('[CopyTrading] 📡 Firestore listener active.');

        const q = query(
            signalsRef, 
            where('timestamp', '>', Timestamp.fromDate(fiveMinutesAgo)),
            orderBy('timestamp', 'desc'), 
            limit(15)
        );

        this.unsubscribe_firestore = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            if (!this.is_mirroring || this.follower_tokens.length === 0) return;

            snapshot.docChanges().forEach((change: DocumentChange<DocumentData>) => {
                if (change.type === 'added') {
                    const signal = change.doc.data() as TradeSignal;
                    if (!this.processed_signal_ids.has(change.doc.id)) {
                        console.log(`[CopyTrading] 📥 Received signal via Network: ${signal.contract_type} ${signal.symbol} | Amount: ${signal.amount}`);
                        this.handleSignal(signal);
                        this.processed_signal_ids.add(change.doc.id);

                        if (this.processed_signal_ids.size > 200) {
                            const firstValue = this.processed_signal_ids.values().next().value;
                            if (firstValue) this.processed_signal_ids.delete(firstValue);
                        }
                    }
                }
            });
        }, (error: FirestoreError) => {
            console.error('[CopyTrading] Firestore sync error:', error);
        });
    }

    private handleSignal(tradeData: TradeSignal) {
        if (tradeData.contract_id !== this.last_mirrored_contract_id) {
            this.executeTargetTrades(tradeData);
            this.last_mirrored_contract_id = tradeData.contract_id;
        }
    }

    // --- Follower Management ---

    async addFollower(token: string) {
        const t = token.trim();
        if (!t || t.length < 10) return { error: 'Invalid Token' };
        if (this.follower_tokens.includes(t)) return { error: 'Token already linked' };
        
        try {
            const testApi = generateDerivApiInstance() as any;
            const res = await testApi.authorize(t);
            testApi.account_info = res.authorize;
            
            this.follower_tokens.push(t);
            this.follower_apis.set(t, testApi);
            this.saveToStorage();
            
            return { success: true };
        } catch (err: any) {
            return { error: err?.error?.message || 'Authorization failed' };
        }
    }

    removeFollower(token: string) {
        this.follower_tokens = this.follower_tokens.filter(t => t !== token);
        const api = this.follower_apis.get(token);
        if (api) {
            api.disconnect();
            this.follower_apis.delete(token);
        }
        this.saveToStorage();
    }

    setRiskSettings(max: number, min: number) {
        this.max_stake = max;
        this.min_stake = min;
        this.saveToStorage();
    }

    async startMirroring(activeApi?: any) {
        if (this.follower_tokens.length === 0) return { error: { message: 'No Follower Tokens linked' } };
        
        try {
            this.is_mirroring = true;
            this.saveToStorage();

            // 1. Initialize Follower APIs
            await this.initAuthorizedSession();

            // 2. Subscribe to Active Account's trades (if provided)
            if (activeApi && typeof activeApi.onMessage === 'function') {
                this.active_api = activeApi;
                if (this.unsubscribe_active) this.unsubscribe_active.unsubscribe();
                
                this.unsubscribe_active = this.active_api.onMessage().subscribe((response: any) => {
                    const msg = response?.data || response;
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
                                barrier2: contract.barrier2,
                                basis: 'stake'
                            });
                        }
                    }
                });

                this.active_api.send({ proposal_open_contract: 1, subscribe: 1 });
            }

            console.log(`[CopyTrading] Mirror Hub ACTIVE with ${this.follower_apis.size} followers`);
            return { success: true };
        } catch (err: any) {
            console.error('[CopyTrading] Start failed:', err);
            this.is_mirroring = false;
            return { error: { message: err?.message || 'Connection failed' } };
        }
    }

    stopMirroring() {
        this.is_mirroring = false;
        this.saveToStorage();
        if (this.unsubscribe_active) {
            this.unsubscribe_active.unsubscribe();
            this.unsubscribe_active = null;
        }
        this.follower_apis.forEach(api => api.disconnect());
        this.follower_apis.clear();
        console.log('[CopyTrading] Mirror Hub Stopped');
    }

    private async executeWithReAuth(api: any, token: string, request: object) {
        try {
            let res = await api.send(request);
            
            if (res.error?.code === 'AuthorizationRequired' || res.error?.code === 'InvalidToken') {
                console.warn(`[CopyTrading] Follower ${token.substring(0,4)} needs re-auth...`);
                const authRes = await api.authorize(token);
                api.account_info = authRes.authorize;
                // Retry once
                res = await api.send(request);
            }
            return res;
        } catch (e) {
            console.error(`[CopyTrading] Request failed for ${token.substring(0,4)}:`, e);
            return { error: { message: 'Network or internal error' } };
        }
    }

    private async executeTargetTrades(tradeData: TradeSignal) {
        if (!this.is_mirroring) {
            console.warn('[CopyTrading] Mirroring is disabled, skipping execution.');
            return;
        }
        
        if (this.follower_apis.size === 0) {
            console.warn('[CopyTrading] 🛑 No authorized followers found. Re-initializing session...');
            await this.initAuthorizedSession();
            if (this.follower_apis.size === 0) {
                 console.error('[CopyTrading] 🛑 Still no followers after re-init. Aborting.');
                 return;
            }
        }
        
        const { amount, symbol, contract_type, duration, duration_unit, barrier, barrier2, basis } = tradeData;
        
        if (!symbol || !contract_type) {
            console.error('[CopyTrading] ❌ Missing symbol or contract_type in signal:', tradeData);
            return;
        }

        const adjusted_amount = Math.min(this.max_stake, Math.max(this.min_stake, amount || 0));

        this.follower_apis.forEach(async (api, token) => {
            try {
                if (!api || typeof api.send !== 'function') return;

                console.log(`[CopyTrading] 🚀 Mirroring to ${token.substring(0,4)}: ${contract_type} ${symbol} | Dur: ${duration}${duration_unit}`);

                const proposal_req: any = {
                    proposal: 1,
                    amount: adjusted_amount,
                    basis: basis || 'stake',
                    contract_type,
                    currency: api.account_info?.currency || 'USD',
                    duration: Math.max(1, duration),
                    duration_unit,
                    symbol,
                };

                if (barrier !== undefined && barrier !== null && String(barrier).trim() !== '') {
                    proposal_req.barrier = barrier;
                }
                if (barrier2 !== undefined && barrier2 !== null && String(barrier2).trim() !== '') {
                    proposal_req.barrier2 = barrier2;
                }

                const proposal_res = await this.executeWithReAuth(api, token, proposal_req);
                if (proposal_res.error) {
                    console.error(`[CopyTrading] ❌ Proposal failed (${token.substring(0,4)}): ${proposal_res.error.message}`);
                    return;
                }

                const proposal_id = proposal_res.proposal.id;
                const buy_res = await this.executeWithReAuth(api, token, { buy: proposal_id, price: adjusted_amount });
                
                if (buy_res.error) {
                    console.error(`[CopyTrading] ❌ Buy failed (${token.substring(0,4)}): ${buy_res.error.message}`);
                } else {
                    this.last_trade_time = new Date().toLocaleTimeString();
                    console.log(`[CopyTrading] ✅ Mirror SUCCESS (${token.substring(0,4)}) | CID: ${buy_res.buy.contract_id}`);
                    
                    api.send({ balance: 1 }).then((balRes: any) => {
                        if (balRes.balance) {
                             console.log(`[CopyTrading] 💰 New Balance (${token.substring(0,4)}): ${balRes.balance.balance}`);
                        }
                    });
                }
            } catch (e) {
                console.error(`[CopyTrading] 💥 Execution exception for ${token.substring(0,4)}:`, e);
            }
        });
    }

    async broadcastTrade(tradeData: TradeSignal) {
        if (!this.is_mirroring) return;
        
        try {
            const cleanData = Object.fromEntries(
                Object.entries(tradeData).filter(([_, v]) => v !== undefined && v !== null)
            );

            const signalsRef = collection(db, 'realtime_copy_signals');
            await addDoc(signalsRef, {
                ...cleanData,
                timestamp: serverTimestamp(),
                master_account: this.active_api?.account_info?.loginid || localStorage.getItem('active_loginid') || 'active_ui'
            });
            this.handleSignal(tradeData);
        } catch (e) {
            console.error('[CopyTrading] Broadcast error:', e);
        }
    }

    getStatus() {
        return {
            is_mirroring: this.is_mirroring,
            followers_count: this.follower_tokens.length,
            active_followers: this.follower_apis.size,
            tokens: this.follower_tokens,
            max_stake: this.max_stake,
            min_stake: this.min_stake,
            last_trade_time: this.last_trade_time
        };
    }
}

export const copy_trading_logic = new CopyTradingLogic();
