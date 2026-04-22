import React, { useEffect, useState } from 'react';
import { getSavedWorkspaces } from '@deriv/bot-skeleton';
import { Text, Icon } from '@deriv/components';
import { observer, useStore } from '@deriv/stores';
import { Localize } from '@deriv/translations';
import { useDBotStore } from 'Stores/useDBotStore';
import RecentWorkspace from '../dashboard/bot-list/recent-workspace';
import styles from './botlist.module.scss';

/* ============================================================
   Apex AI 2026 — Exclusive Premium For-Sale Card
   ============================================================ */
const WHATSAPP_NUMBER = '254793632071';
const WHATSAPP_MSG = encodeURIComponent(
    "Hi! I want the 💰📊 Apex AI 2026 🤖💹 Bot. I’m ready to pay $1,000 now—where do I send the money and how will I receive it from you?"
);
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`;

const ApexAICard = () => {
    const [hovered, setHovered] = React.useState(false);
    const [pulse, setPulse] = React.useState(false);

    React.useEffect(() => {
        const t = setInterval(() => setPulse(p => !p), 1800);
        return () => clearInterval(t);
    }, []);

    return (
        <div
            className='dbot-gold-card'
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: hovered
                    ? 'linear-gradient(135deg, rgba(10,2,30,0.98) 0%, rgba(30,8,70,0.98) 60%, rgba(10,2,30,0.98) 100%)'
                    : 'linear-gradient(135deg, rgba(8,2,24,0.95) 0%, rgba(18,5,50,0.95) 60%, rgba(8,2,24,0.95) 100%)',
                border: `1.5px solid ${hovered ? 'rgba(180,100,255,0.95)' : 'rgba(130,50,220,0.55)'}`,
                boxShadow: hovered
                    ? '0 20px 60px rgba(130,50,220,0.45), 0 0 50px rgba(180,100,255,0.25), 0 0 0 1px rgba(180,100,255,0.2) inset'
                    : '0 8px 32px rgba(0,0,0,0.65), 0 0 20px rgba(100,30,200,0.2), 0 0 0 1px rgba(130,50,220,0.12) inset',
                transform: hovered ? 'translateY(-8px) scale(1.015)' : 'translateY(0) scale(1)',
                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                marginBottom: '1.25rem',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'default',
                padding: '1.6rem 1.4rem 1.2rem',
                borderRadius: '16px',
                backdropFilter: 'blur(14px)',
            }}
        >
            {/* Animated circuit lines */}
            <div className='dbot-gold-card__circuits'>
                {Array.from({ length: 6 }).map((_, i) => <span key={i} />)}
            </div>

            {/* Floating particles (purple/teal) */}
            <div className='dbot-gold-card__particles'>
                {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} style={{
                        background: i % 2 === 0 ? '#a855f7' : '#06b6d4',
                        animationPlayState: hovered ? 'running' : 'paused',
                    }} />
                ))}
            </div>

            {/* FOR SALE badge */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: 'linear-gradient(135deg, #6d28d9, #a855f7 50%, #9333ea)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 800,
                padding: '4px 14px 4px 10px',
                borderBottomLeftRadius: '12px',
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                zIndex: 5,
                boxShadow: '0 2px 12px rgba(168,85,247,0.6)',
            }}>
                🔥 FOR SALE
            </div>

            {/* Header */}
            <div className='dbot-gold-card__header'>
                <div style={{
                    fontSize: '2rem',
                    width: '52px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(168,85,247,0.08))',
                    border: '1px solid rgba(168,85,247,0.5)',
                    borderRadius: '12px',
                    flexShrink: 0,
                    boxShadow: pulse ? '0 0 18px rgba(168,85,247,0.6)' : '0 0 6px rgba(168,85,247,0.2)',
                    transition: 'box-shadow 0.9s ease',
                }}>
                    🤖
                </div>
                <div className='dbot-gold-card__meta'>
                    <div style={{
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        color: '#e9d5ff',
                        letterSpacing: '0.3px',
                        lineHeight: 1.2,
                    }}>
                        💰📊 APEX AI 🤖💹 _2026
                    </div>
                    <div style={{
                        fontSize: '0.72rem',
                        color: 'rgba(221,180,255,0.65)',
                        marginTop: '3px',
                        letterSpacing: '0.4px',
                    }}>
                        Timeframe: 1t &nbsp;|&nbsp; All Markets
                    </div>
                </div>
            </div>

            {/* Price tag */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                margin: '0.4rem 0 0.75rem',
                padding: '0.5rem 0.85rem',
                background: 'rgba(168,85,247,0.12)',
                border: '1px solid rgba(168,85,247,0.3)',
                borderRadius: '8px',
                position: 'relative',
                zIndex: 2,
            }}>
                <span style={{ fontSize: '1.1rem' }}>💵</span>
                <span style={{
                    fontWeight: 800,
                    fontSize: '1.15rem',
                    color: '#d8b4fe',
                    letterSpacing: '0.3px',
                }}>
                    $1,000
                </span>
                <span style={{
                    fontSize: '0.78rem',
                    color: 'rgba(221,180,255,0.6)',
                    fontWeight: 500,
                }}>
                    / Ksh 129,000
                </span>
                <span style={{
                    marginLeft: 'auto',
                    fontSize: '0.68rem',
                    background: 'rgba(168,85,247,0.25)',
                    color: '#c084fc',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                }}>
                    ONE-TIME
                </span>
            </div>

            {/* Description */}
            <div className='dbot-gold-card__description' style={{ color: 'rgba(221,180,255,0.7)' }}>
                Next-generation AI trading engine using deep neural pattern recognition, adaptive volatility
                intelligence and multi-market correlation to deliver elite-level automated trade execution.
            </div>

            {/* Win Rate */}
            <div className='dbot-gold-card__stats' style={{ position: 'relative', zIndex: 2, marginBottom: '1.1rem' }}>
                <div className='dbot-gold-card__stat-label' style={{ color: 'rgba(221,180,255,0.65)' }}>
                    <span>Win Rate</span>
                    <span style={{ color: '#c084fc', fontSize: '0.9rem', fontWeight: 800 }}>96%</span>
                </div>
                <div style={{
                    height: '6px',
                    background: 'rgba(168,85,247,0.12)',
                    border: '1px solid rgba(168,85,247,0.2)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        width: '96%',
                        height: '100%',
                        background: 'linear-gradient(90deg, #6d28d9, #a855f7, #c084fc)',
                        borderRadius: '3px',
                        position: 'relative',
                        animation: 'meter-fill-in 1s cubic-bezier(0.4,0,0.2,1) both',
                    }}>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                            animation: 'card-shimmer 1.6s ease-in-out infinite',
                        }} />
                    </div>
                </div>
            </div>

            {/* Purchase Button */}
            <a
                href={WHATSAPP_LINK}
                target='_blank'
                rel='noopener noreferrer'
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '0.95rem 1.2rem',
                    background: hovered
                        ? 'linear-gradient(135deg, rgba(168,85,247,0.55), rgba(109,40,217,0.4))'
                        : 'linear-gradient(135deg, rgba(168,85,247,0.22), rgba(109,40,217,0.1))',
                    border: `1.5px solid ${hovered ? 'rgba(192,132,252,0.95)' : 'rgba(168,85,247,0.65)'}`,
                    borderRadius: '10px',
                    color: '#e9d5ff',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    letterSpacing: '0.7px',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    position: 'relative',
                    zIndex: 3,
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: hovered
                        ? '0 0 28px rgba(168,85,247,0.7), 0 4px 20px rgba(0,0,0,0.4)'
                        : '0 0 12px rgba(168,85,247,0.35)',
                    textTransform: 'uppercase',
                    transform: hovered ? 'scale(1.02)' : 'scale(1)',
                }}
            >
                <span style={{ fontSize: '1.1rem' }}>💬</span>
                <span>Purchase Bot</span>
                <span style={{ fontSize: '1rem', opacity: 0.8 }}>→</span>
            </a>

            {/* Shine sweep */}
            <div className='dbot-gold-card__shine' style={{
                background: 'linear-gradient(105deg, transparent 30%, rgba(168,85,247,0.14) 50%, transparent 70%)',
            }} />
        </div>
    );
};

const DashboardBotList = observer(() => {
    const { load_modal } = useDBotStore();
    const { ui } = useStore();
    const { is_mobile } = ui;
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isHoveringTitle, setIsHoveringTitle] = useState(false);

    useEffect(() => {
        const loadStrategies = async () => {
            setIsLoading(true);
            const strategies = await getSavedWorkspaces();
            load_modal.setDashboardStrategies(strategies);
            setTimeout(() => setIsLoading(false), 800);
        };
        loadStrategies();
    }, []);

    const filteredBots = load_modal.dashboard_strategies?.filter((bot: any) =>
        bot.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.dashboard}>
            <div className={styles.cyberBackground}>
                <div className={styles.gridLines}></div>
                <div className={styles.hexagonPattern}></div>
                <div className={styles.pulseOrbs}>
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className={styles.pulseOrb}
                            style={{
                                '--size': `${Math.random() * 100 + 50}px`,
                                '--x': `${Math.random() * 100}%`,
                                '--y': `${Math.random() * 100}%`,
                                '--delay': `${Math.random() * 5}s`,
                                '--duration': `${Math.random() * 15 + 10}s`
                            } as React.CSSProperties}
                        />
                    ))}
                </div>
                <div className={styles.scanLine}></div>
            </div>

            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.searchContainer}>
                        <div className={styles.searchInputWrapper}>
                            <Icon icon="IcSearch" className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search premium bots..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                                autoComplete="off"
                            />
                            {searchTerm && (
                                <button
                                    className={styles.clearSearch}
                                    onClick={() => setSearchTerm('')}
                                >
                                    <Icon icon="IcCloseCircle" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.content}>
                    {/* ✅ Apex AI 2026 — always shown at the top, hidden when searching */}
                    {!searchTerm && <ApexAICard />}

                    {isLoading ? (
                        <div className={styles.loader}>
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className={styles.skeletonCard}>
                                    <div className={styles.skeletonImage} />
                                    <div className={styles.skeletonText} />
                                    <div className={styles.skeletonTextSm} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {filteredBots?.length > 0 ? (
                                <div className={styles.grid}>
                                    {filteredBots.map((workspace: any, index: number) => (
                                        <RecentWorkspace
                                            key={workspace.id}
                                            workspace={workspace}
                                            index={index}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.empty}>
                                    <div className={styles.emptyIcon}>
                                        <Icon icon="IcBox" size={is_mobile ? 48 : 64} />
                                    </div>
                                    <Text as="h3" weight="bold" align="center" className={styles.emptyTitle}>
                                        <Localize i18n_default_text="No bots found" />
                                    </Text>
                                    <Text as="p" size="xs" align="center" className={styles.emptyText}>
                                        {searchTerm ? (
                                            <Localize i18n_default_text="Try a different search term" />
                                        ) : (
                                            <Localize i18n_default_text="Create your first bot to get started" />
                                        )}
                                    </Text>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

export default DashboardBotList;