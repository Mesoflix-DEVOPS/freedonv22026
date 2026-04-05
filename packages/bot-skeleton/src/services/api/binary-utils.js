export const historyToTicks = history => {
    const result = history.times.map((t, idx) => ({
        epoch: +t,
        quote: +history.prices[idx],
    }));
    return result;
};

export const getLast = arr => {
    const last = arr && (arr.length === 0 ? undefined : arr[arr.length - 1]);
    return last;
};

export const parseTick = tick => {
    const parsed = {
        epoch: +tick.epoch,
        quote: +tick.quote,
    };
    return parsed;
};

export const parseOhlc = ohlc => {
    const parsed = {
        open: +ohlc.open,
        high: +ohlc.high,
        low: +ohlc.low,
        close: +ohlc.close,
        epoch: +(ohlc.open_time || ohlc.epoch),
    };
    return parsed;
};

export const parseCandles = candles => {
    const result = candles.map(t => parseOhlc(t));
    return result;
};

export const updateTicks = (ticks, newTick) => {
    const safeTicks = Array.isArray(ticks) ? ticks : [];
    const lastTick = getLast(safeTicks);
    if (!lastTick) {
        return [...safeTicks, newTick];
    }
    if (typeof lastTick.epoch === 'undefined' || typeof newTick.epoch === 'undefined') {
        return safeTicks;
    }
    if (lastTick.epoch >= newTick.epoch) {
        return safeTicks;
    }
    const updated = [...safeTicks.slice(1), newTick];
    return updated;
};

export const updateCandles = (candles, ohlc) => {
    const lastCandle = getLast(candles);
    if (!lastCandle) {
        return [...candles, ohlc];
    }
    if (
        (lastCandle.open === ohlc.open &&
            lastCandle.high === ohlc.high &&
            lastCandle.low === ohlc.low &&
            lastCandle.close === ohlc.close &&
            lastCandle.epoch === ohlc.epoch) ||
        lastCandle.epoch > ohlc.epoch
    ) {
        return candles;
    }
    const prevCandles = lastCandle.epoch === ohlc.epoch ? candles.slice(0, -1) : candles.slice(1);
    const updated = [...prevCandles, ohlc];
    return updated;
};

export const getType = isCandle => {
    const type = isCandle === true ? 'candles' : 'ticks';
    return type;
};