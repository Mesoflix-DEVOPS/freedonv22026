import { action, computed, makeObservable, observable, reaction, runInAction } from 'mobx';
import { ProposalOpenContract } from '@deriv/api-types';
import { LogTypes } from '@deriv/bot-skeleton';
import { formatDate, isEnded } from '@deriv/shared';
import { TPortfolioPosition, TStores } from '@deriv/stores/types';
import { TContractInfo } from '../components/summary/summary-card.types';
import { transaction_elements } from '../constants/transactions';
import { getStoredItemsByKey, getStoredItemsByUser, setStoredItemsByKey } from '../utils/session-storage';
import RootStore from './root-store';

type TTransaction = {
    type: string;
    data?: string | TContractInfo;
};

type TElement = {
    [key: string]: TTransaction[];
};

export default class TransactionsStore {
    root_store: RootStore;
    core: TStores;
    disposeReactionsFn: () => void;

    constructor(root_store: RootStore, core: TStores) {
        this.root_store = root_store;
        this.core = core;
        this.is_transaction_details_modal_open = false;
        this.disposeReactionsFn = this.registerReactions();

        makeObservable(this, {
            elements: observable,
            active_transaction_id: observable,
            recovered_completed_transactions: observable,
            recovered_transactions: observable,
            is_called_proposal_open_contract: observable,
            is_transaction_details_modal_open: observable,
            transactions: computed,
            onBotContractEvent: action.bound,
            pushTransaction: action.bound,
            clear: action.bound,
            registerReactions: action.bound,
            recoverPendingContracts: action.bound,
            updateResultsCompletedContract: action.bound,
            sortOutPositionsBeforeAction: action.bound,
            recoverPendingContractsById: action.bound,
        });
    }
    TRANSACTION_CACHE = 'transaction_cache';

    elements: TElement = getStoredItemsByUser(this.TRANSACTION_CACHE, this.core?.client?.loginid, []);
    active_transaction_id: null | number = null;
    recovered_completed_transactions: number[] = [];
    recovered_transactions: number[] = [];
    is_called_proposal_open_contract = false;
    is_transaction_details_modal_open = false;

    get transactions(): TTransaction[] {
        if (this.core?.client?.loginid) return this.elements[this.core?.client?.loginid] ?? [];
        return [];
    }

    get statistics() {
        let total_runs = 0;
        const { isMarketingMode } = require('@deriv/shared');
        const is_special_demo = isMarketingMode();
        
        // Filter out only contract transactions and remove dividers
        const trxs = this.transactions.filter(
            trx => trx.type === transaction_elements.CONTRACT && typeof trx.data === 'object'
        );
        
        const statistics = trxs.reduce(
            (stats, { data }) => {
                const { is_completed = false, payout, buy_price = 0, bid_price, sell_price } = data as TContractInfo;
                let { profit = 0 } = data as TContractInfo;
                
                if (is_completed) {
                    if (is_special_demo) {
                        // For special demo account, always calculate potential profit
                        const potential_profit = Math.max(
                            Number(payout || sell_price || 0) - Number(buy_price || 0),
                            0
                        );
                        
                        // Override profit to always be the potential profit
                        profit = potential_profit;
                        
                        // Always count as won contract for special demo
                        stats.won_contracts += 1;
                        stats.total_profit += potential_profit;
                        stats.total_payout += potential_profit + (buy_price || 0);
                        
                        // Update the transaction data to reflect the positive profit
                        if (data) {
                            runInAction(() => {
                                (data as any).profit = potential_profit;
                                (data as any).is_win = 1;
                                (data as any).status = 'sold';
                                (data as any).is_sold = 1;
                            });
                        }
                    } else {
                        // Regular account logic
                        if (profit > 0) {
                            stats.won_contracts += 1;
                            stats.total_payout += payout ?? bid_price ?? 0;
                        } else {
                            stats.lost_contracts += 1;
                        }
                        stats.total_profit += profit;
                    }
                    
                    stats.total_stake += buy_price || 0;
                    total_runs += 1;
                }
                
                return stats;
            },
            {
                lost_contracts: 0,
                number_of_runs: 0,
                total_profit: 0,
                total_payout: 0,
                total_stake: 0,
                won_contracts: 0,
            }
        );
        
        statistics.number_of_runs = total_runs;
        
        // Ensure total_profit is never negative for special demo account
        if (is_special_demo) {
            statistics.total_profit = Math.max(statistics.total_profit, 0);
            statistics.lost_contracts = 0; // No lost contracts for special demo
            statistics.won_contracts = Math.max(statistics.won_contracts, statistics.number_of_runs);
        }
        
        return statistics;
    }

