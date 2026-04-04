import React, { useState, useEffect } from 'react';
import { FaCog, FaChartLine, FaShieldAlt } from 'react-icons/fa';
import { useStore } from '@deriv/stores';
import { copy_trading_logic } from './CopyTradingLogic';
import { observer } from 'mobx-react-lite';

const MirrorHub: React.FC = observer(() => {
    const { client } = useStore();
    
    // Target Token
    const [targetToken, setTargetToken] = useState('');
    const [savedTargetToken, setSavedTargetToken] = useState<string | null>(null);

    // UI State
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isMirroring, setIsMirroring] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Risk Settings
    const [maxStake, setMaxStake] = useState(100);
    const [minStake, setMinStake] = useState(0.35);

    // Inject styles
    useEffect(() => {
        const styleId = 'copytrading-unified-styles';
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
                    border-radius: 24px;
                    padding: 40px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.05);
                    animation: fadeInUp 0.5s ease-out;
                    max-width: 800px;
                    margin: 0 auto;
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
                .status-indicator {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    border-radius: 30px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.5px;
                }
            `;
            document.head.appendChild(styleEl);
        }
    }, []);

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

    // Load saved target token
    useEffect(() => {
        const t = localStorage.getItem('deriv_target_token');
        if (t) {
            setSavedTargetToken(t);
            setTargetToken(t);
            copy_trading_logic.setTargetToken(t);
        }
    }, []);

    const saveTargetToken = () => {
        const t = targetToken.trim();
        if (t.length < 10) { 
            setToast({ type: 'ok', text: 'Target Token Cleared' }); 
            localStorage.removeItem('deriv_target_token'); 
            setSavedTargetToken(null); 
            copy_trading_logic.setTargetToken('');
            return; 
        }
        localStorage.setItem('deriv_target_token', t);
        setSavedTargetToken(t);
        copy_trading_logic.setTargetToken(t);
        setToast({ type: 'ok', text: 'Target Account Linked' });
    };

    const handleToggleMirroring = async () => {
        if (!savedTargetToken) {
            setToast({ type: 'err', text: 'Target Account Token Required' });
            return;
        }

        setIsProcessing(true);
        if (isMirroring) {
            copy_trading_logic.stopMirroring();
            setIsMirroring(false);
            setToast({ type: 'ok', text: 'Mirroring Stopped' });
        } else {
            copy_trading_logic.setRiskSettings(maxStake, minStake);
            const res = await copy_trading_logic.startMirroring(client.api);
            if (res.error) {
                setToast({ type: 'err', text: `Failed: ${res.error.message || 'Check Token'}` });
            } else {
                setIsMirroring(true);
                setToast({ type: 'ok', text: 'Real-Time Mirroring Active!' });
            }
        }
        setIsProcessing(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            padding: isMobile ? '20px 10px' : '40px',
            backgroundColor: '#f4f7f9',
            fontFamily: "'Outfit', sans-serif",
            boxSizing: 'border-box'
        }}>
            {/* Header Area */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? '28px' : '36px', color: '#1a237e', fontWeight: 900 }}>Mirror Hub</h1>
                <p style={{ margin: '10px 0 0 0', color: '#64748b', fontSize: '16px' }}>Project your trades instantly to any target account</p>
            </div>

            {/* Mirror Unified Card */}
            <div className="mirror-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <div className="status-indicator" style={{ background: isMirroring ? '#ecfdf5' : '#fef2f2', color: isMirroring ? '#059669' : '#dc2626', marginBottom: '10px' }}>
                            {isMirroring ? '● SYSTEM ACTIVE' : '● SYSTEM OFFLINE'}
                        </div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Mirror Configuration</h2>
                    </div>
                    {isMirroring && (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '12px 20px', background: '#f1f5f9', borderRadius: '15px' }}>
                            <FaChartLine color="#1a237e" />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                                LIVE: {client.loginid} ➔ {savedTargetToken?.substring(0, 4)}...
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '40px' }}>
                    {/* Left: Input & Primary Action */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>Target Account API Token</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input
                                    type="password"
                                    className="qs-input"
                                    placeholder="Enter Target API Token"
                                    value={targetToken}
                                    onChange={(e) => setTargetToken(e.target.value)}
                                    disabled={isMirroring}
                                />
                                {!isMirroring && (
                                    <button onClick={saveTargetToken} style={{ padding: '0 25px', background: '#1a237e', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 700 }}>
                                        Link
                                    </button>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                                Trades made on this site will be mirrored to the account linked with this token.
                            </p>
                        </div>

                        <button
                            onClick={handleToggleMirroring}
                            disabled={isProcessing}
                            style={{
                                width: '100%', padding: '20px', borderRadius: '16px', border: 'none',
                                background: isMirroring ? '#ef4444' : '#1a237e',
                                color: '#fff', fontWeight: 800, fontSize: '18px', cursor: 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: isMirroring ? '0 10px 20px rgba(239, 68, 68, 0.2)' : '0 10px 20px rgba(26, 35, 126, 0.2)',
                                opacity: isProcessing ? 0.7 : 1
                            }}
                        >
                            {isProcessing ? 'PROCESSING...' : (isMirroring ? 'STOP MIRRORING' : 'START MIRRORING')}
                        </button>
                    </div>

                    {/* Right: Risk Management */}
                    <div style={{ padding: '25px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                        <h4 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#475569' }}>
                            <FaShieldAlt /> Safety Limits
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Max Mirror Stake</label>
                                <input type="number" className="qs-input" style={{ padding: '10px' }} value={maxStake} onChange={(e) => setMaxStake(Number(e.target.value))} />
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Min Mirror Stake</label>
                                <input type="number" className="qs-input" style={{ padding: '10px' }} value={minStake} onChange={(e) => setMinStake(Number(e.target.value))} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                    background: toast.type === 'ok' ? '#1a237e' : '#dc2626', color: '#fff',
                    padding: '16px 32px', borderRadius: '100px', fontWeight: 700, boxShadow: '0 15px 30px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10000,
                    animation: 'fadeInUp 0.3s ease'
                }}>
                    {toast.type === 'ok' ? '✓' : '✕'} {toast.text}
                </div>
            )}
            
            <div style={{ padding: '60px 0', opacity: 0.4, fontSize: '12px', textAlign: 'center', fontWeight: 600 }}>
                MIRROR HUB v3.0 • POWERED BY CLOUD SYNC • SECURE API BRIDGE
            </div>
        </div>
    );
});

export default MirrorHub;
