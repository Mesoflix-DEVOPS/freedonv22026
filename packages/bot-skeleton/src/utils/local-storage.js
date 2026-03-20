import LZString from 'lz-string';
import localForage from 'localforage';
import DBotStore from '../scratch/dbot-store';
import { save_types } from '../constants/save-type';

// Import bots from master folder
import AutoC4Volt from './master/AUTO C4 VOLT 🇬🇧 2 🇬🇧 AI PREMIUM ROBOT 💯.xml';
import EvenAutoBotV2 from './master/EVEN AUTO BOT💹 V2.0.xml';
import OddAutoBotV3 from './master/ODD_ AUTO BOT 💹V3.0.xml';
import TheBinotek5 from './master/THE BINOTEK 5 - 2025🥇.xml';
import RiseFallApex from './master/💰📊 Rise _ Fall Apex AI Bot 🤖💹.xml';

import BRAMSPEEDBOT from './buru/BRAMSPEEDBOT.xml';
import EvenOddAutoSwitcher from './buru/EvenOddAutoSwitcher.xml';
import VxAutoSwitcher from './buru/Vx.xml';
import EvenOddSmoothKiller from './mentor/EVEN&ODDsmoothKILLER.xml';
import MoneyGramV2 from './mentor/MoneyGRAMV2XRAYAUTO.xml';
import MoneyGramV1 from './mentor/MoneyGramV1AUTO.xml';
import PipspeedTrader from './mentor/PipspeedDollarOVERTRADER.xml';
import RiseFallBot from './mentor/RiseandfallBOT.xml';
import EvenOddTrendBot from './muley/EvenOddTrendBot.xml';
import OverUnderSwitcherBot from './muley/OverUnderSwitcherBot.xml';
import RiseFallswitcherBot from './muley/RiseFallswitcherBot.xml';
import STATESDigitSwitcher from './muley/STATESDigitSwitcher.xml.xml';
import PercentageEvenOddBot from './muley/percentageEvenOddBot.xml';


// Ensure Blockly is available globally
const getBlockly = () => {
    if (typeof window !== 'undefined' && window.Blockly) {
        return window.Blockly;
    }
    throw new Error('Blockly not available - workspace not initialized');
};

// Static bot configurations - Master bots
const STATIC_BOTS = {
    auto_c4_volt: {
        id: 'auto_c4_volt',
        name: 'AUTO C4 VOLT AI PREMIUM',
        xml: AutoC4Volt,
        timestamp: Date.now(),
        save_type: save_types.LOCAL,
    },
    even_auto_bot_v2: {
        id: 'even_auto_bot_v2',
        name: 'EVEN AUTO BOT V2.0',
        xml: EvenAutoBotV2,
        timestamp: Date.now(),
        save_type: save_types.LOCAL,
    },
    odd_auto_bot_v3: {
        id: 'odd_auto_bot_v3',
        name: 'ODD AUTO BOT V3.0',
        xml: OddAutoBotV3,
        timestamp: Date.now(),
        save_type: save_types.LOCAL,
    },
    the_binotek_5: {
        id: 'the_binotek_5',
        name: 'THE BINOTEK 5 - 2025',
        xml: TheBinotek5,
        timestamp: Date.now(),
        save_type: save_types.LOCAL,
    },
    rise_fall_apex: {
        id: 'rise_fall_apex',
        name: 'Rise & Fall Apex AI',
        xml: RiseFallApex,
        timestamp: Date.now(),
        save_type: save_types.LOCAL,
    },
};

const getStaticBots = () => Object.values(STATIC_BOTS);

/**
 * 🔒 Disable saving bots
 */
export const saveWorkspaceToRecent = async () => {
    console.warn('[INFO] Saving disabled → Using static bots only.');
    const {
        load_modal: { updateListStrategies },
    } = DBotStore.instance;
    updateListStrategies(getStaticBots());
};

/**
 * ✅ Always return static bots
 */
export const getSavedWorkspaces = async () => {
    const bots = getStaticBots();
    console.log(
        '[DEBUG] Available static bots:',
        bots.map(bot => bot.id)
    );
    return bots;
};

/**
 * Load a bot by ID (from static list only)
 */
export const loadStrategy = async strategy_id => {
    console.log(`[DEBUG] Attempting to load bot: ${strategy_id}`);

    // Check for duplicate IDs
    const staticBots = getStaticBots();
    const duplicateIds = staticBots.filter((bot, index) => staticBots.findIndex(b => b.id === bot.id) !== index);

    if (duplicateIds.length > 0) {
        console.error(
            '[ERROR] Duplicate bot IDs found:',
            duplicateIds.map(b => b.id)
        );
    }

    const strategy = staticBots.find(bot => bot.id === strategy_id);

    if (!strategy) {
        console.error(
            `[ERROR] Bot with id "${strategy_id}" not found. Available bots:`,
            staticBots.map(b => b.id)
        );
        return false;
    }

    try {
        // Check if workspace is initialized
        if (!Blockly.derivWorkspace) {
            console.error('[ERROR] Blockly workspace not initialized');
            return false;
        }

        // Clear existing workspace first
        console.log('[DEBUG] Clearing existing workspace');
        Blockly.derivWorkspace.clear();

        const parser = new DOMParser();
        const xmlDom = parser.parseFromString(strategy.xml, 'text/xml').documentElement;

        // Check if XML is valid
        if (xmlDom.querySelector('parsererror')) {
            console.error('[ERROR] Invalid XML content for bot:', strategy_id);
            return false;
        }

        const convertedXml = convertStrategyToIsDbot(xmlDom);

        Blockly.Xml.domToWorkspace(convertedXml, Blockly.derivWorkspace);
        Blockly.derivWorkspace.current_strategy_id = strategy_id;

        console.log(`[SUCCESS] Loaded static bot: ${strategy.name} (ID: ${strategy_id})`);
        return true;
    } catch (error) {
        console.error('Error loading static bot:', error);
        return false;
    }
};

/**
 * 🔒 Disable removing bots
 */
export const removeExistingWorkspace = async () => {
    console.warn('[INFO] Remove disabled → Static bots only.');
    return false;
};

/**
 * Ensure xml has `is_dbot` flag
 */
export const convertStrategyToIsDbot = xml_dom => {
    if (!xml_dom) return;
    xml_dom.setAttribute('is_dbot', 'true');
    return xml_dom;
};

// 🧹 Clear storage & recents at startup
localStorage.removeItem('saved_workspaces');
localStorage.removeItem('recent_strategies');
console.log('[INFO] Cleared saved/recent bots → Static bots only.');