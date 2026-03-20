import React from 'react';
import { getAppId, getSocketURL, setTokenLogin } from '@deriv/shared';

/**
 * Authorize a Deriv API token via a raw WebSocket.
 * This avoids any dependency on internal Services/socket-base.
 */
const authorizeToken = token => {
    return new Promise((resolve, reject) => {
        const app_id = getAppId() || 96624;
        const socket_url = `wss://${getSocketURL()}/websockets/v3?app_id=${app_id}&l=EN&brand=deriv`;

        let ws;
        try {
            ws = new WebSocket(socket_url);
        } catch (e) {
            reject(new Error('Could not connect to Deriv servers.'));
            return;
        }

        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Connection timed out. Please try again.'));
        }, 15000);

        ws.onmessage = evt => {
            try {
                const data = JSON.parse(evt.data);
                if (data.msg_type === 'authorize') {
                    clearTimeout(timeout);
                    ws.close();
                    if (data.error) {
                        reject(new Error(data.error.message || 'Invalid API token.'));
                    } else {
                        resolve(data.authorize);
                    }
                }
            } catch (e) {
                clearTimeout(timeout);
                ws.close();
                reject(new Error('Unexpected server response.'));
            }
        };

        ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection error.'));
        };

        ws.onopen = () => {
            ws.send(JSON.stringify({ authorize: token }));
        };
    });
};

