import React, { useEffect, useState, useCallback } from 'react';
import { observer, useStore } from '@deriv/stores';
import styles from './trader.module.scss';

interface ClientAccount {
    [key: string]: {
        currency?: string;
        token?: string;
    };
}

interface DTraderAutoLoginProps {
    dtraderUrl?: string;
    appId?: number;
    defaultSymbol?: string;
}

const DTraderAutoLogin = observer(({
    dtraderUrl = 'https://deriv-dtrader.vercel.app/dtrader',
    appId = 118970,
    defaultSymbol = '1HZ100V',
}: DTraderAutoLoginProps) => {
    const { client } = useStore();
    const { loginid, accounts } = client;
    const [iframeSrc, setIframeSrc] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const validateDtraderUrl = (url: string): boolean => {
        try {
            const { hostname } = new URL(url);
            const trustedDomains = [
                'deriv-dta.vercel.app',
                'deriv.com',
                'deriv-dtrader.vercel.app'
            ];
            return trustedDomains.some(domain => hostname.endsWith(domain));
        } catch {
            return false;
        }
    };

    const buildIframeUrl = useCallback((token: string, loginId: string) => {
        if (!validateDtraderUrl(dtraderUrl)) {
            setError('Invalid DTrader URL');
            setIsLoading(false);
            return;
        }

        try {
            const active_account = accounts?.[loginId] || {};
            const currency = active_account.currency || 'USD';

            const params = new URLSearchParams({
                acct1: loginId,
                token1: token,
                cur1: currency,
                lang: 'EN',
                app_id: appId.toString(),
                chart_type: 'area',
                interval: '1t',
                symbol: defaultSymbol,
                trade_type: 'over_under',
            });

            const url = `${dtraderUrl}?${params.toString()}`;
            setIframeSrc(url);
            setError(null);
        } catch (err) {
            console.error('Error building iframe URL:', err);
            setError('Failed to initialize trading interface');
        } finally {
            setIsLoading(false);
        }
    }, [appId, defaultSymbol, dtraderUrl, accounts]);

    const checkAuthAndUpdate = useCallback(() => {
        try {
            const activeLoginId = loginid || localStorage.getItem('active_loginid');
            const clientAccountsStr = localStorage.getItem('client.accounts') || '{}';
            let authToken = '';

            if (activeLoginId) {
                try {
                    const clientAccounts: ClientAccount = JSON.parse(clientAccountsStr);
                    authToken = clientAccounts[activeLoginId]?.token || accounts?.[activeLoginId]?.token || '';
                } catch (e) {
                    console.error('Error parsing client accounts for token:', e);
                }
            }

            if (authToken && activeLoginId) {
                buildIframeUrl(authToken, activeLoginId);
            } else {
                setIframeSrc(`${dtraderUrl}?chart_type=area&interval=1t&symbol=${defaultSymbol}&trade_type=over_under`);
                setIsLoading(false);
            }
        } catch (err) {
            console.error('Auth check failed:', err);
            setError('Authentication check failed');
            setIsLoading(false);
        }
    }, [buildIframeUrl, defaultSymbol, dtraderUrl, loginid, accounts]);

    useEffect(() => {
        checkAuthAndUpdate();

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'active_loginid' || e.key === 'client.accounts') {
                checkAuthAndUpdate();
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkAuthAndUpdate();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('focus', checkAuthAndUpdate);
        window.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('focus', checkAuthAndUpdate);
            window.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [checkAuthAndUpdate]);

    if (error) {
        return (
            <div className={styles['error-container']}>
                <p>{error}</p>
                <button
                    onClick={checkAuthAndUpdate}
                    className={styles['retry-button']}
                >
                    Retry
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={styles['spinner-container']}>
                <div className={styles['spinner']}></div>
                <p>Loading DTrader...</p>
            </div>
        );
    }

    return (
        <div className={styles['trader-container']}>
            <iframe
                src={iframeSrc}
                title="DTrader Trading Platform"
                className={styles['iframe']}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                allow="clipboard-read; clipboard-write"
                loading="eager"
            />
        </div>
    );
});

export default DTraderAutoLogin;
