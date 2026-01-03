// ==========================================
// FILE: elements.js
// ==========================================
// Attached to window to ensure global access across multiple files

window.TILE_SIZE = 40;
window.GRAVITY = 0.5;
window.TERMINAL_VELOCITY = 16;
window.JUMP_FORCE = -11;
window.INTERACTION_RANGE = 5 * window.TILE_SIZE; 
window.DASH_COST = 30; // Stamina cost

window.BLOCKS = {
    AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, WOOD: 4, LEAVES: 5, BRICK: 6,
    SAND: 7, SNOW: 8, COAL_ORE: 9, GOLD_ORE: 10, DIAMOND_ORE: 11,
    TNT: 12, GLASS: 13, PLANK: 14, SPIKE: 15, GOAL: 99,
    WATER: 20, LAVA: 21, ICE: 22, BOUNCE: 23
};

window.ITEMS = { SWORD: 100, WAND: 101, AXE: 102, SPEAR: 103 };

window.BLOCK_DEF = {
    [window.BLOCKS.DIRT]: { color: '#795548' },
    [window.BLOCKS.GRASS]: { color: '#795548', top: '#4CAF50' },
    [window.BLOCKS.STONE]: { color: '#757575', hard: true, maxHp: 4 },
    [window.BLOCKS.WOOD]: { color: '#5D4037', side: '#4E342E' },
    [window.BLOCKS.LEAVES]: { color: '#2E7D32', alpha: 0.9 },
    [window.BLOCKS.BRICK]: { color: '#B71C1C' },
    [window.BLOCKS.SAND]: { color: '#FBC02D' },
    [window.BLOCKS.SNOW]: { color: '#E0F7FA', top: '#FFFFFF' },
    [window.BLOCKS.COAL_ORE]: { color: '#757575', speckle: '#212121', value: 5, hard: true, maxHp: 4 },
    [window.BLOCKS.GOLD_ORE]: { color: '#757575', speckle: '#FFEB3B', value: 20, hard: true, maxHp: 5 },
    [window.BLOCKS.DIAMOND_ORE]: { color: '#757575', speckle: '#00E5FF', value: 50, hard: true, maxHp: 6 },
    [window.BLOCKS.TNT]: { color: '#D32F2F', label: 'TNT' },
    [window.BLOCKS.GLASS]: { color: '#81D4FA', alpha: 0.3 },
    [window.BLOCKS.PLANK]: { color: '#D2B48C', crumble: true }, 
    [window.BLOCKS.SPIKE]: { color: '#9E9E9E', spike: true },
    [window.BLOCKS.WATER]: { color: '#29B6F6', alpha: 0.5, fluid: true },
    [window.BLOCKS.LAVA]: { color: '#FF5722', alpha: 0.85, fluid: true, light: true },
    [window.BLOCKS.ICE]: { color: '#B2EBF2', friction: 0.05 },
    [window.BLOCKS.BOUNCE]: { color: '#3E2723', bounce: 1.6 },
    [window.BLOCKS.GOAL]: { color: '#6A1B9A', speckle: '#FFD700', unbreakable: true }, 
    [window.ITEMS.SWORD]: { icon: '🗡️', type: 'tool', color: '#00BCD4' },
    [window.ITEMS.WAND]: { icon: '🔥', type: 'tool', color: '#FF5722' },
    [window.ITEMS.AXE]: { icon: '🪓', type: 'tool', color: '#8D6E63' },
    [window.ITEMS.SPEAR]: { icon: '🔱', type: 'tool', color: '#FFC107' }
};

window.MOB_TYPES = {
    SLIME:         { color: '#76FF03', width: 30, height: 20, speed: 2, jump: -8, hp: 30, reward: 10, type: 'slime', minLevel: 1 },
    RAT:           { color: '#8D6E63', width: 25, height: 15, speed: 3, jump: -7, hp: 15, reward: 5, type: 'rat', minLevel: 1 },
    ZOMBIE:        { color: '#2E7D32', width: 28, height: 38, speed: 1.5, jump: -10, hp: 50, reward: 20, type: 'zombie', minLevel: 1 },
    BAT:           { color: '#424242', width: 20, height: 20, speed: 3.5, jump: 0, hp: 20, reward: 15, type: 'bat', fly: true, minLevel: 3 },
    SLIME_BLUE:    { color: '#2979FF', width: 35, height: 25, speed: 2.5, jump: -9, hp: 60, reward: 25, type: 'slime', minLevel: 3 },
    SKELETON:      { color: '#E0E0E0', width: 26, height: 38, speed: 2, jump: -10, hp: 45, reward: 30, type: 'zombie', minLevel: 3 },
    GOBLIN:        { color: '#33691E', width: 24, height: 34, speed: 4, jump: -11, hp: 40, reward: 35, type: 'zombie', minLevel: 3 },
    SLIME_RED:     { color: '#FF1744', width: 40, height: 30, speed: 3, jump: -10, hp: 100, reward: 50, type: 'slime', minLevel: 6 },
    ZOMBIE_TANK:   { color: '#1B5E20', width: 35, height: 45, speed: 1, jump: -8, hp: 200, reward: 60, type: 'zombie', minLevel: 6 },
    BAT_VAMPIRE:   { color: '#B71C1C', width: 25, height: 25, speed: 4.5, jump: 0, hp: 70, reward: 50, type: 'bat', fly: true, minLevel: 6 },
    GHOST:         { color: '#B3E5FC', width: 28, height: 38, speed: 1.5, jump: 0, hp: 60, reward: 45, type: 'bat', fly: true, minLevel: 6, alpha: 0.6 },
    GOLEM_STONE:   { color: '#757575', width: 40, height: 50, speed: 1, jump: -12, hp: 300, reward: 100, type: 'zombie', minLevel: 9 },
    SPIRIT_FIRE:   { color: '#FF6D00', width: 20, height: 30, speed: 3, jump: 0, hp: 100, reward: 80, type: 'bat', fly: true, minLevel: 9 },
    GOLEM_IRON:    { color: '#ECEFF1', width: 45, height: 55, speed: 1.2, jump: -13, hp: 400, reward: 150, type: 'zombie', minLevel: 12 },
    
    // Bosses
    BOSS_SLIME:    { color: '#00E676', width: 90, height: 90, speed: 3, jump: -14, hp: 800, reward: 500, type: 'boss', name: "KING SLIME" },
    BOSS_ZOMBIE:   { color: '#D50000', width: 60, height: 100, speed: 4, jump: -12, hp: 1200, reward: 800, type: 'boss', name: "MUTANT ZOMBIE" },
    BOSS_VOID:     { color: '#212121', width: 100, height: 120, speed: 2, jump: -10, hp: 2000, reward: 2000, type: 'boss', name: "VOID LORD" }
};