const TokenLoginModal = ({ onClose, onSuccess }) => {
    const [token, setToken] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSubmit = async e => {
        e.preventDefault();
        const trimmed = token.trim();
        if (!trimmed) {
            setError('Please enter your API token.');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const authorize = await authorizeToken(trimmed);

            const loginid = authorize.loginid;
            const existing = JSON.parse(localStorage.getItem('client.accounts') || '{}');

            // Build the account record the same way OAuth does
            existing[loginid] = {
                ...(existing[loginid] || {}),
                token: trimmed,
                email: authorize.email || '',
                currency: authorize.currency || '',
                is_virtual: authorize.is_virtual || 0,
                residence: authorize.country || '',
                landing_company_name: authorize.landing_company_fullname || '',
                landing_company_shortcode: authorize.landing_company_name || '',
                balance: authorize.balance || 0,
                account_category: 'trading',
            };

            // Register any other linked accounts from account_list (metadata only, no tokens)
            if (Array.isArray(authorize.account_list)) {
                authorize.account_list.forEach(acc => {
                    if (!existing[acc.loginid]) {
                        existing[acc.loginid] = {
                            email: authorize.email || '',
                            currency: acc.currency || '',
                            is_virtual: acc.is_virtual || 0,
                            residence: authorize.country || '',
                            landing_company_shortcode: acc.landing_company_name || '',
                            account_category: acc.account_category || 'trading',
                        };
                    }
                });
            }

            // Persist exactly as OAuth flow does
            localStorage.setItem('client.accounts', JSON.stringify(existing));
            localStorage.setItem('active_loginid', loginid);

            // Mark as token-login session
            setTokenLogin(true);

            setLoading(false);
            onSuccess();
        } catch (err) {
            setError(err.message || 'Authentication failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={styles.modal}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerLeft}>
                        <div style={styles.iconCircle}>
                            <svg width='20' height='20' viewBox='0 0 24 24' fill='none'>
                                <path
                                    d='M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4'
                                    stroke='#85ACB0'
                                    strokeWidth='2'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                />
                            </svg>
                        </div>
                        <div>
                            <h2 style={styles.title}>Login with API Token</h2>
                            <p style={styles.subtitle}>Enter your Deriv API token to access your account</p>
                        </div>
                    </div>
                    <button style={styles.closeBtn} onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* How to get token info */}
                <div style={styles.infoBox}>
                    <div style={styles.infoIcon}>ℹ</div>
                    <p style={styles.infoText}>
                        Go to <strong>deriv.com → Account Settings → Security → API Token</strong> and create a token
                        with <strong>Read</strong>, <strong>Trade</strong>, and <strong>Trading Information</strong>{' '}
                        scopes.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label} htmlFor='api-token-input'>
                            Your API Token
                        </label>
                        <div style={styles.inputWrapper}>
                            <input
                                id='api-token-input'
                                type='password'
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                placeholder='e.g. bX7kPqRmN2wLcJhT...'
                                style={{
                                    ...styles.input,
                                    ...(error ? styles.inputError : {}),
                                }}
                                autoComplete='off'
                                spellCheck={false}
                                disabled={loading}
                            />
                            {token && !loading && (
                                <button type='button' style={styles.clearBtn} onClick={() => setToken('')}>
                                    ✕
                                </button>
                            )}
                        </div>
                        {error && (
                            <div style={styles.errorBox}>
                                <span style={styles.errorIcon}>⚠</span>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={styles.actions}>
                        <button type='button' style={styles.cancelBtn} onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type='submit' style={styles.submitBtn} disabled={loading || !token.trim()}>
                            {loading ? (
                                <span style={styles.spinnerRow}>
                                    <svg
                                        width='16'
                                        height='16'
                                        viewBox='0 0 24 24'
                                        fill='none'
                                        style={{ animation: 'tlm-spin 1s linear infinite' }}
                                    >
                                        <circle
                                            cx='12'
                                            cy='12'
                                            r='10'
                                            stroke='white'
                                            strokeWidth='3'
                                            strokeDasharray='31.4'
                                            strokeDashoffset='10'
                                        />
                                    </svg>
                                    Authenticating...
                                </span>
                            ) : (
                                'Login with Token'
                            )}
                        </button>
                    </div>
                </form>

                {/* Footer note */}
                <p style={styles.footerNote}>
                    ⚡ Demo account switching requires standard OAuth login. Token login gives full real account access.
                </p>

                <style>{`
                    @keyframes tlm-spin { to { transform: rotate(360deg); } }
                    @keyframes tlm-fadein { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
                `}</style>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
    },
    modal: {
        background: 'linear-gradient(145deg, #1a2332 0%, #0f1923 100%)',
        border: '1px solid rgba(133,172,176,0.2)',
        borderRadius: '16px',
        padding: '28px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        animation: 'tlm-fadein 0.2s ease-out',
    },
    header: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '20px',
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
    iconCircle: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: 'rgba(133,172,176,0.15)',
        border: '1px solid rgba(133,172,176,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    title: { margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1.3 },
    subtitle: { margin: '2px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)' },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.4)',
        cursor: 'pointer',
        fontSize: '16px',
        padding: '4px 8px',
        flexShrink: 0,
    },
    infoBox: {
        display: 'flex',
        gap: '10px',
        background: 'rgba(133,172,176,0.1)',
        border: '1px solid rgba(133,172,176,0.2)',
        borderRadius: '10px',
        padding: '12px 14px',
        marginBottom: '20px',
    },
    infoIcon: { fontSize: '14px', color: '#85ACB0', flexShrink: 0, lineHeight: 1.6 },
    infoText: { margin: 0, fontSize: '12.5px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 },
    inputGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '8px' },
    inputWrapper: { position: 'relative' },
    input: {
        width: '100%',
        padding: '12px 40px 12px 14px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '10px',
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: 'monospace',
    },
    inputError: { borderColor: 'rgba(255,80,80,0.6)', background: 'rgba(255,80,80,0.05)' },
    clearBtn: {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: 'rgba(255,255,255,0.3)',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '4px',
    },
    errorBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '8px',
        padding: '8px 12px',
        background: 'rgba(255,80,80,0.1)',
        border: '1px solid rgba(255,80,80,0.3)',
        borderRadius: '8px',
        color: '#ff6b6b',
        fontSize: '12.5px',
    },
    errorIcon: { fontSize: '14px' },
    actions: { display: 'flex', gap: '10px' },
    cancelBtn: {
        flex: 1,
        padding: '12px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 600,
    },
    submitBtn: {
        flex: 2,
        padding: '12px',
        background: 'linear-gradient(135deg, #85ACB0, #5b8a8f)',
        border: 'none',
        borderRadius: '10px',
        color: '#fff',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    spinnerRow: { display: 'flex', alignItems: 'center', gap: '8px' },
    footerNote: {
        marginTop: '16px',
        marginBottom: 0,
        fontSize: '11.5px',
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        lineHeight: 1.5,
    },
};

export default TokenLoginModal;
