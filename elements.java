// ==========================================
// FILE: elements.java (JavaScript Content)
// ==========================================

// --- Configuration ---
const TILE_SIZE = 40;
const GRAVITY = 0.5;
const TERMINAL_VELOCITY = 15;
let JUMP_FORCE = -11;
const INTERACTION_RANGE = 5 * TILE_SIZE; 

// --- ID Registry ---
const BLOCKS = {
    AIR: 0, 
    DIRT: 1, // 갈색 (보통)
    GRASS: 2, 
    STONE: 3, // 회색 (단단함)
    WOOD: 4, 
    LEAVES: 5, 
    BRICK: 6,
    SAND: 7, 
    SNOW: 8, 
    COAL_ORE: 9, GOLD_ORE: 10, DIAMOND_ORE: 11,
    TNT: 12, GLASS: 13, 
    PLANK: 14, // 연갈색 (사라짐)
    SPIKE: 15, 
    GOAL: 99,
    WATER: 20, // 흐름
    LAVA: 21,
    ICE: 22, // 미끄러짐
    BOUNCE: 23 // 진한 갈색 (점프)
};

const ITEMS = { SWORD: 100, WAND: 101, AXE: 102, SPEAR: 103 };

const BLOCK_DEF = {
    [BLOCKS.DIRT]: { color: '#5d4037' },
    [BLOCKS.GRASS]: { color: '#5d4037', top: '#4caf50' },
    [BLOCKS.STONE]: { color: '#757575', hard: true, maxHp: 3 }, // 회색: 단단함
    [BLOCKS.WOOD]: { color: '#5d4037', side: '#4e342e' },
    [BLOCKS.LEAVES]: { color: '#2e7d32', alpha: 0.9 },
    [BLOCKS.BRICK]: { color: '#b71c1c' },
    [BLOCKS.SAND]: { color: '#fbc02d' },
    [BLOCKS.SNOW]: { color: '#e0f7fa', top: '#ffffff' },
    [BLOCKS.COAL_ORE]: { color: '#757575', speckle: '#212121', value: 5, hard: true, maxHp: 3 },
    [BLOCKS.GOLD_ORE]: { color: '#757575', speckle: '#ffeb3b', value: 15, hard: true, maxHp: 3 },
    [BLOCKS.DIAMOND_ORE]: { color: '#757575', speckle: '#00bcd4', value: 50, hard: true, maxHp: 3 },
    [BLOCKS.TNT]: { color: '#d32f2f', label: 'TNT' },
    [BLOCKS.GLASS]: { color: '#81d4fa', alpha: 0.4 },
    [BLOCKS.PLANK]: { color: '#D2B48C', crumble: true }, // 연갈색: 무너짐
    [BLOCKS.SPIKE]: { color: '#9E9E9E', spike: true },
    [BLOCKS.WATER]: { color: '#29B6F6', alpha: 0.5, fluid: true },
    [BLOCKS.LAVA]: { color: '#FF5722', alpha: 0.8, fluid: true, light: true },
    [BLOCKS.ICE]: { color: '#B2EBF2', friction: 0.05 }, // 얼음: 미끄러짐
    [BLOCKS.BOUNCE]: { color: '#3E2723', bounce: 1.5 }, // 진한 갈색: 높은 점프
    [BLOCKS.GOAL]: { color: '#6a1b9a', speckle: '#FFD700', unbreakable: true }, 
    
    [ITEMS.SWORD]: { icon: '🗡️', type: 'tool', color: '#00bcd4' },
    [ITEMS.WAND]: { icon: '🔥', type: 'tool', color: '#FF5722' },
    [ITEMS.AXE]: { icon: '🪓', type: 'tool', color: '#8D6E63' },
    [ITEMS.SPEAR]: { icon: '🔱', type: 'tool', color: '#FFC107' }
};

// --- Mobs ---
const MOB_TYPES = {
    SLIME: { color: '#76ff03', width: 30, height: 20, speed: 2, jump: -8, hp: 30, reward: 10, type: 'slime' },
    ZOMBIE: { color: '#2e7d32', width: 28, height: 38, speed: 1.5, jump: -10, hp: 50, reward: 20, type: 'zombie' },
    BAT: { color: '#424242', width: 20, height: 20, speed: 3, jump: 0, hp: 20, reward: 15, type: 'bat', fly: true },
    BOSS_SLIME: { color: '#00E676', width: 90, height: 90, speed: 3, jump: -14, hp: 600, reward: 500, type: 'boss', name: "KING SLIME" },
    BOSS_ZOMBIE: { color: '#D50000', width: 60, height: 100, speed: 4, jump: -12, hp: 800, reward: 600, type: 'boss', name: "MUTANT ZOMBIE" },
    BOSS_VOID: { color: '#212121', width: 100, height: 120, speed: 2, jump: -10, hp: 1200, reward: 1000, type: 'boss', name: "VOID LORD" }
};