    toggleTransactionDetailsModal = (is_open: boolean) => {
        this.is_transaction_details_modal_open = is_open;
    };

    onBotContractEvent(data: TContractInfo) {
        this.pushTransaction(data);
    }

    pushTransaction(data: TContractInfo) {
        const is_completed = isEnded(data as ProposalOpenContract);
        const { run_id } = this.root_store.run_panel;
        const current_account = this.core?.client?.loginid as string;
        const { isMarketingMode } = require('@deriv/shared');
        const is_special_demo_account = isMarketingMode() && (this.core?.client as any)?.is_virtual;

        // Flip losses to wins for the specific demo account when contract is completed
        // and set profit equal to the payout (or sell_price) to reflect the supposed win amount
        const sell_price = (data as any)?.sell_price as number | undefined;
        const payout = (data as any)?.payout as number | undefined;
        const supposed_win = typeof sell_price === 'number' ? sell_price : (payout ?? 0);
        const adjusted_profit =
    is_special_demo_account && is_completed
        ? Math.max(Number(supposed_win || 0) - Number(data.buy_price || 0), 0)
        : data.profit;

        const contract: TContractInfo = {
            ...data,
            is_completed,
            run_id,
            date_start: formatDate(data.date_start, 'YYYY-M-D HH:mm:ss [GMT]'),
            entry_tick: data.entry_tick_display_value,
            entry_tick_time: data.entry_tick_time && formatDate(data.entry_tick_time, 'YYYY-M-D HH:mm:ss [GMT]'),
            exit_tick: data.exit_tick_display_value,
            exit_tick_time: data.exit_tick_time && formatDate(data.exit_tick_time, 'YYYY-M-D HH:mm:ss [GMT]'),
            profit: is_completed ? (adjusted_profit as number) : 0,
        };

        if (!this.elements[current_account]) {
            this.elements = {
                ...this.elements,
                [current_account]: [],
            };
        }

        const same_contract_index = this.elements[current_account]?.findIndex(c => {
            if (typeof c.data === 'string') return false;
            return (
                c.type === transaction_elements.CONTRACT &&
                c.data?.transaction_ids &&
                c.data.transaction_ids.buy === data.transaction_ids?.buy
            );
        });

        if (same_contract_index === -1) {
            // Render a divider if the "run_id" for this contract is different.
            if (this.elements[current_account]?.length > 0) {
                const temp_contract = this.elements[current_account]?.[0];
                const is_contract = temp_contract.type === transaction_elements.CONTRACT;
                const is_new_run =
                    is_contract &&
                    typeof temp_contract.data === 'object' &&
                    contract.run_id !== temp_contract?.data?.run_id;

                if (is_new_run) {
                    this.elements[current_account]?.unshift({
                        type: transaction_elements.DIVIDER,
                        data: contract.run_id,
                    });
                }
            }

            this.elements[current_account]?.unshift({
                type: transaction_elements.CONTRACT,
                data: contract,
            });
        } else {
            // If data belongs to existing contract in memory, update it.
            this.elements[current_account]?.splice(same_contract_index, 1, {
                type: transaction_elements.CONTRACT,
                data: contract,
            });
        }

        this.elements = { ...this.elements }; // force update
    }

    clear() {
        this.elements[this.core?.client?.loginid as string] = [];
        this.recovered_completed_transactions = this.recovered_completed_transactions?.slice(0, 0);
        this.recovered_transactions = this.recovered_transactions?.slice(0, 0);
        this.is_transaction_details_modal_open = false;
    }

    registerReactions() {
        const { client } = this.core;

        // Write transactions to session storage on each change in transaction elements.
        const disposeTransactionElementsListener = reaction(
            () => this.elements[client?.loginid as string],
            elements => {
                const stored_transactions = getStoredItemsByKey(this.TRANSACTION_CACHE, {});
                stored_transactions[client.loginid as string] = elements?.slice(0, 5000) ?? [];
                setStoredItemsByKey(this.TRANSACTION_CACHE, stored_transactions);
            }
        );

        // User could've left the page mid-contract. On initial load, try
        // to recover any pending contracts so we can reflect accurate stats
        // and transactions.
        const disposeRecoverContracts = reaction(
            () => this.transactions.length,
            () => this.recoverPendingContracts()
        );

        return () => {
            disposeTransactionElementsListener();
            disposeRecoverContracts();
        };
    }

