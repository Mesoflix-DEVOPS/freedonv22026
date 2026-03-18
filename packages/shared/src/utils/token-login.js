
const TOKEN_LOGIN_KEY = 'is_token_login';

/**
 * Returns true if the user authenticated via a manually entered API token.
 */
export const isTokenLogin = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(TOKEN_LOGIN_KEY) === 'true';
};

/**
 * Mark the current session as token-login mode.
 */
export const setTokenLogin = (value) => {
    if (typeof window === 'undefined') return;
    if (value) {
        localStorage.setItem(TOKEN_LOGIN_KEY, 'true');
    } else {
        localStorage.removeItem(TOKEN_LOGIN_KEY);
    }
};

/**
 * Clear: called on logout to reset token-login state.
 */
export const clearTokenLogin = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_LOGIN_KEY);
};
