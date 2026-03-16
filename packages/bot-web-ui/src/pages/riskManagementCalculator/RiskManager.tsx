import React, { useState, useEffect } from 'react';
import { FaShieldAlt, FaCalculator, FaBook, FaPlus, FaTrash, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import { reaction } from 'mobx';
import { useStore } from '@deriv/stores';
import { useDBotStore } from 'Stores/useDBotStore';
import './risk-manager.scss';

const useTradeActivity = (onTargetMet: (type: 'TP' | 'SL', profit: number) => void) => {
    const stores = useDBotStore();
    const summary_card = stores?.summary_card;

    useEffect(() => {
        if (!summary_card) return;
        const dispose = reaction(
            () => summary_card?.profit_loss,
            (profit: number) => {
                if (profit === undefined || profit === null) return;

                // Logic to check against active plans
                if (profit >= 10) {
                    onTargetMet('TP', profit);
                } else if (profit <= -5) {
                    onTargetMet('SL', profit);
                }
            }
        );
        return () => dispose();
    }, [summary_card, onTargetMet]);
};

const RiskManager: React.FC = observer(() => {
    const { client } = useStore();
    const [activeTab, setActiveTab] = useState<'calculator' | 'journal'>('calculator');
    const [capital, setCapital] = useState('');
    const [isCalculated, setIsCalculated] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [notification, setNotification] = useState<{ type: 'TP' | 'SL'; profit: number } | null>(null);

    // Load plans from local storage
    useEffect(() => {
        try {
            const savedPlans = localStorage.getItem('trading_plans');
            if (savedPlans) setPlans(JSON.parse(savedPlans));
        } catch (e) {
            console.error('Error loading plans:', e);
        }
    }, []);

    // Save plans to local storage
    useEffect(() => {
        localStorage.setItem('trading_plans', JSON.stringify(plans));
    }, [plans]);

    useTradeActivity((type, profit) => {
        setNotification({ type, profit });
        setTimeout(() => setNotification(null), 5000);
    });

    const appendNumber = (num: string) => {
        if (num === '.' && capital.includes('.')) return;
        setCapital(prev => (prev === '0' && num !== '.') ? num : prev + num);
    };

    const deleteLast = () => {
        setCapital(prev => prev.slice(0, -1));
    };

    const calculateRisk = () => {
        if (!capital) return;
        setIsCalculated(true);
    };

    const resetCalculator = () => {
        setCapital('');
        setIsCalculated(false);
    };

    const addPlan = () => {
        const newPlan = {
            id: Date.now(),
            name: `Trading Plan ${plans.length + 1}`,
            capital: Number(capital) || 100,
            target: 10, // 10% TP
            stopLoss: -5, // 5% SL
            status: 'active',
            progress: 0,
            sessions: []
        };
        setPlans([...plans, newPlan]);
        setToast('Plan added to journal');
    };

    const [toast, setToast] = useState<string | null>(null);
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const stakeAmount = isCalculated ? (Number(capital) * 0.1).toFixed(2) : '0.00';
    const takeProfit = isCalculated ? (Number(capital) * 0.1).toFixed(2) : '0.00';
    const stopLoss = isCalculated ? (Number(capital) * 0.1).toFixed(2) : '0.00';

    return (
        <div className="riskManagerContainer">
            <header className="header">
                <h1>Risk Manager</h1>
                <p className="subtitle">Protect your capital with smart calculations</p>
            </header>

            <div className="tabs">
                <div
                    className={`tab ${activeTab === 'calculator' ? 'active' : ''}`}
                    onClick={() => setActiveTab('calculator')}
                >
                    <FaCalculator style={{ marginRight: '8px' }} /> Calculator
                </div>
                <div
                    className={`tab ${activeTab === 'journal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('journal')}
                >
                    <FaBook style={{ marginRight: '8px' }} /> Personal Assistant
                </div>
            </div>

            <main className="content">
                {activeTab === 'calculator' ? (
                    <div className="card calculatorGrid">
                        <div className="inputSection">
                            <div className="display">
                                {capital ? `$${capital}` : '$0'}
                            </div>
                            <div className="keypad">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(k => (
                                    <button
                                        key={k}
                                        className={`key ${k === '⌫' ? 'delete' : ''}`}
                                        onClick={() => k === '⌫' ? deleteLast() : appendNumber(k)}
                                    >
                                        {k}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                                <button
                                    onClick={calculateRisk}
                                    style={{ background: '#38bdf8', color: '#fff', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Calculate
                                </button>
                                <button
                                    onClick={resetCalculator}
                                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '16px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        <div className="resultsSection">
                            <h3 style={{ marginBottom: '20px' }}>Strategy Recommendation</h3>
                            <div className="resultsGrid">
                                <div className="resultItem" style={{ background: 'rgba(56, 189, 248, 0.1)', borderLeft: '4px solid #38bdf8' }}>
                                    <span className="label">Safe Stake</span>
                                    <span className="value">${stakeAmount}</span>
                                </div>
                                <div className="resultItem" style={{ background: 'rgba(74, 222, 128, 0.1)', borderLeft: '4px solid #4ade80' }}>
                                    <span className="label">Take Profit Target</span>
                                    <span className="value">${takeProfit}</span>
                                </div>
                                <div className="resultItem" style={{ background: 'rgba(248, 113, 113, 0.1)', borderLeft: '4px solid #f87171' }}>
                                    <span className="label">Stop Loss Limit</span>
                                    <span className="value">${stopLoss}</span>
                                </div>
                                <div className="resultItem" style={{ background: 'rgba(129, 140, 248, 0.1)', borderLeft: '4px solid #818cf8' }}>
                                    <span className="label">Max Martingale</span>
                                    <span className="value">3 Steps</span>
                                </div>
                            </div>

                            <button
                                onClick={addPlan}
                                style={{
                                    marginTop: '24px',
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px dashed rgba(255,255,255,0.2)',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    color: '#94a3b8',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    cursor: 'pointer'
                                }}
                            >
                                <FaPlus /> Add to Trading Journal
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="journalSection">
                        <div className="controls">
                            <h3>Active Trading Plans ({plans.length})</h3>
                            <button
                                onClick={() => setActiveTab('calculator')}
                                style={{ background: '#38bdf8', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                            >
                                <FaPlus size={12} /> New Plan
                            </button>
                        </div>

                        <div className="planGrid">
                            {plans.length === 0 ? (
                                <div style={{ textAlign: 'center', gridColumn: '1/-1', padding: '60px', color: '#94a3b8' }}>
                                    <FaBook size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                                    <p>Your trading journal is empty. Create a plan to start tracking.</p>
                                </div>
                            ) : (
                                plans.map(plan => (
                                    <div key={plan.id} className="planCard">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: '700' }}>{plan.name}</span>
                                            <FaTrash
                                                style={{ cursor: 'pointer', color: '#f87171', opacity: 0.6 }}
                                                onClick={() => setPlans(plans.filter(p => p.id !== plan.id))}
                                            />
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                                            Capital: ${plan.capital} | Goal: +{plan.target}%
                                        </div>
                                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                                            <div style={{ width: `${plan.progress}%`, height: '100%', background: '#38bdf8' }}></div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className="status" style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80' }}>
                                                {plan.status}
                                            </span>
                                            <span style={{ fontSize: '13px', fontWeight: '600' }}>{plan.progress}%</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>

            {notification && (
                <div className="notification">
                    {notification.type === 'TP' ? (
                        <FaCheckCircle color="#4ade80" size={20} />
                    ) : (
                        <FaExclamationTriangle color="#f87171" size={20} />
                    )}
                    <div>
                        <div style={{ fontWeight: '700' }}>{notification.type === 'TP' ? 'Profit Target Met!' : 'Stop Loss Triggered'}</div>
                        <div style={{ fontSize: '13px', opacity: 0.8 }}>Session result: ${notification.profit}</div>
                    </div>
                </div>
            )}

            {toast && (
                <div style={{
                    position: 'fixed',
                    bottom: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '12px 24px',
                    borderRadius: '24px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    zIndex: 2000,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {toast}
                </div>
            )}
        </div>
    );
});

export default RiskManager;
