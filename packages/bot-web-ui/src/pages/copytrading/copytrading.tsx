import React, { useState, useEffect } from 'react';
import { FaYoutube, FaCog, FaChartLine, FaShieldAlt } from 'react-icons/fa';
import { useStore } from '@deriv/stores';
import { copy_trading_logic } from './CopyTradingLogic';
import { observer } from 'mobx-react-lite';
import { botNotification } from 'Components/bot-notification/bot-notification';

const TokenManager: React.FC = observer(() => {
    const { client } = useStore();
    const [token, setToken] = useState('');
    const [savedToken, setSavedToken] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isCopyTrading, setIsCopyTrading] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Advanced features
    const [maxStake, setMaxStake] = useState(100);
    const [minStake, setMinStake] = useState(0.35);

    // Inject global CSS once on mount (avoids the `jsx global` prop warning)
    useEffect(() => {
        const styleId = 'copytrading-global-styles';
        if (!document.getElementById(styleId)) {
            const styleEl = document.createElement('style');
            styleEl.id = styleId;
            styleEl.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                .qs-input {
                    padding: 12px 16px;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    font-size: 14px;
                    outline: none;
                    width: 100%;
                    box-sizing: border-box;
                    background-color: #fafafa;
                    transition: border-color 0.2s;
                }
                .qs-input:focus {
                    border-color: #4CAF50;
                }
                @media (max-width: 768px) {
                    input, textarea, select { font-size: 16px !important; }
                    button { touch-action: manipulation; }
                    body { -webkit-overflow-scrolling: touch; overflow-x: hidden; }
                }
            `;
            document.head.appendChild(styleEl);
        }
    }, []);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth <= 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-dismiss toast after 3 seconds
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Load saved token on component mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('deriv_copier_token') || localStorage.getItem('deriv_copy_user_token');
            if (saved) {
                setSavedToken(saved);
                copy_trading_logic.setCopierToken(saved);
                const status = copy_trading_logic.getStatus();
                setIsCopyTrading(status.is_copying);
                setIsPaused(status.is_paused);
            }
        } catch (error) {
            console.error('Error loading saved token:', error);
        }
    }, []);

    const saveToken = () => {
        const t = token.trim();
        if (!t) { setToast({ type: 'err', text: 'Token is empty' }); return; }
        if (t.length < 10) { setToast({ type: 'err', text: 'Token is too short' }); return; }
        try {
            localStorage.setItem('deriv_copier_token', t);
            copy_trading_logic.setCopierToken(t);
            setSavedToken(t);
            setToken('');
            setToast({ type: 'ok', text: 'Token saved successfully' });
        } catch (error) {
            console.error('Error saving token:', error);
            setToast({ type: 'err', text: 'Failed to save token' });
        }
    };

    const removeToken = () => {
        if (!window.confirm('Are you sure you want to disconnect? This will stop any active copy trading.')) return;
        try {
            localStorage.removeItem('deriv_copier_token');
            localStorage.removeItem('deriv_copy_user_token');
            if (isCopyTrading) {
                copy_trading_logic.stopCopying(client.loginid);
            }
            setSavedToken(null);
            setIsCopyTrading(false);
            setIsPaused(false);
            setToast({ type: 'ok', text: 'Token removed successfully' });
        } catch (error) {
            console.error('Error removing token:', error);
            setToast({ type: 'err', text: 'Failed to remove token' });
        }
    };

    const toggleCopyTrading = async () => {
        if (!isCopyTrading) {
            if (!client.is_logged_in) {
                setToast({ type: 'err', text: 'Please login to Deriv first' });
                return;
            }
            const res = await copy_trading_logic.startCopying(client.loginid, {
                max_trade_stake: maxStake,
                min_trade_stake: minStake,
            });

            if (res.error) {
                setToast({ type: 'err', text: `Failed: ${res.error.message || 'Unknown error'}` });
            } else {
                setIsCopyTrading(true);
                setIsPaused(false);
                setToast({ type: 'ok', text: 'Copy trading active!' });
            }
        } else {
            const res = await copy_trading_logic.stopCopying(client.loginid);
            if (res.error) {
                setToast({ type: 'err', text: `Stop Failed: ${res.error.message || 'Unknown error'}` });
            } else {
                setIsCopyTrading(false);
                setIsPaused(false);
                setToast({ type: 'ok', text: 'Copy trading stopped' });
            }
        }
    };

    const handlePause = async () => {
        const res = await copy_trading_logic.pauseCopying(client.loginid);
        if (res.error) {
            setToast({ type: 'err', text: `Pause Failed: ${res.error.message || 'Unknown error'}` });
        } else {
            setIsCopyTrading(false);
            setIsPaused(true);
            setToast({ type: 'ok', text: 'Copy trading paused' });
        }
    };

    return (
        <div style={{
            position: 'fixed',
            width: '100%',
            height: isMobile ? 'calc(100vh - 100px)' : 'calc(100vh - 120px)',
            display: 'flex',
            flexDirection: 'column' as const,
            padding: isMobile ? '10px' : '20px',
            boxSizing: 'border-box' as const,
            overflowX: 'hidden' as const,
            overflowY: 'auto' as const,
            backgroundColor: '#dddbdbff',
            WebkitOverflowScrolling: 'touch' as const
        }}>
            {/* Title */}
            <h2 style={{
                fontWeight: '700',
                fontSize: isMobile ? '20px' : '24px',
                margin: isMobile ? '15px 0 10px' : '20px 0 15px',
                color: '#0a1aadff',
                textAlign: isMobile ? 'center' : 'left' as const
            }}>
                Token Manager & Copy Settings
            </h2>

            {/* Token Input Section */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: isMobile ? '16px' : '20px',
                marginTop: '5px',
                boxSizing: 'border-box' as const,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '16px' : '20px', width: '100%' }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row' as const,
                        alignItems: 'center',
                        gap: isMobile ? '15px' : '12px',
                        width: '100%'
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column' as const,
                            alignItems: 'center',
                            backgroundColor: '#f5f5f5',
                            padding: isMobile ? '10px 14px' : '12px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: '1px solid #e0e0e0',
                            alignSelf: isMobile ? 'center' : 'stretch'
                        }}>
                            <FaYoutube style={{ color: '#FF0000', fontSize: isMobile ? '22px' : '24px' }} />
                            <span style={{ color: '#333', fontSize: isMobile ? '10px' : '11px', marginTop: '3px', fontWeight: '500' }}>
                                Tutorial
                            </span>
                        </div>
                        <input
                            type="password"
                            placeholder="Enter API token"
                            className="qs-input"
                            value={token}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value)}
                        />
                        <button
                            style={{
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: isMobile ? '14px 16px' : '12px 20px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                whiteSpace: 'nowrap' as const,
                                transition: 'all 0.2s',
                                opacity: !token ? 0.6 : 1,
                                cursor: !token ? 'not-allowed' : 'pointer',
                                fontSize: isMobile ? '15px' : '14px',
                                flex: isMobile ? 1 : 'none',
                                fontWeight: '600',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onClick={saveToken}
                            disabled={!token}
                        >
                            <span>Save Token</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Advanced Settings Section */}
            {savedToken && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: isMobile ? '20px' : '24px',
                    marginTop: '20px',
                    boxSizing: 'border-box' as const,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        <FaCog style={{ color: '#4CAF50', fontSize: '20px' }} />
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#333' }}>Advanced Copy Settings</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaShieldAlt style={{ color: '#f44336' }} />
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#666' }}>Max Stake</label>
                                </div>
                                <input
                                    type="number"
                                    className="qs-input"
                                    value={maxStake}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxStake(Number(e.target.value))}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FaShieldAlt style={{ color: '#4CAF50' }} />
                                    <label style={{ fontSize: '13px', fontWeight: '600', color: '#666' }}>Min Stake</label>
                                </div>
                                <input
                                    type="number"
                                    className="qs-input"
                                    value={minStake}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMinStake(Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '30px', flexWrap: 'wrap' }}>
                        <button
                            style={{
                                backgroundColor: isCopyTrading ? '#f44336' : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: isMobile ? '16px 24px' : '15px 35px',
                                borderRadius: '10px',
                                fontWeight: '700',
                                fontSize: isMobile ? '16px' : '16px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                boxShadow: isCopyTrading ? '0 4px 14px rgba(244, 67, 54, 0.4)' : '0 4px 14px rgba(76, 175, 80, 0.4)',
                                width: isMobile ? '100%' : 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                            onClick={toggleCopyTrading}
                        >
                            {isCopyTrading ? '🛑 Stop' : (isPaused ? '🚀 Resume' : '🚀 Start')}
                        </button>

                        {isCopyTrading && (
                            <button
                                style={{
                                    backgroundColor: '#FF9800',
                                    color: 'white',
                                    border: 'none',
                                    padding: isMobile ? '16px 24px' : '15px 35px',
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    fontSize: isMobile ? '16px' : '16px',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(255, 152, 0, 0.4)',
                                    width: isMobile ? '100%' : 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px'
                                }}
                                onClick={handlePause}
                            >
                                <span>⏸️ Pause</span>
                            </button>
                        )}
                    </div>

                    <div style={{
                        marginTop: '20px',
                        padding: '12px',
                        backgroundColor: isCopyTrading ? '#e8f5e9' : (isPaused ? '#fff3e0' : '#f5f5f5'),
                        borderRadius: '8px',
                        textAlign: 'center' as const,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: isCopyTrading ? '#2e7d32' : (isPaused ? '#ef6c00' : '#757575'),
                        border: `1px solid ${isCopyTrading ? '#c8e6c9' : (isPaused ? '#ffe0b2' : '#e0e0e0')}`
                    }}>
                        Status: {isCopyTrading ? 'ACTIVE' : (isPaused ? 'PAUSED' : 'INACTIVE')}
                    </div>
                </div>
            )}

            {/* Saved Token Display (Footer-like) */}
            {savedToken && (
                <div style={{
                    backgroundColor: '#1a237e',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    marginTop: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px'
                }}>
                    <span>Token: <code>{savedToken.slice(0, 4)}...{savedToken.slice(-4)}</code></span>
                    <button
                        onClick={removeToken}
                        style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: 'white',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Disconnect
                    </button>
                </div>
            )}

            <div style={{
                marginTop: '25px',
                padding: '16px 20px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                borderLeft: '4px solid #2196F3',
                fontSize: '14px',
                color: '#333',
                lineHeight: '1.6',
                marginBottom: '40px'
            }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#0a1aadff' }}>
                    Copy Trading Instructions:
                </p>
                <ol style={{ margin: '0', paddingLeft: '20px' }}>
                    <li>Ensure you have a valid Deriv API token with 'read' and 'trade' scopes.</li>
                    <li>Set your preferred stake limits and target assets to filter trades.</li>
                    <li>The system will automatically mirror trades from the source account.</li>
                </ol>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    padding: '16px 32px',
                    borderRadius: '50px',
                    fontWeight: '600',
                    backgroundColor: toast.type === 'ok' ? '#4CAF50' : '#f44336',
                    color: 'white',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    animation: 'slideInRight 0.3s ease',
                    whiteSpace: 'nowrap'
                }}>
                    {toast.text}
                </div>
            )}
        </div>
    );
});

export default TokenManager;