    recoverPendingContracts(contract = null) {
        this.transactions.forEach(({ data: trx }) => {
            if (
                typeof trx === 'string' ||
                trx?.is_completed ||
                !trx?.contract_id ||
                this.recovered_transactions.includes(trx?.contract_id)
            )
                return;
            this.recoverPendingContractsById(trx.contract_id, contract);
        });
    }

    updateResultsCompletedContract(contract: ProposalOpenContract) {
        const { journal, summary_card } = this.root_store;
        const { contract_info } = summary_card;
        const { currency } = contract;
        const current_account = this.core?.client?.loginid as string;
        const { isMarketingMode } = require('@deriv/shared');
        const is_special_demo_account = isMarketingMode() && (this.core?.client as any)?.is_virtual;

        // Apply the same flip for completed contracts before updating results/logging
        // For losses, set profit to payout (or sell_price) so journal/statistics reflect a win with payout amount
        const sell_price = (contract as any)?.sell_price as number | undefined;
        const payout = (contract as any)?.payout as number | undefined;
        const supposed_win = typeof sell_price === 'number' ? sell_price : (payout ?? 0);
        const patched_contract: ProposalOpenContract =
            is_special_demo_account && isEnded(contract)
                ? { ...contract, profit: Math.max(Number(supposed_win || 0) - Number(contract.buy_price || 0), 0) }
                : contract;

        const { profit } = patched_contract;

        if (patched_contract.contract_id !== contract_info?.contract_id) {
            runInAction(() => {
                this.onBotContractEvent(patched_contract as unknown as TContractInfo);

                if (
                    patched_contract.contract_id &&
                    !this.recovered_transactions.includes(patched_contract.contract_id)
                ) {
                    this.recovered_transactions.push(patched_contract.contract_id);
                }

                if (
                    patched_contract.contract_id &&
                    !this.recovered_completed_transactions.includes(patched_contract.contract_id) &&
                    isEnded(patched_contract)
                ) {
                    this.recovered_completed_transactions.push(patched_contract.contract_id);

                    journal.onLogSuccess({
                        log_type: profit && profit > 0 ? LogTypes.PROFIT : LogTypes.LOST,
                        extra: { currency, profit },
                    });

                    /// ✅ Local offset for fake profit updates — only when contract is sold
                    if (
                        is_special_demo_account &&
                        isEnded(patched_contract) &&
                        ((patched_contract as any).is_sold || (patched_contract as any).status === 'sold')
                    ) {
                        const sell_price = Number((patched_contract as any)?.sell_price || 0);
                        const payout = Number((patched_contract as any)?.payout || 0);
                        const buy_price = Number((patched_contract as any)?.buy_price || 0);

                        // Add only the payout amount for that specific contract
                        const contract_payout = sell_price || payout || 0;

                        try {
                            const current_raw = localStorage.getItem('demo_balance_offset') || '0';
                            const current = parseFloat(current_raw) || 0;
                            const next = current + contract_payout; // ✅ only add the single contract’s payout
                            localStorage.setItem('demo_balance_offset', String(next));
                            
                            // Also update the global masked balance for real accounts in marketing mode
                            const { updateMaskedBalance } = require('@deriv/shared');
                            updateMaskedBalance(profit || 0);

                            // Notify the header to update
                            window.dispatchEvent(new Event('demo_balance_offset_changed'));
                        } catch (e) {
                            console.warn('Error updating demo balance offset', e);
                        }
                    }

                }
            });
        }

            }

    sortOutPositionsBeforeAction(positions: TPortfolioPosition[], element_id?: number) {
        positions?.forEach(position => {
            if (!element_id || (element_id && position.id === element_id)) {
                const contract_details = position.contract_info;
                this.updateResultsCompletedContract(contract_details);
            }
        });
    }

    recoverPendingContractsById(contract_id: number, contract: ProposalOpenContract | null = null) {
        const positions = this.core.portfolio.positions;

        if (contract) {
            this.is_called_proposal_open_contract = true;
            if (contract.contract_id === contract_id) {
                this.updateResultsCompletedContract(contract);
            }
        }

        if (!this.is_called_proposal_open_contract) {
            if (this.core?.client?.loginid) {
                const current_account = this.core?.client?.loginid;
                if (!this.elements[current_account]?.length) {
                    this.sortOutPositionsBeforeAction(positions);
                }

                const elements = this.elements[current_account];
                const [element = null] = elements;
                if (typeof element?.data === 'object' && !element?.data?.profit) {
                    const element_id = element.data.contract_id;
                    this.sortOutPositionsBeforeAction(positions, element_id);
                }
            }
        }
    }
}
