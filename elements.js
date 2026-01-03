// ==========================================
// FILE: elements.js
// ==========================================

const TILE_SIZE = 40;
const GRAVITY = 0.5;
const TERMINAL_VELOCITY = 15;
const JUMP_FORCE = -11;
const INTERACTION_RANGE = 5 * TILE_SIZE; 

const BLOCKS = {
    AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, WOOD: 4, LEAVES: 5, BRICK: 6,
    SAND: 7, SNOW: 8, COAL_ORE: 9, GOLD_ORE: 10, DIAMOND_ORE: 11,
    TNT: 12, GLASS: 13, PLANK: 14, SPIKE: 15, GOAL: 99,
    WATER: 20, LAVA: 21, ICE: 22, BOUNCE: 23
};

const ITEMS = { SWORD: 100, WAND: 101, AXE: 102, SPEAR: 103 };

const BLOCK_DEF = {
    [BLOCKS.DIRT]: { color: '#5d4037' },
    [BLOCKS.GRASS]: { color: '#5d4037', top: '#4caf50' },
    [BLOCKS.STONE]: { color: '#757575', hard: true, maxHp: 3 },
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
    [BLOCKS.PLANK]: { color: '#D2B48C', crumble: true }, 
    [BLOCKS.SPIKE]: { color: '#9E9E9E', spike: true },
    [BLOCKS.WATER]: { color: '#29B6F6', alpha: 0.5, fluid: true },
    [BLOCKS.LAVA]: { color: '#FF5722', alpha: 0.8, fluid: true, light: true },
    [BLOCKS.ICE]: { color: '#B2EBF2', friction: 0.05 },
    [BLOCKS.BOUNCE]: { color: '#3E2723', bounce: 1.5 },
    [BLOCKS.GOAL]: { color: '#6a1b9a', speckle: '#FFD700', unbreakable: true }, 
    [ITEMS.SWORD]: { icon: '🗡️', type: 'tool', color: '#00bcd4' },
    [ITEMS.WAND]: { icon: '🔥', type: 'tool', color: '#FF5722' },
    [ITEMS.AXE]: { icon: '🪓', type: 'tool', color: '#8D6E63' },
    [ITEMS.SPEAR]: { icon: '🔱', type: 'tool', color: '#FFC107' }
};

// Expanded Mobs List (20+ types)
const MOB_TYPES = {
    // Level 1+
    SLIME:         { color: '#76ff03', width: 30, height: 20, speed: 2, jump: -8, hp: 30, reward: 10, type: 'slime', minLevel: 1 },
    RAT:           { color: '#8D6E63', width: 25, height: 15, speed: 3, jump: -7, hp: 15, reward: 5, type: 'rat', minLevel: 1 },
    SNAIL:         { color: '#FFAB91', width: 20, height: 20, speed: 0.5, jump: -2, hp: 20, reward: 5, type: 'slime', minLevel: 1 },
    ZOMBIE:        { color: '#2e7d32', width: 28, height: 38, speed: 1.5, jump: -10, hp: 50, reward: 20, type: 'zombie', minLevel: 1 },

    // Level 3+
    BAT:           { color: '#424242', width: 20, height: 20, speed: 3, jump: 0, hp: 20, reward: 15, type: 'bat', fly: true, minLevel: 3 },
    SLIME_BLUE:    { color: '#2979FF', width: 35, height: 25, speed: 2.5, jump: -9, hp: 50, reward: 20, type: 'slime', minLevel: 3 },
    SKELETON:      { color: '#E0E0E0', width: 26, height: 38, speed: 2, jump: -10, hp: 40, reward: 25, type: 'zombie', minLevel: 3 },
    GOBLIN:        { color: '#33691E', width: 24, height: 34, speed: 3.5, jump: -11, hp: 45, reward: 30, type: 'zombie', minLevel: 3 },
    SPIDER:        { color: '#3E2723', width: 35, height: 20, speed: 2.8, jump: -9, hp: 35, reward: 25, type: 'spider', minLevel: 3 },

    // Level 6+
    SLIME_RED:     { color: '#FF1744', width: 40, height: 30, speed: 3, jump: -10, hp: 80, reward: 40, type: 'slime', minLevel: 6 },
    ZOMBIE_TANK:   { color: '#1B5E20', width: 35, height: 45, speed: 1, jump: -8, hp: 150, reward: 50, type: 'zombie', minLevel: 6 },
    BAT_VAMPIRE:   { color: '#B71C1C', width: 25, height: 25, speed: 4, jump: 0, hp: 60, reward: 45, type: 'bat', fly: true, minLevel: 6 },
    GHOST:         { color: '#B3E5FC', width: 28, height: 38, speed: 1.5, jump: 0, hp: 50, reward: 40, type: 'bat', fly: true, minLevel: 6, alpha: 0.6 },
    WOLF:          { color: '#90A4AE', width: 40, height: 25, speed: 4.5, jump: -10, hp: 70, reward: 50, type: 'zombie', minLevel: 6 },

    // Level 9+
    GOLEM_STONE:   { color: '#757575', width: 40, height: 50, speed: 1, jump: -12, hp: 200, reward: 80, type: 'zombie', minLevel: 9 },
    SPIRIT_FIRE:   { color: '#FF6D00', width: 20, height: 30, speed: 3, jump: 0, hp: 80, reward: 60, type: 'bat', fly: true, minLevel: 9 },
    SKELETON_WARRIOR:{color:'#9E9E9E', width: 28, height: 38, speed: 2.5, jump: -10, hp: 100, reward: 70, type: 'zombie', minLevel: 9 },
    WITCH:         { color: '#7B1FA2', width: 26, height: 40, speed: 2, jump: -8, hp: 90, reward: 90, type: 'zombie', minLevel: 9 },

    // Level 12+
    GOLEM_IRON:    { color: '#ECEFF1', width: 45, height: 55, speed: 1.2, jump: -13, hp: 300, reward: 120, type: 'zombie', minLevel: 12 },
    SPIRIT_SHADOW: { color: '#212121', width: 25, height: 35, speed: 4, jump: 0, hp: 120, reward: 100, type: 'bat', fly: true, minLevel: 12 },
    SLIME_KING_MINI:{color:'#00E676', width: 50, height: 40, speed: 4, jump: -12, hp: 200, reward: 150, type: 'slime', minLevel: 12 },
    DRAGON_WHELP:  { color: '#FF3D00', width: 40, height: 30, speed: 3.5, jump: 0, hp: 150, reward: 200, type: 'bat', fly: true, minLevel: 12 },

    // Bosses
    BOSS_SLIME:    { color: '#00E676', width: 90, height: 90, speed: 3, jump: -14, hp: 600, reward: 500, type: 'boss', name: "KING SLIME" },
    BOSS_ZOMBIE:   { color: '#D50000', width: 60, height: 100, speed: 4, jump: -12, hp: 800, reward: 600, type: 'boss', name: "MUTANT ZOMBIE" },
    BOSS_VOID:     { color: '#212121', width: 100, height: 120, speed: 2, jump: -10, hp: 1200, reward: 1000, type: 'boss', name: "VOID LORD" }
};