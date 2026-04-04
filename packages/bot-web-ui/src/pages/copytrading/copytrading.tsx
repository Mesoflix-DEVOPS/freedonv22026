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
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
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

    const handleToggleMirroring = async () => {
        if (status.followers_count === 0) {
            setToast({ type: 'err', text: 'Auth at least one token first' });
            return;
        }

        setIsProcessing(true);
        if (status.is_mirroring) {
            copy_trading_logic.stopMirroring();
            setToast({ type: 'ok', text: 'Multi-Trading System Stopped' });
        } else {
            copy_trading_logic.setRiskSettings(maxStake, minStake);
            const res = await copy_trading_logic.startMirroring(api_base.api);
            if (res.error) {
                setToast({ type: 'err', text: `System Error: ${res.error.message || 'Check Connection'}` });
            } else {
                setToast({ type: 'ok', text: 'Engine Online: All tokens ready!' });
            }
        }
        setIsProcessing(false);
    };

    const masterDisplay = status.master_balance || {
        loginid: client.loginid || 'Offline',
        balance: client.loginid ? 'Current Session' : 'Ready',
        currency: '',
        last_sync: 'Static'
    };

    return (
        <div className="engine-container">
            {/* Header Area */}
            <div style={{ textAlign: 'center', marginBottom: isMobile ? '20px' : '40px' }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? '26px' : '42px', fontWeight: 900, color: '#0f172a' }}>
                    Multi-Auth <span style={{ color: '#2563eb' }}>Engine</span>
                </h1>
                <p style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: isMobile ? '13px' : '16px', fontWeight: 500 }}>
                    Broadcast active trading commands to all authorized accounts.
                </p>
            </div>

            <div className="mirror-card">
                {/* Main Auth Profile */}
                <div className="master-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ 
                            width: isMobile ? '40px' : '55px', height: isMobile ? '40px' : '55px', 
                            borderRadius: '14px', background: 'rgba(255,255,255,0.1)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '18px' : '22px'
                        }}>
                             ⚙️
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', fontWeight: 800, opacity: 0.6, letterSpacing: '1px' }}>CONTROL SESSION</div>
                            <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 900 }}>{masterDisplay.loginid}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                        <div style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 900 }}>
                            {typeof masterDisplay.balance === 'number' ? masterDisplay.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : masterDisplay.balance}
                            <span style={{ fontSize: '14px', marginLeft: '5px', opacity: 0.6 }}>{masterDisplay.currency}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'flex-start' : 'flex-end', gap: '5px' }}>
                            <span className="status-dot" style={{ background: '#22c55e' }}></span>
                            <span style={{ fontSize: '10px', fontWeight: 800, opacity: 0.7 }}>CONTROL ACTIVE</span>
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

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Broadcast Network</h2>
                            <div className="activity-badge" style={{
                                background: status.is_mirroring ? '#dcfce7' : '#fee2e2',
                                color: status.is_mirroring ? '#166534' : '#991b1b',
                                border: `1px solid ${status.is_mirroring ? '#bbf7d0' : '#fecaca'}`
                            }}>
                                {status.is_mirroring ? 'ENGINE LIVE' : 'ENGINE STANDBY'}
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
                                status.tokens.map((token, idx) => {
                                    const accountInfo = status.balances?.[token];
                                    return (
                                        <div key={token} className="follower-item">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <div style={{ 
                                                        width: '36px', height: '36px', borderRadius: '10px', background: '#f1f5f9',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#475569', fontSize: '13px'
                                                    }}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: 800 }}>{accountInfo?.loginid || `Token: ...${token.slice(-4)}`}</div>
                                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, marginTop: '2px' }}>
                                                            <span className="status-dot" style={{ background: status.is_mirroring ? '#22c55e' : '#94a3b8' }}></span>
                                                            {accountInfo?.last_status || 'Session Standby'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                                                        {accountInfo?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: '10px' }}>{accountInfo?.currency}</span>
                                                    </div>
                                                    <button className="btn-danger" style={{ marginTop: '5px' }} onClick={() => copy_trading_logic.removeFollower(token)}>Clear Auth</button>
                                                </div>
                                            </div>

                                            {/* Activity Feed Snippet */}
                                            {status.trades?.[token] && status.trades[token].length > 0 && (
                                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                        {status.trades[token].map((trade: any) => (
                                                            <div key={trade.contract_id} style={{
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
                            onClick={handleToggleMirroring}
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

            {/* Toast System */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '30px', left: isMobile ? '10px' : '50%', right: isMobile ? '10px' : 'auto',
                    transform: isMobile ? 'none' : 'translateX(-50%)',
                    background: toast.type === 'ok' ? '#0f172a' : '#ef4444', color: '#fff',
                    padding: '16px 28px', borderRadius: '14px', fontWeight: 800, 
                    boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10000,
                    animation: 'fadeInUp 0.3s ease',
                    fontSize: '14px'
                }}>
                    <span>{toast.type === 'ok' ? '✅' : '❌'}</span>
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
