
const STORAGE_KEY = 'is_marketing_mode';
const MASKED_BALANCE_KEY = 'masked_marketing_balance';

export const isMarketingMode = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY) === 'true';
};

export const setMarketingMode = (value) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    if (value && !localStorage.getItem(MASKED_BALANCE_KEY)) {
        resetMaskedBalance();
    }
};

export const getMaskedBalance = () => {
    if (typeof window === 'undefined') return 0;
    const balance = localStorage.getItem(MASKED_BALANCE_KEY);
    if (!balance) {
        return resetMaskedBalance();
    }
    return parseFloat(balance);
};

export const resetMaskedBalance = () => {
    if (typeof window === 'undefined') return 0;
    // Randomized balance between 200 and 1000
    const newBalance = Math.floor(Math.random() * (1000 - 200 + 1)) + 200;
    localStorage.setItem(MASKED_BALANCE_KEY, newBalance.toString());
    return newBalance;
};

export const updateMaskedBalance = (amount) => {
    if (typeof window === 'undefined' || !isMarketingMode()) return;
    const current = getMaskedBalance();
    const updated = Math.max(0, current + amount);
    localStorage.setItem(MASKED_BALANCE_KEY, updated.toString());
    window.dispatchEvent(new Event('marketing_balance_updated'));
};
