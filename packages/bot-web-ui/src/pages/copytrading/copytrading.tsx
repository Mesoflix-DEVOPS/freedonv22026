import React, { useState, useEffect } from 'react';
import { FaCog, FaChartLine, FaShieldAlt } from 'react-icons/fa';
import { useStore } from '@deriv/stores';
import { copy_trading_logic } from './CopyTradingLogic';
import { observer } from 'mobx-react-lite';
import { api_base } from '@deriv/bot-skeleton/src/services/api/api-base';

interface ClientStore {
    api: any;
    loginid?: string;
}

const MirrorHub: React.FC = observer(() => {
    const { client } = useStore() as { client: ClientStore };
    
    // UI State
    const [newToken, setNewToken] = useState<string>('');
    const [status, setStatus] = useState(copy_trading_logic.getStatus());
    const [masterTokenInput, setMasterTokenInput] = useState(status.master_token || '');
    const [isUpdatingMaster, setIsUpdatingMaster] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Risk Settings
    const [maxStake, setMaxStake] = useState(status.max_stake);
    const [minStake, setMinStake] = useState(status.min_stake);

    // Sync status every 2 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            const currentStatus = copy_trading_logic.getStatus();
            setStatus(currentStatus);
            if (currentStatus.master_token && !masterTokenInput) {
                setMasterTokenInput(currentStatus.master_token);
            }
        }, 2000);
        return () => clearInterval(timer);
    }, [masterTokenInput]);

    // Ensure session is initialized if mirroring is active
    useEffect(() => {
        if (status.is_mirroring && status.active_followers === 0 && status.followers_count > 0) {
            console.log('[MirrorHub] 🔄 Re-authorizing session on mount...');
            copy_trading_logic.initAuthorizedSession();
        }
    }, [status.is_mirroring, status.active_followers, status.followers_count]);

    // Inject styles
    useEffect(() => {
        const styleId = 'copytrading-v5-styles';
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) existingStyle.remove();

        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
            @keyframes fadeInUp {
                from { transform: translateY(15px); opacity: 0; }
                to   { transform: translateY(0);    opacity: 1; }
            }
            .engine-container {
                min-height: 100vh;
                background-color: #f8fafc;
                font-family: 'Outfit', sans-serif;
                padding: ${isMobile ? '20px 10px' : '40px 20px'};
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                color: #0f172a;
            }
            .mirror-card {
                background: #fff;
                border-radius: ${isMobile ? '20px' : '32px'};
                padding: ${isMobile ? '15px' : '30px'};
                box-shadow: 0 10px 40px rgba(0,0,0,0.05);
                animation: fadeInUp 0.4s ease-out;
                max-width: 1100px;
                margin: 0 auto;
                width: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
            }
            .master-card {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border-radius: ${isMobile ? '16px' : '20px'};
                padding: ${isMobile ? '15px' : '25px'};
                color: #fff;
                margin-bottom: 25px;
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 12px 30px rgba(15,23,42,0.15);
            }
            .follower-item {
                background: #fdfdfd;
                border: 1px solid #f1f5f9;
                border-radius: 16px;
                padding: 15px;
                margin-bottom: 12px;
                transition: transform 0.2s, border-color 0.2s;
                display: flex;
                flex-direction: column;
            }
            .follower-item:hover {
                border-color: #cbd5e1;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.02);
            }
            .qs-input {
                padding: ${isMobile ? '12px 14px' : '14px 18px'};
                border: 2px solid #eef0f2;
                border-radius: 12px;
                font-size: ${isMobile ? '14px' : '15px'};
                outline: none;
                width: 100%;
                box-sizing: border-box;
                background-color: #f9fafb;
                transition: all 0.2s;
            }
            .qs-input:focus {
                border-color: #3b82f6;
                background-color: #fff;
            }
            .btn-primary {
                background: #0f172a;
                color: #fff;
                border: none;
                padding: ${isMobile ? '12px 20px' : '15px 30px'};
                border-radius: 12px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s;
            }
            .btn-primary:active { transform: scale(0.98); }
            .btn-outline {
                background: transparent;
                color: #0f172a;
                border: 2px solid #0f172a;
                padding: 10px 20px;
                border-radius: 10px;
                font-weight: 700;
                cursor: pointer;
            }
            .btn-danger {
                background: #fff;
                color: #ef4444;
                border: 1px solid #fee2e2;
                padding: 6px 12px;
                border-radius: 8px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
            }
            .status-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                display: inline-block;
                margin-right: 6px;
            }
            .activity-badge {
                padding: 6px 10px;
                border-radius: 8px;
                font-size: 10px;
                font-weight: 800;
                min-width: 80px;
                text-align: center;
            }
        `;
        document.head.appendChild(styleEl);
    }, [isMobile]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleAddFollower = async () => {
        if (!newToken) return;
        setIsProcessing(true);
        const res = await copy_trading_logic.addFollower(newToken);
        if (res.success) {
            setNewToken('');
            setToast({ type: 'ok', text: 'Auth Token Added' });
        } else {
            setToast({ type: 'err', text: res.error || 'Failed to authenticate' });
        }
        setIsProcessing(false);
    };

    const handleUpdateMaster = async () => {
        setIsUpdatingMaster(true);
        const res = await copy_trading_logic.setMasterToken(masterTokenInput || null);
        if (res.success) {
            setToast({ type: 'ok', text: masterTokenInput ? `Master Authenticated: ${res.loginid}` : 'Using Current Session' });
        } else {
            setToast({ type: 'err', text: res.error || 'Master Auth Failed' });
        }
        setIsUpdatingMaster(false);
    };

    const toggleNetwork = async () => {
        if (status.followers_count === 0) {
            setToast({ type: 'error', text: 'Auth at least one token first' });
            return;
        }

        if (status.is_mirroring) {
            copy_trading_logic.stopMirroring();
            setToast({ text: 'Network Sync Offline', type: 'info' });
        } else {
            setIsProcessing(true);
            copy_trading_logic.setRiskSettings(maxStake, minStake);
            const res = await copy_trading_logic.startMirroring(api_base.api);
            if (res.success) {
                setToast({ text: 'Multi-Auth Network Online', type: 'success' });
            } else {
                setToast({ text: res.error.message || 'System Error', type: 'error' });
            }
            setIsProcessing(false);
        }
    };

    const togglePause = (token: string) => {
        copy_trading_logic.toggleTokenSync(token);
        setToast({ text: 'Account status updated', type: 'info' });
    };

    const removeAccount = (token: string) => {
        if (window.confirm('Remove this account from the network?')) {
            copy_trading_logic.removeFollower(token);
            setToast({ text: 'Account removed', type: 'info' });
        }
    };

    const masterDisplay = status.master_balance || {
        loginid: client.loginid || 'Offline',
        balance: client.loginid ? 'Current Session' : 'Ready',
        currency: '',
        last_sync: 'Static'
    };

    return (
        <div className="engine-container">
            <div className="mirror-card">
                {/* Unified Sync Header */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
                    borderRadius: '24px', padding: '40px', color: '#fff', marginBottom: '30px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                            <div style={{ 
                                background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '15px',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <FaShieldAlt size={24} color="#38bdf8" />
                            </div>
                            <h1 style={{ fontSize: '32px', margin: 0, fontWeight: 800, letterSpacing: '-0.5px' }}>
                                Multi-Auth <span style={{ color: '#38bdf8' }}>Network</span>
                            </h1>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '500px', margin: '0 0 25px 0' }}>
                            Management console for synchronized multi-account trading sessions.
                        </p>
                        
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <button 
                                onClick={toggleNetwork}
                                style={{
                                    background: status.is_mirroring ? '#ef4444' : '#38bdf8',
                                    color: '#fff', border: 'none', padding: '12px 30px', 
                                    borderRadius: '12px', fontWeight: 800, cursor: 'pointer',
                                    transition: 'all 0.3s ease', boxShadow: '0 10px 20px rgba(56, 189, 248, 0.2)'
                                }}
                            >
                                {status.is_mirroring ? 'DEACTIVATE NETWORK' : 'INITIALIZE SYNC ENGINE'}
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '8px 16px', borderRadius: '10px' }}>
                                <div style={{ 
                                    width: '8px', height: '8px', borderRadius: '50%', 
                                    background: status.is_mirroring ? '#22c55e' : '#64748b',
                                    boxShadow: status.is_mirroring ? '0 0 10px #22c55e' : 'none'
                                }} />
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                                    {status.is_mirroring ? 'NETWORK LIVE' : 'OFFLINE'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '20px' : '40px' }}>
                    
                    {/* Left side: Auth tokens & List */}
                    <div style={{ flex: '1.3' }}>
                        
                        <div style={{ marginBottom: '30px', padding: '20px', background: '#f9fafb', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800 }}>Master Session Auth</h3>
                            <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: '#64748b' }}>
                                Use active session or override with a specific master token.
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input 
                                    type="password" 
                                    className="qs-input" 
                                    placeholder="Master API Token (Optional)"
                                    value={masterTokenInput}
                                    onChange={(e) => setMasterTokenInput(e.target.value)}
                                />
                                <button className="btn-outline" style={{ fontSize: '12px', padding: '10px 15px' }} onClick={handleUpdateMaster} disabled={isUpdatingMaster}>
                                    {isUpdatingMaster ? '...' : (masterTokenInput ? 'AUTH' : 'SESS')}
                                </button>
                            </div>
                        </div>

                        {/* Add New Tokens */}
                        <div style={{ marginBottom: '25px', display: 'flex', gap: '10px' }}>
                            <input 
                                type="password" 
                                className="qs-input" 
                                placeholder="Authorization Token"
                                value={newToken}
                                onChange={(e) => setNewToken(e.target.value)}
                            />
                            <button className="btn-primary" style={{ padding: '0 25px' }} onClick={handleAddFollower} disabled={isProcessing}>
                                {isProcessing ? '...' : 'LINK'}
                            </button>
                        </div>

                        {/* Token Connection List */}
                        <div style={{ maxHeight: isMobile ? '400px' : 'auto', overflowY: isMobile ? 'auto' : 'visible' }}>
                            {status.tokens.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px', background: '#f9fafb', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>No accounts authorized yet.</p>
                                </div>
                            ) : (
                                status.tokens.map((token) => {
                                    const bal = status.balances[token];
                                    const isPaused = status.paused_tokens?.includes(token);
                                    return (
                                        <div key={token} style={{ 
                                            background: '#fff', borderRadius: '20px', padding: '20px',
                                            border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                            transition: 'transform 0.2s ease', position: 'relative', marginBottom: '15px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                                <div>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '2px' }}>Account Network ID</div>
                                                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {bal?.loginid || `...${token.slice(-4)}`}
                                                        {isPaused && (
                                                            <span style={{ fontSize: '9px', background: '#fef2f2', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>PAUSED</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => togglePause(token)}
                                                        title={isPaused ? "Resume syncing" : "Pause syncing"}
                                                        style={{ 
                                                            border: 'none', background: isPaused ? '#f0fdf4' : '#f8fafc', 
                                                            color: isPaused ? '#22c55e' : '#64748b',
                                                            width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        {isPaused ? '▶️' : '⏸️'}
                                                    </button>
                                                    <button 
                                                        onClick={() => removeAccount(token)}
                                                        title="Remove account"
                                                        style={{ 
                                                            border: 'none', background: '#fff5f5', color: '#ff4d4f',
                                                            width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                                                <div style={{ flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                                                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Balance</div>
                                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                                                        {bal?.balance !== undefined && bal?.balance !== null ? 
                                                            `${Number(bal.balance).toLocaleString()} ${bal.currency || ''}` : 
                                                            '---'}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div style={{ 
                                                display: 'flex', alignItems: 'center', gap: '8px', 
                                                fontSize: '11px', fontWeight: 700, color: bal?.last_status?.includes('Err') ? '#ef4444' : '#22c55e' 
                                            }}>
                                                <div style={{ 
                                                    width: '6px', height: '6px', borderRadius: '50%', 
                                                    background: isPaused ? '#64748b' : (bal?.last_status?.includes('Err') ? '#ef4444' : '#22c55e') 
                                                }} />
                                                {isPaused ? 'SYNC PAUSED' : (bal?.last_status || 'READY')}
                                            </div>

                                            {/* Activity Feed Snippet */}
                                            {status.trades?.[token] && status.trades[token].length > 0 && (
                                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', opacity: isPaused ? 0.5 : 1 }}>
                                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                        {status.trades[token].map((trade: any, tIdx: number) => (
                                                            <div key={`${token}-${trade.contract_id}-${tIdx}`} style={{
                                                                padding: '6px 10px', borderRadius: '8px', 
                                                                background: trade.is_sold ? (trade.profit > 0 ? '#f0fdf4' : '#fef2f2') : '#f8fafc',
                                                                border: `1px solid ${trade.is_sold ? (trade.profit > 0 ? '#dcfce7' : '#fee2e2') : '#e2e8f0'}`,
                                                                minWidth: '85px', flexShrink: 0
                                                            }}>
                                                                <div style={{ fontSize: '9px', fontWeight: 900, color: '#94a3b8' }}>{trade.symbol}</div>
                                                                <div style={{ fontSize: '11px', fontWeight: 900, color: trade.is_sold ? (trade.profit > 0 ? '#15803d' : '#b91c1c') : '#475569' }}>
                                                                    {trade.is_sold ? (trade.profit > 0 ? `+$${trade.profit}` : `$${trade.profit}`) : 'EXEC'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right side: Global Logic & Activation */}
                    <div style={{ 
                        flex: '0.9',
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '20px',
                        order: isMobile ? -1 : 0
                    }}>
                        <div style={{ padding: '25px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FaShieldAlt color="#334155" /> Execution Logic
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Max Ticket Limit ($)</label>
                                    <input type="number" className="qs-input" value={maxStake} onChange={(e) => setMaxStake(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Min Ticket Floor ($)</label>
                                    <input type="number" className="qs-input" value={minStake} onChange={(e) => setMinStake(Number(e.target.value))} />
                                </div>
                            </div>
                        </div>

                        <button 
                            className="btn-primary" 
                            onClick={toggleNetwork}
                            disabled={isProcessing}
                            style={{ 
                                height: isMobile ? '70px' : '100px', fontSize: isMobile ? '18px' : '22px', borderRadius: '20px',
                                background: status.is_mirroring ? '#ef4444' : '#0f172a',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                opacity: isProcessing ? 0.7 : 1
                            }}
                        >
                            {isProcessing ? 'BOOTING...' : (status.is_mirroring ? 'SHUTDOWN ENGINE' : 'START MULTI-AUTH ENGINE')}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>
                                <FaCog style={{ verticalAlign: 'middle' }} /> MULTI-ACCOUNT SYNC: <span style={{ color: '#22c55e' }}>ONLINE</span>
                            </p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '10px', color: '#cbd5e1' }}>
                                All authorized accounts will mirror trading commands instantly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Engine Trace Console */}
            <div style={{ 
                maxWidth: '1100px', margin: '20px auto 0 auto', width: '100%',
                background: '#0f172a', borderRadius: '16px', padding: '15px', color: '#94a3b8',
                fontFamily: 'monospace', fontSize: '11px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
            }}>
                <div style={{ color: '#fff', fontWeight: 800, marginBottom: '10px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    📡 Engine Heartbeat
                </div>
                {!status.is_mirroring ? (
                    <div style={{ fontStyle: 'italic', color: '#475569' }}>Engine Offline</div>
                ) : status.trace && status.trace.length > 0 ? (
                    status.trace.map((t: string, i: number) => (
                        <div key={`trace-${i}`} style={{ marginBottom: '4px', opacity: 1 - (i * 0.15) }}>{t}</div>
                    ))
                ) : (
                    <div style={{ fontStyle: 'italic' }}>Waiting for signals...</div>
                )}
            </div>

            {/* Toast System */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '30px', left: isMobile ? '10px' : '50%', right: isMobile ? '10px' : 'auto',
                    transform: isMobile ? 'none' : 'translateX(-50%)',
                    background: (toast.type === 'success' || toast.type === 'info') ? '#0f172a' : '#ef4444', color: '#fff',
                    padding: '16px 28px', borderRadius: '14px', fontWeight: 800, 
                    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10000,
                    animation: 'fadeInUp 0.3s ease',
                    fontSize: '14px'
                }}>
                    <span>{(toast.type === 'success' || toast.type === 'info') ? '✅' : '❌'}</span>
                    {toast.text}
                </div>
            )}
            
            <div style={{ marginTop: 'auto', paddingTop: '40px', opacity: 0.2, fontSize: '9px', textAlign: 'center', fontWeight: 800, letterSpacing: '2px' }}>
                POWERED BY MULTI-AUTH ENGINE v5.0 • REAL-TIME MIRROR PROTOCOL
            </div>
        </div>
    );
});

export default MirrorHub;
