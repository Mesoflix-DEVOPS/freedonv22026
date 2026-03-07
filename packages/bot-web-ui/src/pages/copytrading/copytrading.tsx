import React, { useState, useEffect } from 'react';
import { FaYoutube } from 'react-icons/fa';

const TokenManager: React.FC = () => {
    const [token, setToken] = useState('');
    const [savedToken, setSavedToken] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isCopyTrading, setIsCopyTrading] = useState(false);

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
            if (saved) setSavedToken(saved);
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
            setSavedToken(t);
            setToken('');
            setToast({ type: 'ok', text: 'Token saved successfully' });
        } catch (error) {
            console.error('Error saving token:', error);
            setToast({ type: 'err', text: 'Failed to save token' });
        }
    };

    const removeToken = () => {
        try {
            localStorage.removeItem('deriv_copier_token');
            localStorage.removeItem('deriv_copy_user_token');
            setSavedToken(null);
            setIsCopyTrading(false);
            setToast({ type: 'ok', text: 'Token removed successfully' });
        } catch (error) {
            console.error('Error removing token:', error);
            setToast({ type: 'err', text: 'Failed to remove token' });
        }
    };

    const toggleCopyTrading = () => {
        if (!isCopyTrading) {
            setIsCopyTrading(true);
            setToast({ type: 'ok', text: 'Copy trading started (frontend only)' });
        } else {
            setIsCopyTrading(false);
            setToast({ type: 'ok', text: 'Copy trading stopped' });
        }
    };

    return (
        <div style={{
            position: 'fixed',
            width: '100%',
            height: isMobile ? '70vh' : '75vh',
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
                Token Manager
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
                            value={token}
                            onChange={e => setToken(e.target.value)}
                            style={{
                                flex: 1,
                                padding: isMobile ? '14px 16px' : '12px 16px',
                                border: '2px solid #e0e0e0',
                                borderRadius: '8px',
                                fontSize: isMobile ? '16px' : '14px',
                                outline: 'none',
                                width: '100%',
                                boxSizing: 'border-box' as const,
                                backgroundColor: '#fafafa',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#4CAF50'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; }}
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

            {/* Saved Token Display */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: isMobile ? '16px' : '20px',
                marginTop: isMobile ? '15px' : '20px',
                boxSizing: 'border-box' as const,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                flex: '0 0 auto'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexDirection: isMobile ? 'column' : 'row' as const,
                    gap: isMobile ? '15px' : '0',
                    width: '100%'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isMobile ? '12px' : '20px',
                        flexDirection: isMobile ? 'column' : 'row' as const,
                        width: isMobile ? '100%' : 'auto'
                    }}>
                        <div style={{
                            backgroundColor: '#f0f4ff',
                            padding: isMobile ? '12px 16px' : '10px 16px',
                            borderRadius: '8px',
                            fontFamily: 'monospace',
                            fontSize: '14px',
                            color: '#1a237e',
                            border: '2px solid #d1d9ff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap' as const,
                            justifyContent: 'center',
                            width: isMobile ? '100%' : 'auto',
                            boxSizing: 'border-box' as const
                        }}>
                            <span style={{ fontWeight: '600' }}>Saved Token:</span>
                            <span style={{ fontWeight: '500' }}>
                                {savedToken ? `${savedToken.slice(0, 4)}...${savedToken.slice(-4)}` : 'No token saved'}
                            </span>
                            <span style={{ color: savedToken ? '#4caf50' : '#f44336', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{
                                    width: '10px', height: '10px',
                                    backgroundColor: savedToken ? '#4caf50' : '#f44336',
                                    borderRadius: '50%', display: 'inline-block'
                                }} />
                                {savedToken ? 'Saved' : 'Not Saved'}
                            </span>
                        </div>
                    </div>

                    {savedToken && (
                        <button
                            style={{
                                backgroundColor: '#f44336',
                                color: 'white',
                                border: 'none',
                                padding: isMobile ? '14px 16px' : '12px 20px',
                                borderRadius: '8px',
                                fontWeight: '600',
                                fontSize: '15px',
                                whiteSpace: 'nowrap' as const,
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                flex: isMobile ? 1 : 'none',
                                textAlign: 'center' as const,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                width: isMobile ? '100%' : 'auto'
                            }}
                            onClick={removeToken}
                        >
                            Remove Token
                        </button>
                    )}
                </div>

                {savedToken && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: isMobile ? '20px' : '25px' }}>
                        <button
                            style={{
                                backgroundColor: isCopyTrading ? '#f44336' : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                padding: isMobile ? '16px 24px' : '14px 32px',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: isMobile ? '16px' : '18px',
                                whiteSpace: 'nowrap' as const,
                                transition: 'all 0.3s',
                                cursor: 'pointer',
                                textAlign: 'center' as const,
                                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                                width: isMobile ? '100%' : 'auto',
                                minWidth: isMobile ? 'auto' : '250px'
                            }}
                            onClick={toggleCopyTrading}
                        >
                            {isCopyTrading ? '🛑 Stop Copy Trading' : '🚀 Start Copy Trading'}
                        </button>
                    </div>
                )}

                {savedToken && (
                    <div style={{
                        marginTop: isMobile ? '15px' : '20px',
                        padding: isMobile ? '12px 16px' : '14px 20px',
                        backgroundColor: isCopyTrading ? '#f0f9f0' : '#f8f9fa',
                        borderRadius: '8px',
                        borderLeft: `4px solid ${isCopyTrading ? '#4CAF50' : '#9e9e9e'}`,
                        fontSize: isMobile ? '14px' : '15px',
                        color: isCopyTrading ? '#2e7d32' : '#666',
                        textAlign: 'center' as const,
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}>
                        <div style={{
                            width: '12px', height: '12px',
                            backgroundColor: isCopyTrading ? '#4CAF50' : '#9e9e9e',
                            borderRadius: '50%', display: 'inline-block'
                        }} />
                        <span>Copy Trading: {isCopyTrading ? 'Active' : 'Inactive'}</span>
                    </div>
                )}

                <div style={{
                    marginTop: isMobile ? '20px' : '25px',
                    padding: isMobile ? '12px 16px' : '16px 20px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    borderLeft: '4px solid #2196F3',
                    fontSize: isMobile ? '13px' : '14px',
                    color: '#333',
                    lineHeight: '1.6'
                }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#0a1aadff' }}>
                        How to get your API token:
                    </p>
                    <ol style={{ margin: '0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <li>Go to your Deriv account settings</li>
                        <li>Navigate to API token section</li>
                        <li>Generate a new token or copy existing one</li>
                        <li>Paste it above and click &quot;Save Token&quot;</li>
                    </ol>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed',
                    top: isMobile ? '10px' : '20px',
                    right: isMobile ? '10px' : '20px',
                    left: isMobile ? '10px' : 'auto',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: isMobile ? '14px 18px' : '16px 24px',
                    borderRadius: '10px',
                    fontWeight: '600',
                    backgroundColor: toast.type === 'ok' ? '#4CAF50' : '#f44336',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    animation: 'slideInRight 0.3s ease',
                    maxWidth: isMobile ? 'calc(100% - 20px)' : '400px'
                }}>
                    <div style={{ fontSize: '20px' }}>{toast.type === 'ok' ? '✓' : '⚠'}</div>
                    <span style={{ flex: 1, textAlign: 'center', fontSize: isMobile ? '14px' : '15px' }}>
                        {toast.text}
                    </span>
                </div>
            )}
        </div>
    );
};

export default TokenManager;