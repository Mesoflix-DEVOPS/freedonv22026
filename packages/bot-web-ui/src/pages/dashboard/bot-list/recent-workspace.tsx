import React from 'react';
import { observer } from '@deriv/stores';
import { useDBotStore } from 'Stores/useDBotStore';
import { TRecentStrategy } from './types';
import './recent-workspace.scss';
import { loadStrategy } from '../../../../../bot-skeleton/src/utils/local-storage';

const BOT_NAMES = ['AlphaWave Pro', 'TrendMaster X', 'VolatilityBot', 'GridMaster AI', 'MomentumEdge', 'ScalperBot', 'NeuralTrader', 'PrecisionBot'];
const BOT_DESCRIPTIONS = [
    'Advanced trend-following strategy using dual moving average crossover with adaptive stop-loss management.',
    'Volatility-based entry system using Bollinger Band breakouts with momentum confirmation.',
    'Mean-reversion bot capturing price deviations from equilibrium in range-bound conditions.',
    'Breakout strategy entering on support/resistance breaks with volume-confirmed signals.',
    'High-frequency scalper targeting micro-profits with tight spreads and rapid execution.',
    'RSI-powered momentum bot avoiding overbought/oversold traps for clean trend direction.',
    'Grid-based placement system profiting from market oscillations with dynamic spacing.',
    'News-event reactive strategy using sentiment triggers for directional trading edges.',
];
const WIN_RATES = [87, 74, 91, 68, 82, 79, 95, 71];
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '30m', '5m', '1m', '4h'];

const RecentWorkspace = observer(({ workspace, index }: { workspace: TRecentStrategy, index: number }) => {
    const { dashboard } = useDBotStore();
    const strategyIdRef = React.useRef(workspace.id);
    const strategyNameRef = React.useRef(workspace.name || BOT_NAMES[index % BOT_NAMES.length]);
    const winRate = WIN_RATES[index % WIN_RATES.length];
    const timeframe = TIMEFRAMES[index % TIMEFRAMES.length];

    const handleLoad = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            dashboard.setActiveTab(1);
            const waitForWorkspace = () =>
                new Promise<boolean>(resolve => {
                    const start = Date.now();
                    const interval = setInterval(() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const Blockly: any = (window as unknown as { Blockly?: unknown }).Blockly;
                        const ready = !!(Blockly && (Blockly as any).derivWorkspace);
                        if (ready) { clearInterval(interval); resolve(true); }
                        else if (Date.now() - start > 5000) { clearInterval(interval); resolve(false); }
                    }, 100);
                });

            const workspace_ready = await waitForWorkspace();
            if (workspace_ready) {
                await loadStrategy(strategyIdRef.current);
            }
        } catch (error) {
            console.error(`[ERROR] Failed to load bot:`, error);
        }
    };

    return (
        <div className='dbot-gold-card'>
            {/* Animated background circuit lines */}
            <div className='dbot-gold-card__circuits'>
                {Array.from({ length: 6 }).map((_, i) => <span key={i} />)}
            </div>

            {/* Floating gold particles */}
            <div className='dbot-gold-card__particles'>
                {Array.from({ length: 8 }).map((_, i) => <span key={i} />)}
            </div>

            {/* PREMIUM badge - top right */}
            <div className='dbot-gold-card__premium'>★ PREMIUM</div>

            {/* Header */}
            <div className='dbot-gold-card__header'>
                <div className='dbot-gold-card__icon'>⚡</div>
                <div className='dbot-gold-card__meta'>
                    <div className='dbot-gold-card__name'>{strategyNameRef.current}</div>
                    <div className='dbot-gold-card__timeframe'>Timeframe: {timeframe}</div>
                </div>
            </div>

            {/* Description */}
            <div className='dbot-gold-card__description'>
                {BOT_DESCRIPTIONS[index % BOT_DESCRIPTIONS.length]}
            </div>

            {/* Win Rate Meter */}
            <div className='dbot-gold-card__stats'>
                <div className='dbot-gold-card__stat-label'>
                    <span>Win Rate</span>
                    <span className='dbot-gold-card__win-rate'>{winRate}%</span>
                </div>
                <div className='dbot-gold-card__meter'>
                    <div className='dbot-gold-card__meter-fill' style={{ width: `${winRate}%` }}>
                        <div className='dbot-gold-card__meter-shine' />
                    </div>
                </div>
            </div>

            {/* Full-width Load Button */}
            <button className='dbot-gold-card__load-btn' onClick={handleLoad}>
                <span className='dbot-gold-card__load-icon'>🚀</span>
                <span>Load Bot</span>
                <span className='dbot-gold-card__load-arrow'>→</span>
            </button>

            {/* Gold shine sweep */}
            <div className='dbot-gold-card__shine' />
        </div>
    );
});

export default RecentWorkspace;