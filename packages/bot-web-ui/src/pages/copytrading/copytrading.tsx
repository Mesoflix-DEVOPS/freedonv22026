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
        const styleId = 'copytrading-v4-styles';
        if (!document.getElementById(styleId)) {
            const styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.textContent = `
                @keyframes fadeInUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                .mirror-card {
                    background: #fff;
                    border-radius: 32px;
                    padding: ${isMobile ? '20px' : '35px'};
                    box-shadow: 0 25px 50px rgba(0,0,0,0.06);
                    animation: fadeInUp 0.5s ease-out;
                    max-width: 1000px;
                    margin: 0 auto;
                    overflow: visible;
                }
                .master-card {
                    background: linear-gradient(135deg, #1a237e 0%, #0d124d 100%);
                    border-radius: 24px;
                    padding: 25px;
                    color: #fff;
                    margin-bottom: 30px;
                    box-shadow: 0 15px 35px rgba(26,35,126,0.2);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .follower-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 18px 24px;
                    background: #f8fafc;
                    border: 1px solid #f1f5f9;
                    border-radius: 16px;
                    transition: all 0.2s;
                    margin-bottom: 12px;
                }
                .follower-item:hover {
                    border-color: #cbd5e1;
                    transform: translateX(4px);
                }
                .qs-input {
                    padding: 14px 18px;
                    border: 2px solid #eef0f2;
                    border-radius: 12px;
                    font-size: 15px;
                    outline: none;
                    width: 100%;
                    box-sizing: border-box;
                    background-color: #f8f9fa;
                    transition: all 0.3s;
                }
                .qs-input:focus {
                    border-color: #1a237e;
                    background-color: #fff;
                    box-shadow: 0 0 0 4px rgba(26,35,126,0.05);
                }
                .btn-primary {
                    background: #1a237e;
                    color: #fff;
                    border: none;
                    padding: 14px 28px;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    background: #0d124d;
                    box-shadow: 0 8px 15px rgba(26,35,126,0.2);
                }
                .btn-outline {
                    background: transparent;
                    color: #1a237e;
                    border: 2px solid #1a237e;
                    padding: 10px 20px;
                    border-radius: 10px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-outline:hover {
                    background: #f0f2ff;
                }
                .btn-danger {
                    background: #fff1f2;
                    color: #e11d48;
                    border: 1px solid #ffe4e6;
                    padding: 8px 16px;
                    border-radius: 10px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-danger:hover {
                    background: #ffe4e6;
                }
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                    margin-right: 8px;
                }
            `;
            document.head.appendChild(styleEl);
        }
    }, [isMobile]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleAddFollower = async () => {
        if (!newToken) return;
        setIsProcessing(true);
        const res = await copy_trading_logic.addFollower(newToken);
        if (res.success) {
            setNewToken('');
            setToast({ type: 'ok', text: 'Follower Account Added' });
        } else {
            setToast({ type: 'err', text: res.error || 'Failed to link' });
        }
        setIsProcessing(false);
    };

    const handleUpdateMaster = async () => {
        setIsUpdatingMaster(true);
        const res = await copy_trading_logic.setMasterToken(masterTokenInput || null);
        if (res.success) {
            setToast({ type: 'ok', text: masterTokenInput ? `Connected to Master: ${res.loginid}` : 'Using session as Master' });
        } else {
            setToast({ type: 'err', text: res.error || 'Failed to set Master' });
        }
        setIsUpdatingMaster(false);
    };

    const handleRemoveFollower = (token: string) => {
        copy_trading_logic.removeFollower(token);
        setToast({ type: 'ok', text: 'Follower Removed' });
    };

    const handleToggleMirroring = async () => {
        if (status.followers_count === 0) {
            setToast({ type: 'err', text: 'Add at least one follower first' });
            return;
        }

        setIsProcessing(true);
        if (status.is_mirroring) {
            copy_trading_logic.stopMirroring();
            setToast({ type: 'ok', text: 'Mirroring System Offline' });
        } else {
            copy_trading_logic.setRiskSettings(maxStake, minStake);
            const res = await copy_trading_logic.startMirroring(api_base.api);
            if (res.error) {
                setToast({ type: 'err', text: `System Error: ${res.error.message || 'Check Connection'}` });
            } else {
                setToast({ type: 'ok', text: 'Universal Mirroring Active!' });
            }
        }
        setIsProcessing(false);
    };

    const masterDisplay = status.master_balance || {
        loginid: client.loginid || 'Offline',
        balance: client.loginid ? 'Current Session' : 'No Account',
        currency: '',
        last_sync: 'Ready'
    };

    return (
        <div style={{
            minHeight: '100vh',
            padding: isMobile ? '20px 15px' : '60px 40px',
            backgroundColor: '#f8fafc',
            fontFamily: "'Outfit', sans-serif",
            boxSizing: 'border-box'
        }}>
            {/* Header Area */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? '32px' : '44px', color: '#0f172a', fontWeight: 900, letterSpacing: '-0.025em' }}>
                    Mirror Hub <span style={{ color: '#1a237e' }}>PRO</span>
                </h1>
                <p style={{ margin: '12px 0 0 0', color: '#64748b', fontSize: '18px', fontWeight: 500 }}>
                    Enterprise multi-account trading control center.
                </p>
            </div>

            <div className="mirror-card">
                {/* Master Account Profile */}
                <div className="master-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ 
                            width: '60px', height: '60px', borderRadius: '18px', background: 'rgba(255,255,255,0.1)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px'
                        }}>
                             👑
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, opacity: 0.7, textTransform: 'uppercase', marginBottom: '4px' }}>TRADER PROFILE</div>
                            <div style={{ fontSize: '20px', fontWeight: 900 }}>{masterDisplay.loginid}</div>
                            <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.6 }}>Last Sync: {masterDisplay.last_sync}</div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '32px', fontWeight: 900 }}>
                            {typeof masterDisplay.balance === 'number' ? masterDisplay.balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : masterDisplay.balance}
                            <span style={{ fontSize: '14px', marginLeft: '5px', opacity: 0.8 }}>{masterDisplay.currency}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px', marginTop: '5px' }}>
                            <span className="status-dot" style={{ background: '#10b981' }}></span>
                            <span style={{ fontSize: '11px', fontWeight: 800, opacity: 0.8 }}>TRADER ONLINE</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '30px' : '50px' }}>
                    
                    {/* Left side: Follower List & Controls */}
                    <div style={{ flex: isMobile ? 'none' : '1.2' }}>
                        
                        <div style={{ marginBottom: '35px', padding: '25px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: 800 }}>Master Account Broadcast</h3>
                            <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#64748b' }}>
                                Leave empty to use your current session. Enter a token to mirror from an external account.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input 
                                    type="password" 
                                    className="qs-input" 
                                    placeholder="External Master Token (Optional)"
                                    value={masterTokenInput}
                                    onChange={(e) => setMasterTokenInput(e.target.value)}
                                />
                                <button className="btn-outline" onClick={handleUpdateMaster} disabled={isUpdatingMaster}>
                                    {isUpdatingMaster ? '...' : (masterTokenInput ? 'SET' : 'USE SESSION')}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Follower Network</h2>
                            <div style={{ 
                                padding: '6px 14px', borderRadius: '30px', fontSize: '11px', fontWeight: 800,
                                background: status.is_mirroring ? '#ecfdf5' : '#fef2f2',
                                color: status.is_mirroring ? '#059669' : '#dc2626',
                                border: `1px solid ${status.is_mirroring ? '#10b981' : '#ef4444'}`
                            }}>
                                {status.is_mirroring ? '● SYSTEM RUNNING' : '○ SYSTEM STANDBY'}
                            </div>
                        </div>

                        {/* Add New Follower */}
                        <div style={{ marginBottom: '30px', display: 'flex', gap: '12px' }}>
                            <input 
                                type="password" 
                                className="qs-input" 
                                placeholder="Follower API Token"
                                value={newToken}
                                onChange={(e) => setNewToken(e.target.value)}
                            />
                            <button className="btn-primary" onClick={handleAddFollower} disabled={isProcessing}>
                                {isProcessing ? '...' : 'ADD'}
                            </button>
                        </div>

                        {/* Follower List */}
                        <div style={{ minHeight: '200px' }}>
                            {status.tokens.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>No follow accounts linked.</p>
                                    <p style={{ margin: '5px 0 0 0', color: '#cbd5e1', fontSize: '12px' }}>Enter an API token above to start building your network.</p>
                                </div>
                            ) : (
                                status.tokens.map((token, idx) => {
                                    const accountInfo = status.balances?.[token];
                                    return (
                                        <div key={token} className="follower-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                                    <div style={{ 
                                                        width: '40px', height: '40px', borderRadius: '12px', background: '#e0e7ff', color: '#1a237e',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px'
                                                    }}>
                                                        {idx + 1}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                                                                {accountInfo?.loginid || `Token: ${token.substring(0, 5)}...`}
                                                            </div>
                                                            {accountInfo && (
                                                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#1a237e' }}>
                                                                    {accountInfo.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style={{ fontSize: '10px' }}>{accountInfo.currency}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px', gap: '10px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                <span className="status-dot" style={{ background: status.is_mirroring ? '#10b981' : '#94a3b8' }}></span>
                                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                                                    {accountInfo?.last_status || (status.is_mirroring ? 'Mirroring Active' : 'Linked')}
                                                                </span>
                                                            </div>
                                                            {accountInfo?.last_sync && (
                                                                <span style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: 600 }}>
                                                                    Sync: {accountInfo.last_sync}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button className="btn-danger" style={{ marginLeft: '20px' }} onClick={() => handleRemoveFollower(token)}>Remove</button>
                                            </div>

                                            {/* Live Activity Feed */}
                                            {status.trades?.[token] && status.trades[token].length > 0 && (
                                                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
                                                        {status.trades[token].map((trade: any) => (
                                                            <div key={trade.contract_id} style={{
                                                                padding: '8px 12px', borderRadius: '10px', background: trade.is_sold ? (trade.profit > 0 ? '#ecfdf5' : '#fef2f2') : '#eff6ff',
                                                                border: `1px solid ${trade.is_sold ? (trade.profit > 0 ? '#10b981' : '#ef4444') : '#3b82f6'}`,
                                                                minWidth: '100px', flexShrink: 0
                                                            }}>
                                                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', marginBottom: '2px' }}>{trade.symbol}</div>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a' }}>{trade.type}</span>
                                                                    <span style={{ 
                                                                        fontSize: '11px', fontWeight: 900, 
                                                                        color: trade.is_sold ? (trade.profit > 0 ? '#059669' : '#dc2626') : '#2563eb'
                                                                    }}>
                                                                        {trade.is_sold ? (trade.profit > 0 ? `+$${trade.profit}` : `$${trade.profit}`) : 'OPEN'}
                                                                    </span>
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

                    {/* Right side: Global Settings & Activation */}
                    <div style={{ 
                        flex: isMobile ? 'none' : '0.8',
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '30px',
                        order: isMobile ? -1 : 0 // Show settings/activation first on mobile
                    }}>
                        
                        <div style={{ padding: '30px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FaShieldAlt color="#1a237e" /> Global Risk
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Max Stake Limit ($)</label>
                                    <input type="number" className="qs-input" value={maxStake} onChange={(e) => setMaxStake(Number(e.target.value))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Min Stake Floor ($)</label>
                                    <input type="number" className="qs-input" value={minStake} onChange={(e) => setMinStake(Number(e.target.value))} />
                                </div>
                            </div>
                        </div>

                        <button 
                            className="btn-primary" 
                            onClick={handleToggleMirroring}
                            disabled={isProcessing}
                            style={{ 
                                height: '80px', fontSize: '20px', borderRadius: '20px',
                                background: status.is_mirroring ? '#ef4444' : '#1a237e',
                                boxShadow: status.is_mirroring ? '0 10px 30px rgba(239, 68, 68, 0.25)' : '0 10px 30px rgba(26, 35, 126, 0.25)',
                                opacity: isProcessing ? 0.7 : 1
                            }}
                        >
                            {isProcessing ? 'SYNCING...' : (status.is_mirroring ? 'STOP NETWORK' : 'ACTIVATE NETWORK')}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                                <FaCog style={{ verticalAlign: 'middle' }} /> MIRROR PERSISTENCE: <span style={{ color: '#059669' }}>ENABLED</span>
                            </p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '11px', color: '#cbd5e1' }}>
                                Trades will mirror in background while you select bots or browse.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                    background: toast.type === 'ok' ? '#0f172a' : '#e11d48', color: '#fff',
                    padding: '18px 36px', borderRadius: '100px', fontWeight: 700, boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10000,
                    animation: 'fadeInUp 0.3s ease'
                }}>
                    <span style={{ 
                        width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px'
                    }}>
                        {toast.type === 'ok' ? '✓' : '✕'}
                    </span>
                    {toast.text}
                </div>
            )}
            
            <div style={{ marginTop: '60px', opacity: 0.3, fontSize: '11px', textAlign: 'center', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Mirror Hub v4.0 • Enterprise Cloud Sync • Multi-Follower Engine
            </div>
        </div>
    );
});

export default MirrorHub;
