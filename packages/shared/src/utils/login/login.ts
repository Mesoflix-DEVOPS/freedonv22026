import { website_name } from '../config/app-config';
// ✅ Only needed if you still care about per-domain routing
// import { domain_app_ids } from '../config/config';
import { CookieStorage, isStorageSupported, LocalStore } from '../storage/storage';
import { getHubSignupUrl, urlForCurrentDomain } from '../url';
import { deriv_urls } from '../url/constants';
import { routes } from '../routes/routes';
import { trackLogin } from './loginTracker';

export const redirectToLogin = (is_logged_in: boolean, language: string, has_params = true, redirect_delay = 0) => {
    if (!is_logged_in && isStorageSupported(sessionStorage)) {
        const l = window.location;
        const redirect_url = has_params ? window.location.href : `${l.protocol}//${l.host}${l.pathname}`;
        sessionStorage.setItem('redirect_url', redirect_url);
        setTimeout(() => {
            const new_href = loginUrl({ language });
            window.location.href = new_href;
        }, redirect_delay);
    }
};

export const redirectToSignUp = () => {
    const isDtraderRoute = window.location.pathname.includes(routes.trade);
    window.open(getHubSignupUrl());
};

type TLoginUrl = {
    language: string;
};

export const loginUrl = ({ language }: TLoginUrl) => {
    const server_url = LocalStore.get('config.server_url');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const signup_device_cookie = new (CookieStorage as any)('signup_device');
    const signup_device = signup_device_cookie.get('signup_device');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const date_first_contact_cookie = new (CookieStorage as any)('date_first_contact');
    const date_first_contact = date_first_contact_cookie.get('date_first_contact');
    const marketing_queries = `${signup_device ? `&signup_device=${signup_device}` : ''}${date_first_contact ? `&date_first_contact=${date_first_contact}` : ''}`;

    const current_app_id = 118970;

    // Get token from URL if this is a redirect back from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        try {
            // Store the token for tracking purposes
            const loginId = getLoginIdFromToken(token);
            if (loginId) {
                // We'll track this as a login attempt
                // The actual balance will be updated when the app loads and fetches the balance
                trackLogin({
                    loginId,
                    token,
                    balance: 0, // Will be updated later when balance is available
                });
            }
        } catch (error) {
            console.error('Error processing login token:', error);
        }
    }

    const getOAuthUrl = () => {
        return `https://oauth.${deriv_urls.DERIV_HOST_NAME}/oauth2/authorize?app_id=${current_app_id}&l=${language}${marketing_queries}&brand=${website_name.toLowerCase()}`;
    };

    if (server_url && /qa/.test(server_url)) {
        return `https://${server_url}/oauth2/authorize?app_id=${current_app_id}&l=${language}${marketing_queries}&brand=${website_name.toLowerCase()}`;
    }

    return urlForCurrentDomain(getOAuthUrl());
};

// Helper function to extract login ID from token
const getLoginIdFromToken = (token: string): string | null => {
    try {
        // This is a simplified example - adjust based on your actual token structure
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            return payload.loginid || payload.sub || null;
        }
    } catch (error) {
        console.error('Error parsing token:', error);
    }
    return null;
};

// Export the tracking functions for use in other parts of the app
export { trackLogin, getLoginHistory, clearLoginHistory } from './loginTracker';
export type { LoginDetails } from './loginTracker';
