import { generateDerivApiInstance } from '@deriv/bot-skeleton/src/services/api/appId';
import { observer as globalObserver } from '@deriv/bot-skeleton/src/utils/observer';
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
    private follower_balances: Map<string, { balance: number, currency: string, loginid: string, last_status?: string, last_sync?: string }> = new Map();
    private follower_trades: Map<string, any[]> = new Map();
    private follower_subscriptions: Map<string, any> = new Map();
    private unsubscribe_firestore: (() => void) | null = null;
    private balance_timer: NodeJS.Timeout | null = null;
    
    private last_trade_time: string | null = null;
    
    // Tracking
    private last_mirrored_contract_id: number | null = null;
    private processed_signal_ids: Set<string> = new Set();
    private mirrored_local_ids: Set<number> = new Set();

    private max_stake: number = 100;
    private min_stake: number = 0.35;
    
    private is_sync_active: boolean = false;
    private paused_tokens: Set<string> = new Set();
    private active_api: any = null;
    private unsubscribe_active: any = null;
    private engine_trace: string[] = [];

    // Parallel Sync State
    private last_proposal_params: any = null;
    private last_direct_exec_time: number = 0;

    constructor() {
        if (typeof window !== 'undefined') {
            this.loadFromStorage();
            this.initGlobalListener();

            // Direct Parallel Hook - Capture proposal params
            globalObserver.register('api.proposal_sent', (request: any) => {
                if (request && request.proposal === 1) {
                    this.last_proposal_params = request;
                }
            });

            // Direct Parallel Hook - Trigger simultaneous trades
            globalObserver.register('api.buy_sent', (request: any) => {
                if (this.is_sync_active && this.last_proposal_params && this.follower_tokens.length > 0) {
                    // Anti-Spam / Deduplicate within 500ms
                    const now = Date.now();
                    if (now - this.last_direct_exec_time < 500) return;
                    this.last_direct_exec_time = now;

                    console.log('[NetworkSync] ⚡ DIRECT PARALLEL SIGNAL CAPTURED. Syncing across network...');
                    this.addTrace("Direct Parallel Execution [UI Blitz]");

                    this.executeTargetTrades({
                        contract_id: now, // Unique pseudo-id for this sync event
                        amount: this.last_proposal_params.amount || request.price,
                        symbol: this.last_proposal_params.symbol,
                        contract_type: this.last_proposal_params.contract_type,
                        duration: this.last_proposal_params.duration,
                        duration_unit: this.last_proposal_params.duration_unit,
                        barrier: this.last_proposal_params.barrier,
                        barrier2: this.last_proposal_params.barrier2,
                        basis: this.last_proposal_params.basis || 'stake',
                        master_account: 'ui_direct_sync'
                    });
                }
            });

            // Auto-init session if network sync was saved as active
            if (this.is_sync_active && this.follower_tokens.length > 0) {
                console.log('[NetworkSync] 🔄 Auto-initializing network sessions...');
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
            const savedSync = localStorage.getItem('deriv_is_network_sync') || localStorage.getItem('deriv_is_mirroring');
            const savedPaused = localStorage.getItem('deriv_paused_tokens');
            
            if (savedMax) this.max_stake = Number(savedMax);
            if (savedMin) this.min_stake = Number(savedMin);
            if (savedSync) this.is_sync_active = savedSync === 'true';
            if (savedPaused) {
                try {
                    const parsed = JSON.parse(savedPaused);
                    if (Array.isArray(parsed)) {
                        this.paused_tokens = new Set(parsed);
                    }
                } catch (e) {
                    console.error('[NetworkSync] Failed to parse paused_tokens', e);
                }
            }
            
        } catch (e) {
            console.error('[CopyTrading] Storage load failed:', e);
        }
    }

    private saveToStorage() {
        localStorage.setItem('deriv_follower_tokens', JSON.stringify(this.follower_tokens));
        localStorage.setItem('deriv_mirror_max_stake', this.max_stake.toString());
        localStorage.setItem('deriv_mirror_min_stake', this.min_stake.toString());
        localStorage.setItem('deriv_is_network_sync', this.is_sync_active.toString());
        localStorage.setItem('deriv_paused_tokens', JSON.stringify([...this.paused_tokens]));
    }

    /**
     * Authorized all followers in the background. 
     * Used on startup or when shifting into Mirror Mode.
     */
    async initAuthorizedSession() {
        if (this.follower_tokens.length === 0) return;
        
        console.log(`[Multi-Auth Network] 🔐 Syncing authorizations for ${this.follower_tokens.length} followers...`);
        const authPromises = this.follower_tokens.map(async (token) => {
            try {
                let api = this.follower_apis.get(token);
                if (!api || !api.send) {
                    api = generateDerivApiInstance() as any;
                    this.follower_apis.set(token, api);
                    
                    // PROACTIVE RE-AUTH ON OPEN
                    const socket = api.connection;
                    if (socket) {
                        socket.onopen = async () => {
                            console.log(`[NetworkSync] 🔄 Socket Reconnected for ...${token.slice(-4)}, Re-authorizing...`);
                            try {
                                const res = await api.authorize(token);
                                api.is_authorised = true;
                                api.account_info = res.authorize;
                                console.log(`[NetworkSync] ✅ Re-auth Success for ...${token.slice(-4)}`);
                            } catch (e) {
                                api.is_authorised = false;
                                console.error(`[NetworkSync] ❌ Re-auth Failed for ...${token.slice(-4)}`, e);
                            }
                        };
                    }
                }

                // Initial Auth
                const res = await api.authorize(token);
                api.is_authorised = true;
                api.account_info = res.authorize;
                
                // Fetch initial balance
                const balRes = await api.send({ balance: 1 });
                if (balRes.balance) {
                    this.follower_balances.set(token, {
                        balance: balRes.balance.balance,
                        currency: balRes.balance.currency,
                        loginid: res.authorize.loginid,
                        last_status: 'Ready',
                        last_sync: new Date().toLocaleTimeString()
                    });
                }
                
                this.subscribeToFollowerTrades(token, api);
                console.log(`[NetworkSync] ✅ Follower ...${token.slice(-4)} Ready: ${res.authorize.loginid}`);
            } catch (e) {
                console.error(`[NetworkSync] ❌ Follower ...${token.slice(-4)} Init Failed`, e);
                const existing = this.follower_balances.get(token);
                if (existing) this.follower_balances.set(token, { ...existing, last_status: 'Auth Failed' });
            }
        });
        
        await Promise.all(authPromises);
        
        if (this.is_sync_active && !this.balance_timer) {
            this.startBalanceLoop();
        }
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
            if (!this.is_sync_active || this.follower_tokens.length === 0) return;

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
            
            const balRes = await testApi.send({ balance: 1 });
            
            this.follower_tokens.push(t);
            this.follower_apis.set(t, testApi);
            if (balRes.balance) {
                this.follower_balances.set(t, {
                    balance: balRes.balance.balance,
                    currency: balRes.balance.currency,
                    loginid: res.authorize.loginid,
                    last_status: 'Connected',
                    last_sync: new Date().toLocaleTimeString()
                });
            }
            
            this.subscribeToFollowerTrades(t, testApi);
            this.saveToStorage();
            
            return { success: true };
        } catch (err: any) {
            return { error: err?.error?.message || 'Authorization failed' };
        }
    }

    removeFollower(token: string) {
        this.follower_tokens = this.follower_tokens.filter(t => t !== token);
        this.follower_balances.delete(token);
        this.follower_trades.delete(token);
        const sub = this.follower_subscriptions.get(token);
        if (sub) {
            sub.unsubscribe();
            this.follower_subscriptions.delete(token);
        }
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
        if (this.follower_tokens.length === 0) return { error: { message: 'No accounts authorized' } };
        
        try {
            this.is_sync_active = true;
            this.saveToStorage();

            // 1. Initialize Network APIs for all followers
            await this.initAuthorizedSession();

            // Note: We now use globalObserver hooks in the constructor for zero-latency parallel execution.
            // This captures 'buy' commands as they are sent from the UI/Bot.

            this.addTrace("Multi-Account Network Online");
            this.startBalanceLoop();
            return { success: true };
        } catch (err: any) {
            console.error('[NetworkSync] Activation failed:', err);
            this.is_sync_active = false;
            return { error: { message: err?.message || 'Sync activation failed' } };
        }
    }

    private startBalanceLoop() {
        if (this.balance_timer) clearInterval(this.balance_timer);
        this.balance_timer = setInterval(() => {
            if (this.is_sync_active && this.follower_apis.size > 0) {
                this.refreshBalances();
            }
        }, 10000); // 10 seconds
    }

    async refreshBalances() {
        this.follower_apis.forEach(async (api, token) => {
            try {
                if (!api || typeof api.send !== 'function') return;
                
                // Use executeWithReAuth for balances to trigger background re-auth if needed,
                // but for BALANCES we don't care about the 1-second delay.
                const res = await api.send({ balance: 1 });
                if (res.error?.code === 'AuthorizationRequired') {
                   console.warn(`[NetworkSync] Background auth lost for ...${token.slice(-4)}, triggering re-auth.`);
                   api.is_authorised = false;
                   api.authorize(token).then((r: any) => {
                       api.is_authorised = true;
                       api.account_info = r.authorize;
                   }).catch(() => { api.is_authorised = false; });
                }
            } catch (e) {}
        });
    }

    toggleTokenSync(token: string) {
        if (this.paused_tokens.has(token)) {
            this.paused_tokens.delete(token);
            this.addTrace(`Account Resumed: ...${token.slice(-4)}`);
        } else {
            this.paused_tokens.add(token);
            this.addTrace(`Account Paused: ...${token.slice(-4)}`);
        }
        this.saveToStorage();
    }

    stopMirroring() {
        this.is_sync_active = false;
        this.saveToStorage();
        if (this.unsubscribe_active) {
            this.unsubscribe_active.unsubscribe();
            this.unsubscribe_active = null;
        }
        if (this.balance_timer) {
            clearInterval(this.balance_timer);
            this.balance_timer = null;
        }
        this.follower_apis.forEach(api => api.disconnect());
        this.follower_apis.clear();
        this.follower_balances.clear();
        this.follower_trades.clear();
        this.follower_subscriptions.forEach(sub => sub.unsubscribe());
        this.follower_subscriptions.clear();
        this.addTrace("Network Sync Stopped");
    }

    private async executeWithReAuth(api: any, token: string, request: any) {
        const tokenSnippet = `...${token.slice(-4)}`;
        const reqType = Object.keys(request)[0];
        
        console.group(`[Multi-Auth Network] 📤 Request to ${tokenSnippet}: ${reqType}`);
        console.log('Payload:', JSON.stringify(request, null, 2));
        console.groupEnd();

        try {
            let res = await api.send(request);
            
            console.group(`[Multi-Auth Network] 📥 Response from ${tokenSnippet}: ${reqType}`);
            if (res.error) {
                console.error('Error:', res.error);
            } else {
                console.log('Success:', res[reqType] || res);
            }
            console.groupEnd();

            if (res.error?.code === 'AuthorizationRequired' || res.error?.code === 'InvalidToken') {
                console.warn(`[NetworkSync] 🔐 Token ${tokenSnippet} needs re-auth...`);
                const authRes = await api.authorize(token);
                api.account_info = authRes.authorize;
                
                console.log(`[NetworkSync] 🔄 Retrying ${reqType} for ${tokenSnippet}...`);
                res = await api.send(request);
                
                console.group(`[Multi-Auth Network] 📥 Retry Response from ${tokenSnippet}: ${reqType}`);
                console.log(res.error ? 'Retry Failed' : 'Retry Success', res);
                console.groupEnd();
            }
            return res;
        } catch (e) {
            console.error(`[Multi-Auth Network] 💥 Critical Failure for ${tokenSnippet}:`, e);
            return { error: { message: 'Network or internal error' } };
        }
    }

    private async executeTargetTrades(tradeData: TradeSignal) {
        console.log(`[Multi-Auth Network] ⚡ Processing Trade Signal:`, tradeData);
        
        if (!this.is_sync_active) {
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
        
        console.log(`[CopyTrading] ⚡ Executing mirror for ${this.follower_apis.size} followers...`);

        this.follower_apis.forEach(async (api, token) => {
            try {
                if (!api || typeof api.send !== 'function') return;
                
                // SKIP IF PAUSED
                if (this.paused_tokens.has(token)) {
                    console.log(`[NetworkSync] Skipping paused account: ...${token.slice(-4)}`);
                    return;
                }

                // SKIP IF SOURCE
                if (tradeData.master_account === api.account_info?.loginid) {
                    console.log(`[NetworkSync] Skipping source account: ${tradeData.master_account}`);
                    return;
                }
                // SKIP IF NOT AUTHORIZED (Prevent laggy/different outcomes)
                if (!api.is_authorised) {
                    console.error(`[Multi-Auth Network] ❌ Trade SKIPPED for ...${token.slice(-4)}: Session not ready.`);
                    this.addTrace(`Trade Skipped: ...${token.slice(-4)} (Auth Required)`);
                    return;
                }

                const traceMsg = `Mirroring ${contract_type} ${symbol} (${duration}${duration_unit}) to ...${token.slice(-4)}`;
                this.addTrace(traceMsg);
                
                const existing = this.follower_balances.get(token);
                if (existing) this.follower_balances.set(token, { ...existing, last_status: `Engine: ${contract_type}...` });

                const proposal_req: any = {
                    proposal: 1,
                    amount: adjusted_amount,
                    basis: basis || 'stake',
                    contract_type,
                    currency: api.account_info?.currency || 'USD',
                    duration: Math.max(1, Number(duration)),
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
                    const err_msg = proposal_res.error.message || 'Proposal failed';
                    console.error(`[CopyTrading] ❌ Proposal failed (${token.substring(0,4)}): ${err_msg}`);
                    this.addTrace(`Error (...${token.slice(-4)}): ${err_msg}`);
                    const activeBal = this.follower_balances.get(token);
                    if (activeBal) this.follower_balances.set(token, { ...activeBal, last_status: `Err: ${err_msg.substring(0, 15)}` });
                    return;
                }

                const proposal_id = proposal_res.proposal.id;
                const buy_res = await this.executeWithReAuth(api, token, { buy: proposal_id, price: adjusted_amount });
                
                if (buy_res.error) {
                    const err_msg = buy_res.error.message || 'Buy failed';
                    console.error(`[CopyTrading] ❌ Buy failed (${token.substring(0,4)}): ${err_msg}`);
                    this.addTrace(`Buy failed (...${token.slice(-4)})`);
                    const activeBal = this.follower_balances.get(token);
                    if (activeBal) this.follower_balances.set(token, { ...activeBal, last_status: `Err: ${err_msg.substring(0, 15)}` });
                } else {
                    const local_cid = buy_res.buy.contract_id;
                    this.mirrored_local_ids.add(local_cid);
                    this.last_trade_time = new Date().toLocaleTimeString();
                    this.addTrace(`Success 🏆 (...${token.slice(-4)})`);
                    
                    const activeBal = this.follower_balances.get(token);
                    if (activeBal) this.follower_balances.set(token, { ...activeBal, last_status: 'Trade Executed' });
                    
                    // Immediate balance update
                    setTimeout(() => {
                        api.send({ balance: 1 }).then((balRes: any) => {
                            if (balRes.balance) {
                                 this.follower_balances.set(token, {
                                    balance: balRes.balance.balance,
                                    currency: balRes.balance.currency,
                                    loginid: api.account_info?.loginid || '???',
                                    last_status: 'Balance Sync',
                                    last_sync: new Date().toLocaleTimeString()
                                 });
                            }
                        });
                    }, 3000);

                    // Clean up tracking set after a while
                    setTimeout(() => this.mirrored_local_ids.delete(local_cid), 60000);
                }
            } catch (e) {
                console.error(`[CopyTrading] 💥 Execution exception for ${token.substring(0,4)}:`, e);
            }
        });
    }

    private subscribeToFollowerTrades(token: string, api: any) {
        if (!api || typeof api.onMessage !== 'function') return;
        
        // Clean up existing
        if (this.follower_subscriptions.has(token)) {
            const sub = this.follower_subscriptions.get(token);
            if (sub && typeof sub.unsubscribe === 'function') sub.unsubscribe();
        }

        const sub = api.onMessage().subscribe((response: any) => {
            const msg = response?.data || response;
            if (msg.msg_type === 'proposal_open_contract') {
                const contract = msg.proposal_open_contract;
                if (contract) {
                    this.handleFollowerTradeUpdate(token, contract);
                }
            }
            if (msg.msg_type === 'balance') {
                const bal = msg.balance;
                if (bal) {
                    const existing = this.follower_balances.get(token);
                    this.follower_balances.set(token, {
                        balance: bal.balance,
                        currency: bal.currency,
                        loginid: api.account_info?.loginid || existing?.loginid || '???',
                        last_status: existing?.last_status || (this.is_sync_active ? 'Network Active' : 'Connected'),
                        last_sync: new Date().toLocaleTimeString()
                    });
                }
            }
        });

        this.follower_subscriptions.set(token, sub);
        api.send({ proposal_open_contract: 1, subscribe: 1 });
        api.send({ balance: 1, subscribe: 1 });
    }

    private handleFollowerTradeUpdate(token: string, data: any) {
        let trades = this.follower_trades.get(token) || [];
        
        // Check if this contract update already exists in our feed
        const existingIdx = trades.findIndex(t => t.contract_id === data.contract_id);
        
        const summary = {
            contract_id: data.contract_id,
            symbol: data.underlying || data.symbol,
            type: data.contract_type,
            status: data.status,
            profit: data.profit || 0,
            is_sold: !!data.is_sold,
            timestamp: new Date().toLocaleTimeString()
        };

        if (existingIdx > -1) {
            trades[existingIdx] = summary;
        } else {
            trades = [summary, ...trades.slice(0, 4)]; // Keep last 5
        }

        this.follower_trades.set(token, trades);
        
        // Update status to show latest activity
        const latest = this.follower_balances.get(token);
        if (latest) {
            let statusText = data.is_sold ? (data.profit > 0 ? 'Won' : 'Lost') : 'Active Trade';
            this.follower_balances.set(token, { ...latest, last_status: statusText });
        }
    }

    async broadcastTrade(tradeData: TradeSignal) {
        if (!this.is_sync_active) return;

        // PREVENTION: Don't broadcast if this contract was created by the engine (mirror)
        if (this.mirrored_local_ids.has(tradeData.contract_id)) {
            return;
        }
        
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
            console.error('[NetworkSync] Broadcast error:', e);
        }
    }

    private addTrace(msg: string) {
        const time = new Date().toLocaleTimeString();
        this.engine_trace = [`[${time}] ${msg}`, ...this.engine_trace.slice(0, 4)];
    }

    getStatus() {
        return {
            is_mirroring: this.is_sync_active,
            followers_count: this.follower_tokens.length,
            active_followers: this.follower_apis.size,
            tokens: this.follower_tokens,
            paused_tokens: [...this.paused_tokens],
            balances: Object.fromEntries(this.follower_balances),
            trades: Object.fromEntries(this.follower_trades),
            max_stake: this.max_stake,
            min_stake: this.min_stake,
            last_trade_time: this.last_trade_time,
            trace: this.engine_trace
        };
    }
}

export const copy_trading_logic = new CopyTradingLogic();
