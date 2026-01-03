// ==========================================
// FILE: game.js
// ==========================================

let gameState = "MENU"; 
let currentLevel = 1;
let worldWidth = 120;
let worldHeight = 60;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); 
let width, height;

// Arrays
let world = [];
let worldHealth = []; 
let crumbleTimers = []; 
let particles = [];
let mobs = [];
let projectiles = [];
let activeTNTs = []; 
let floatTexts = [];
let weatherParticles = [];

let gameTime = 0; 
let shake = 0;
let damageFlash = 0; 
let weather = "NONE"; 
let activeBoss = null;
let combo = 0;
let comboTimer = 0;

const player = {
    x: 0, y: 0,
    width: 28, height: 38,
    vx: 0, vy: 0,
    grounded: false,
    facingRight: true,
    attackTimer: 0,
    actionTimer: 0,
    dashTimer: 0,
    hp: 100, maxHp: 100,
    stamina: 100, maxStamina: 100,
    gold: 0, speed: 6, damage: 15,
    breath: 100,
    inWater: false,
    invulnerable: 0,
    jumps: 0, spin: 0, 
    eyeState: 'normal', eyeTimer: 0,
    hasWand: false, hasAxe: false, hasSpear: false
};

const camera = { x: 0, y: 0 };

// Assuming window.ITEMS and window.BLOCKS are present from elements.js
let inventory = [
    window.ITEMS.SWORD, window.BLOCKS.DIRT, window.BLOCKS.STONE, window.BLOCKS.WOOD, window.BLOCKS.PLANK, 
    window.BLOCKS.TNT, window.BLOCKS.GLASS, window.BLOCKS.WATER, window.BLOCKS.LAVA, window.BLOCKS.ICE, window.BLOCKS.BOUNCE
];
let selectedBlockIndex = 0;

const keys = {};
const mouse = { x: 0, y: 0, leftDown: false, rightDown: false };
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- Initialization ---

function init() {
    console.log("Game Initializing...");
    resize();
    window.addEventListener('resize', resize);
    
    // Inputs
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        // Slot selection
        if(gameState === "PLAY") {
            const num = parseInt(e.key);
            if (!isNaN(num) && num >= 1 && num <= 9) {
                 if (num <= inventory.length) selectSlot(num - 1);
            }
        }
    });
    
    window.addEventListener('keyup', e => keys[e.code] = false);
    
    canvas.addEventListener('mousemove', e => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        mouse.x = (e.clientX - rect.left);
        mouse.y = (e.clientY - rect.top);
    });
    
    canvas.addEventListener('mousedown', e => {
        if (e.button === 0) mouse.leftDown = true;
        if (e.button === 2) mouse.rightDown = true;
    });
    
    canvas.addEventListener('mouseup', e => {
        if (e.button === 0) mouse.leftDown = false;
        if (e.button === 2) mouse.rightDown = false;
    });

    canvas.addEventListener('contextmenu', e => e.preventDefault());

    setupUI();
    // Start Loop
    requestAnimationFrame(loop);
}

function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    width = canvas.width / dpr;
    height = canvas.height / dpr;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false; 
}

// --- Global Actions (Attached to window explicitly) ---

window.startGame = function() {
    console.log("Start Game Clicked");
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('hud').style.display = 'flex';
    if(audioCtx.state === 'suspended') audioCtx.resume();
    generateLevel(1);
}

window.buyItem = function(type) {
    let cost = 0;
    let name = "";
    if (type === 'heal') { cost = 50; name = "Potion"; }
    if (type === 'damage') { cost = 200; name = "Whetstone"; }
    if (type === 'speed') { cost = 150; name = "Boots"; }
    if (type === 'maxhp') { cost = 300; name = "Armor"; }
    if (type === 'wand') { cost = 500; name = "Fire Wand"; }
    if (type === 'axe') { cost = 400; name = "Battle Axe"; }
    if (type === 'spear') { cost = 450; name = "Trident"; }

    if (player.gold >= cost) {
        if (type === 'wand' && player.hasWand) return; 
        if (type === 'axe' && player.hasAxe) return; 
        if (type === 'spear' && player.hasSpear) return; 

        player.gold -= cost;
        if (type === 'heal') player.hp = Math.min(player.hp + 50, player.maxHp);
        if (type === 'damage') player.damage += 10;
        if (type === 'speed') player.speed += 1;
        if (type === 'maxhp') { player.maxHp += 50; player.hp += 50; }
        if (type === 'wand') { player.hasWand = true; inventory.push(window.ITEMS.WAND); }
        if (type === 'axe') { player.hasAxe = true; inventory.push(window.ITEMS.AXE); }
        if (type === 'spear') { player.hasSpear = true; inventory.push(window.ITEMS.SPEAR); }
        
        setupUI();
        updateHUD();
        spawnToast(`Purchased ${name}!`);
        
        if(type === 'wand' || type === 'axe' || type === 'spear') checkShopItems();
    } else {
        spawnToast("Not enough Gold!", true);
        shake = 5;
    }
};

window.nextLevel = function() {
    currentLevel++;
    generateLevel(currentLevel);
};

window.restartGame = function() {
    player.hp = player.maxHp;
    currentLevel = 1;
    player.gold = 0;
    inventory = [window.ITEMS.SWORD, window.BLOCKS.DIRT, window.BLOCKS.STONE, window.BLOCKS.WOOD, window.BLOCKS.PLANK, window.BLOCKS.TNT, window.BLOCKS.GLASS, window.BLOCKS.WATER, window.BLOCKS.LAVA, window.BLOCKS.ICE, window.BLOCKS.BOUNCE];
    setupUI();
    generateLevel(1);
};

window.saveGame = function() {
    // Basic save example
    const saveData = {
        level: currentLevel,
        gold: player.gold,
        maxHp: player.maxHp,
        speed: player.speed,
        damage: player.damage,
        hasWand: player.hasWand,
        hasAxe: player.hasAxe,
        hasSpear: player.hasSpear
    };
    const blob = new Blob([JSON.stringify(saveData)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "blockhiker-save.json";
    a.click();
    URL.revokeObjectURL(url);
    spawnToast("Game Saved!");
}

window.loadGame = function(input) {
    if (!input.files || !input.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            currentLevel = data.level;
            player.gold = data.gold;
            player.maxHp = data.maxHp;
            player.speed = data.speed;
            player.damage = data.damage;
            player.hasWand = data.hasWand;
            player.hasAxe = data.hasAxe;
            player.hasSpear = data.hasSpear;
            
            // Rebuild Inventory
            inventory = [window.ITEMS.SWORD, window.BLOCKS.DIRT, window.BLOCKS.STONE, window.BLOCKS.WOOD, window.BLOCKS.PLANK, window.BLOCKS.TNT, window.BLOCKS.GLASS, window.BLOCKS.WATER, window.BLOCKS.LAVA, window.BLOCKS.ICE, window.BLOCKS.BOUNCE];
            if(player.hasWand) inventory.push(window.ITEMS.WAND);
            if(player.hasAxe) inventory.push(window.ITEMS.AXE);
            if(player.hasSpear) inventory.push(window.ITEMS.SPEAR);
            
            spawnToast("Game Loaded!");
            generateLevel(currentLevel);
            setupUI();
        } catch(err) {
            spawnToast("Load Failed!", true);
        }
    };
    reader.readAsText(input.files[0]);
}

// --- Level Generation ---

function generateLevel(level) {
    world = [];
    worldHealth = []; 
    crumbleTimers = [];
    particles = [];
    mobs = [];
    projectiles = [];
    weatherParticles = [];
    activeTNTs = [];
    player.vx = 0; player.vy = 0;
    player.breath = 100;
    player.stamina = player.maxStamina;
    activeBoss = null;
    document.getElementById('boss-hud').style.display = 'none';
    
    let wRand = Math.random();
    if (wRand < 0.2) weather = "RAIN";
    else if (wRand < 0.4 && level > 2) weather = "SNOW";
    else weather = "NONE";

    worldWidth = 150 + (level * 10); 
    worldHeight = 60;
    const mobChance = Math.min(0.06, 0.02 + (level * 0.005)); 

    // Heightmap
    const heights = [];
    for (let x = 0; x < worldWidth; x++) {
        let base = Math.sin(x * 0.05) * (5 + level * 2); 
        let detail = Math.sin(x * 0.3) * (2 + level);
        let h = Math.floor(worldHeight / 2 + base + detail);
        if(h < 15) h = 15;
        if(h > worldHeight - 5) h = worldHeight - 5;
        heights.push(h);
    }

    const isBossLevel = level % 3 === 0;
    
    for (let y = 0; y < worldHeight; y++) {
        let row = [];
        let hpRow = [];
        for (let x = 0; x < worldWidth; x++) {
            let h = heights[x];
            let block = window.BLOCKS.AIR;

            if (x < 15) h = Math.floor(worldHeight / 2);
            if (isBossLevel && x > worldWidth - 50) h = Math.floor(worldHeight/2);

            if (y >= h) {
                if (y === h) block = window.BLOCKS.GRASS;
                else if (y > h && y < h + 5) block = window.BLOCKS.DIRT;
                else block = window.BLOCKS.STONE;
                
                if (block === window.BLOCKS.STONE) {
                    let r = Math.random();
                    if (r < 0.04) block = window.BLOCKS.COAL_ORE;
                    else if (r < 0.02) block = window.BLOCKS.GOLD_ORE;
                    else if (r < 0.01) block = window.BLOCKS.DIAMOND_ORE;
                }
            }
            if (y >= worldHeight - 2) block = window.BLOCKS.BRICK;
            if (x === worldWidth - 5 && y === h - 1) block = window.BLOCKS.GOAL;

            row.push(block);
            let def = window.BLOCK_DEF[block];
            hpRow.push(def && def.hard ? def.maxHp : 1);
        }
        world.push(row);
        worldHealth.push(hpRow);
    }

    // Ponds
    let numPonds = Math.floor(Math.random() * 5) + 1; 
    for(let i=0; i<numPonds; i++) {
        let cx = Math.floor(20 + Math.random() * (worldWidth - 40));
        let cy = heights[cx];
        let r = 3 + Math.floor(Math.random() * 4);
        for(let py = cy; py < cy + r; py++) {
            for(let px = cx - r; px < cx + r; px++) {
                 if(px > 0 && px < worldWidth && py < worldHeight-2) {
                      if(world[py][px] !== window.BLOCKS.AIR) world[py][px] = window.BLOCKS.WATER;
                 }
            }
        }
    }

    // Mobs
    let availableMobs = Object.keys(window.MOB_TYPES).filter(k => {
        let m = window.MOB_TYPES[k];
        return m.type !== 'boss' && (!m.minLevel || currentLevel >= m.minLevel);
    });

    for (let x = 20; x < worldWidth - 20; x++) {
        if (isBossLevel && x > worldWidth - 60) continue;
        if (Math.random() < mobChance) {
            let h = heights[x];
            let mobKey = availableMobs[Math.floor(Math.random() * availableMobs.length)];
            let mDef = window.MOB_TYPES[mobKey];
            
            if (!mDef) continue;

            if (!mDef.fly) {
                if (world[h][x] !== window.BLOCKS.AIR) spawnMob(x * window.TILE_SIZE, (h - 2) * window.TILE_SIZE, mobKey);
            } else {
                spawnMob(x * window.TILE_SIZE, (h - 10) * window.TILE_SIZE, mobKey);
            }
        }
    }

    if (isBossLevel) {
        let bx = (worldWidth - 20) * window.TILE_SIZE;
        let bossType = 'BOSS_SLIME';
        if (level >= 6) bossType = 'BOSS_ZOMBIE';
        if (level >= 9) bossType = 'BOSS_VOID';
        
        spawnMob(bx, 100, bossType);
    }

    player.x = 5 * window.TILE_SIZE;
    player.y = (heights[5] - 3) * window.TILE_SIZE; 
    
    gameState = "PLAY";
    document.getElementById('shop-overlay').classList.add('hidden');
    document.getElementById('shop-menu').classList.remove('hidden');
    document.getElementById('death-menu').classList.add('hidden');
    
    checkShopItems();
    updateHUD();
}

function spawnMob(x, y, type) {
    let def = window.MOB_TYPES[type];
    if(!def) return;
    let mob = {
        x: x, y: y,
        vx: 0, vy: 0,
        ...JSON.parse(JSON.stringify(def)),
        maxHp: def.hp,
        hurtTimer: 0,
        grounded: false
    };
    mobs.push(mob);
    
    if (def.type === 'boss') {
        activeBoss = mob;
        document.getElementById('boss-name-text').innerText = def.name;
    }
}

// --- Main Loop ---

function loop() {
    if (gameState === "PLAY") {
        update();
    }
    draw();
    requestAnimationFrame(loop);
}

function update() {
    gameTime++;
    if(shake > 0) shake *= 0.9;
    if(shake < 0.5) shake = 0;
    if(player.invulnerable > 0) player.invulnerable--;
    if(comboTimer > 0) comboTimer--; else combo = 0;
    
    if(combo > 0) {
        document.getElementById('combo-counter').style.display = 'block';
        document.getElementById('combo-num').innerText = 'x' + combo;
    } else {
        document.getElementById('combo-counter').style.display = 'none';
    }

    // Weather Particles
    if (weather === "RAIN") {
        for(let k=0; k<2; k++) weatherParticles.push({x: camera.x + Math.random()*width, y: camera.y - 10, vy: 15 + Math.random()*5, type: 'rain'});
    } else if (weather === "SNOW") {
        if (Math.random() < 0.5) weatherParticles.push({x: camera.x + Math.random()*width, y: camera.y - 10, vy: 2 + Math.random(), vx: Math.random()-0.5, type: 'snow'});
    }

    // Physics Context
    let cx = Math.floor((player.x + player.width/2)/window.TILE_SIZE);
    let cy = Math.floor((player.y + player.height/2)/window.TILE_SIZE);
    let blockAtFeet = getBlock(cx, cy);
    let blockBelow = getBlock(cx, Math.floor((player.y + player.height + 2)/window.TILE_SIZE));
    
    player.inWater = (blockAtFeet === window.BLOCKS.WATER);
    let inLava = (blockAtFeet === window.BLOCKS.LAVA);
    let onIce = (blockBelow === window.BLOCKS.ICE);
    let onBounce = (blockBelow === window.BLOCKS.BOUNCE);
    let onPlank = (blockBelow === window.BLOCKS.PLANK);

    // Movement
    let moveSpeed = player.speed;
    let friction = 0.8; 
    if (onIce) friction = 0.98;
    if (player.inWater) { moveSpeed *= 0.6; friction = 0.85; }
    if (inLava) { moveSpeed *= 0.3; friction = 0.6; }

    // Input Handling
    if (keys['KeyA'] || keys['ArrowLeft']) { 
        player.vx -= moveSpeed * 0.15; 
        player.facingRight = false; 
    } else if (keys['KeyD'] || keys['ArrowRight']) { 
        player.vx += moveSpeed * 0.15; 
        player.facingRight = true; 
    } else {
        player.vx *= friction;
    }

    // Dash
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
        if (player.stamina > window.DASH_COST && player.dashTimer <= 0) {
            player.vx = player.facingRight ? 20 : -20;
            player.stamina -= window.DASH_COST;
            player.dashTimer = 30;
            player.invulnerable = 10;
            spawnParticles(player.x + player.width/2, player.y + player.height/2, '#00E5FF', 8);
            shake = 3;
        }
    }
    if (player.dashTimer > 0) player.dashTimer--;
    
    // Stamina Regen
    if (player.stamina < player.maxStamina) player.stamina += 0.5;

    // Jump
    if (keys['Space'] || keys['ArrowUp'] || keys['KeyW']) {
        if (player.inWater) {
             player.vy = -3;
        } else if (player.grounded) {
            let jumpPower = window.JUMP_FORCE;
            if (onBounce) jumpPower *= 1.6; 
            player.vy = jumpPower;
            player.grounded = false;
            player.jumps = 1;
            spawnParticles(player.x + player.width/2, player.y + player.height, '#fff', 3);
        }
    }

    // Plank Logic
    if (onPlank && player.grounded) {
        let tx = Math.floor((player.x + player.width/2)/window.TILE_SIZE);
        let ty = Math.floor((player.y + player.height + 2)/window.TILE_SIZE);
        let exists = crumbleTimers.find(c => c.x === tx && c.y === ty);
        if (!exists) crumbleTimers.push({x: tx, y: ty, time: 25}); 
    }
    
    // Process Crumbles
    for (let i = crumbleTimers.length - 1; i >= 0; i--) {
        let c = crumbleTimers[i];
        c.time--;
        if (c.time <= 0) {
            setBlock(c.x, c.y, window.BLOCKS.AIR);
            spawnParticles(c.x * window.TILE_SIZE + window.TILE_SIZE/2, c.y * window.TILE_SIZE + window.TILE_SIZE/2, '#D2B48C', 5);
            crumbleTimers.splice(i, 1);
        }
    }

    // Gravity & Env Damage
    if (player.inWater) {
         player.vy += 0.2;
         if(player.vy > 4) player.vy = 4;
         player.breath -= 0.4;
         if(player.breath <= 0 && gameTime % 30 === 0) takeDamage(5);
    } else {
         player.vy += window.GRAVITY;
         player.breath = Math.min(player.breath + 0.8, 100);
    }
    
    if (inLava && gameTime % 20 === 0) takeDamage(10);

    // Velocity Clamping
    if (player.vy > window.TERMINAL_VELOCITY) player.vy = window.TERMINAL_VELOCITY;
    if (player.attackTimer > 0) player.attackTimer--;
    if (player.actionTimer > 0) player.actionTimer--;

    // Collision & Integration
    player.x += player.vx;
    checkEntityCollision(player, 'x');
    player.y += player.vy;
    player.grounded = false;
    checkEntityCollision(player, 'y');
    
    if (player.grounded) {
         player.jumps = 0; 
         player.spin = 0;
    }

    if (player.spin > 0) player.spin -= 20;

    // Interaction
    if (gameState === "PLAY") {
        if (mouse.leftDown) handleInteraction(0);
        if (mouse.rightDown) handleInteraction(2);
    }

    // Check Goal
    let px = Math.floor((player.x + player.width/2) / window.TILE_SIZE);
    let py = Math.floor((player.y + player.height/2) / window.TILE_SIZE);
    if (getBlock(px, py) === window.BLOCKS.GOAL) completeLevel();

    // Death Checks
    if (player.y > worldHeight * window.TILE_SIZE + 200) die();
    if (player.hp <= 0) die();

    // Smart Camera
    let lookAhead = player.facingRight ? 100 : -100;
    let targetCamX = player.x + player.width / 2 - width / 2 + lookAhead;
    let targetCamY = player.y + player.height / 2 - height / 2;
    // Clamp
    targetCamX = Math.max(-200, Math.min(targetCamX, worldWidth * window.TILE_SIZE - width + 200));
    
    camera.x += (targetCamX - camera.x) * 0.08;
    camera.y += (targetCamY - camera.y) * 0.1;

    updateEntities();
    updateHUD(); 
}

// --- Entities & Logic ---

function updateEntities() {
    // TNT
    for (let i = activeTNTs.length - 1; i >= 0; i--) {
        let tnt = activeTNTs[i];
        tnt.timer--;
        if (tnt.timer % 10 === 0) tnt.flash = !tnt.flash;
        if (tnt.timer <= 0) {
            explode(tnt.x, tnt.y, 4, true); 
            activeTNTs.splice(i, 1);
        }
    }

    // Boss HUD
    if (activeBoss) {
        let dist = Math.abs(player.x - activeBoss.x);
        let hud = document.getElementById('boss-hud');
        if (dist < 1000 && activeBoss.hp > 0) {
            hud.style.display = 'block';
            let pct = (activeBoss.hp / activeBoss.maxHp) * 100;
            document.getElementById('boss-hp-bar').style.width = pct + '%';
        } else {
            hud.style.display = 'none';
        }
    }

    // Mobs
    for (let i = mobs.length - 1; i >= 0; i--) {
        let m = mobs[i];
        let dist = player.x - m.x;
        let range = 700;
        let mCx = Math.floor((m.x + m.width/2) / window.TILE_SIZE);
        let mCy = Math.floor((m.y + m.height/2) / window.TILE_SIZE);
        let mBlock = getBlock(mCx, mCy);
        
        let speedMult = 1.0;
        if (mBlock === window.BLOCKS.WATER) { speedMult = 0.5; m.vy = Math.min(m.vy, 2); } 
        else if (mBlock === window.BLOCKS.LAVA) {
            speedMult = 0.1;
            if (gameTime % 30 === 0) { m.hp -= 10; m.hurtTimer = 10; spawnParticles(m.x+m.width/2, m.y+m.height/2, '#ff0000', 2); }
        }

        // AI
        if (Math.abs(dist) < range) {
            if(m.type === 'bat') {
                let distY = player.y - m.y;
                m.vx = (dist > 0 ? 1 : -1) * m.speed;
                m.vy = (distY > 0 ? 1 : -1) * 1.5;
            } else if (m.type === 'boss') {
                if (dist > 10) m.vx = m.speed * speedMult;
                else if (dist < -10) m.vx = -m.speed * speedMult;
                if (m.grounded && Math.random() < 0.02) { m.vy = m.jump; shake = 5; }
            } else {
                if (dist > 10) m.vx = m.speed * speedMult;
                else if (dist < -10) m.vx = -m.speed * speedMult;
                if (m.vx !== 0 && isBlocked(m) && m.grounded) m.vy = m.jump;
            }
            
            // Collision with Player
            if (checkRectOverlap(player, m)) {
                if (gameTime % 30 === 0) {
                    let dmg = 10 + currentLevel;
                    if (m.type === 'boss') dmg = 25 + currentLevel * 2;
                    takeDamage(dmg);
                    player.vx = (player.x < m.x ? -10 : 10);
                    player.vy = -6;
                }
            }
        } else {
            if(!m.fly) m.vx *= 0.9;
        }

        if(!m.fly) {
            if (mBlock === window.BLOCKS.WATER) m.vy += 0.1;
            else m.vy += window.GRAVITY;
        }
        
        m.x += m.vx;
        checkEntityCollision(m, 'x');
        m.y += m.vy;
        m.grounded = false;
        checkEntityCollision(m, 'y');

        if (m.hurtTimer > 0) m.hurtTimer--;

        // Mob Death
        if (m.y > worldHeight * window.TILE_SIZE + 200) {
             mobs.splice(i, 1); 
        } else if (m.hp <= 0) {
            killMob(m, i);
        }
    }

    // Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--;

        let tx = Math.floor(p.x / window.TILE_SIZE);
        let ty = Math.floor(p.y / window.TILE_SIZE);
        let b = getBlock(tx, ty);
        let bDef = window.BLOCK_DEF[b] || {};
        
        if ((b !== window.BLOCKS.AIR && !bDef.fluid) || p.life <= 0) {
            explode(tx, ty, 1.5, false); 
            projectiles.splice(i, 1);
            continue;
        }

        for (let m of mobs) {
            if (p.x > m.x && p.x < m.x + m.width && p.y > m.y && p.y < m.y + m.height) {
                let crit = Math.random() < 0.2;
                let dmg = (30 + player.damage) * (crit ? 2 : 1);
                m.hp -= dmg; 
                m.hurtTimer = 10;
                spawnParticles(m.x + m.width/2, m.y + m.height/2, '#FF5722', 8);
                spawnFloatingText(m.x, m.y, dmg, crit ? '#ff0000' : '#fff');
                explode(Math.floor(p.x/window.TILE_SIZE), Math.floor(p.y/window.TILE_SIZE), 1.5, false); 
                projectiles.splice(i, 1);
                break;
            }
        }
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
    
    // Weather Particles
    for (let i = weatherParticles.length - 1; i >= 0; i--) {
        let p = weatherParticles[i];
        p.x += (p.vx || 0) - (player.vx * 0.1); 
        p.y += p.vy;
        
        // Interaction with ground
        let tx = Math.floor(p.x/window.TILE_SIZE);
        let ty = Math.floor(p.y/window.TILE_SIZE);
        if (getBlock(tx, ty) !== window.BLOCKS.AIR) {
             weatherParticles.splice(i, 1);
        } else if(p.y > height + camera.y) {
             weatherParticles.splice(i, 1);
        }
    }
    
    // Floating Text
    for (let i = floatTexts.length - 1; i >= 0; i--) {
        let ft = floatTexts[i]; 
        ft.y += ft.vy; ft.life--; 
        if (ft.life <= 0) floatTexts.splice(i, 1);
    }
}

function killMob(m, index) {
    spawnParticles(m.x + m.width/2, m.y + m.height/2, m.color, 20);
    
    // Combo Logic
    combo++;
    comboTimer = 120;
    let comboBonus = Math.floor(combo * 1.5);

    let totalReward = m.reward + comboBonus;
    addGold(totalReward);
    
    spawnFloatingText(m.x, m.y, `+${totalReward}G`, '#FFD700');
    if(combo > 1) spawnFloatingText(m.x, m.y - 20, `Combo x${combo}!`, '#00E5FF');

    if (m.type === 'boss') {
        activeBoss = null;
        document.getElementById('boss-hud').style.display = 'none';
        shake = 20; 
        spawnFloatingText(m.x, m.y-40, "BOSS DEFEATED", "#E91E63");
    }
    mobs.splice(index, 1);
}

// --- Physics Helpers ---

function getBlock(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && x < worldWidth && y >= 0 && y < worldHeight) return world[y][x];
    return window.BLOCKS.AIR;
}

function setBlock(x, y, id) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && x < worldWidth && y >= 0 && y < worldHeight) world[y][x] = id;
}

function checkRectOverlap(a, b) {
    return (a.x < b.x + b.width && a.x + a.width > b.x &&
            a.y < b.y + b.height && a.y + a.height > b.y);
}

function isBlocked(entity) {
    let tx = Math.floor((entity.x + (entity.vx > 0 ? entity.width + 5 : -5)) / window.TILE_SIZE);
    let ty = Math.floor((entity.y + entity.height - 5) / window.TILE_SIZE);
    let b = getBlock(tx, ty);
    let def = window.BLOCK_DEF[b] || {};
    return b !== window.BLOCKS.AIR && !def.fluid;
}

function checkEntityCollision(ent, axis) {
    let left = Math.floor(ent.x / window.TILE_SIZE);
    let right = Math.floor((ent.x + ent.width - 0.01) / window.TILE_SIZE);
    let top = Math.floor(ent.y / window.TILE_SIZE);
    let bottom = Math.floor((ent.y + ent.height - 0.01) / window.TILE_SIZE);

    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            let b = getBlock(x, y);
            if (b === window.BLOCKS.AIR) continue;
            let def = window.BLOCK_DEF[b];
            if (!def) continue;
            if (def.fluid) continue; 
            
            if (b === window.BLOCKS.SPIKE && ent === player) {
                 takeDamage(10);
                 ent.vy = -10; 
            }
            
            if (b !== window.BLOCKS.GOAL && b !== window.BLOCKS.SPIKE && !def.alpha) {
                if (axis === 'x') {
                    if (ent.vx > 0) ent.x = x * window.TILE_SIZE - ent.width;
                    else if (ent.vx < 0) ent.x = (x + 1) * window.TILE_SIZE;
                    ent.vx = 0;
                } else {
                    if (ent.vy > 0) {
                        ent.y = y * window.TILE_SIZE - ent.height;
                        ent.grounded = true;
                        ent.vy = 0;
                    } else if (ent.vy < 0) {
                        ent.y = (y + 1) * window.TILE_SIZE;
                        ent.vy = 0;
                    }
                }
                return;
            }
        }
    }
}

// --- Actions ---

function takeDamage(amount) {
    if(player.invulnerable > 0) return;
    player.hp -= amount;
    player.invulnerable = 30; // 0.5 sec
    damageFlash = 0.5; 
    updateHUD();
    spawnFloatingText(player.x, player.y, `-${amount}`, '#ff5252');
    shake = 5;
}

function die() {
    gameState = "DEAD";
    document.getElementById('shop-overlay').classList.remove('hidden');
    document.getElementById('shop-menu').classList.add('hidden');
    document.getElementById('death-menu').classList.remove('hidden');
    document.getElementById('death-level').innerText = currentLevel;
}

function completeLevel() {
    if(gameState === "SHOP") return;
    gameState = "SHOP";
    addGold(200); 
    document.getElementById('shop-overlay').classList.remove('hidden');
    document.getElementById('shop-menu').classList.remove('hidden');
    document.getElementById('death-menu').classList.add('hidden');
    checkShopItems();
}

function handleInteraction(button) {
    if (player.actionTimer > 0) return;
    
    let mx = mouse.x + camera.x;
    let my = mouse.y + camera.y;
    let tx = Math.floor(mx / window.TILE_SIZE);
    let ty = Math.floor(my / window.TILE_SIZE);

    let dist = Math.hypot(player.x + player.width/2 - mx, player.y + player.height/2 - my);
    let selected = inventory[selectedBlockIndex];
    
    // Attack
    if (button === 0 && (selected === window.ITEMS.SWORD || selected === window.ITEMS.WAND || selected === window.ITEMS.AXE || selected === window.ITEMS.SPEAR)) {
        if (player.attackTimer <= 0) {
             if (selected === window.ITEMS.WAND) shootWand(mx, my);
             else performAttack(selected); 
             player.actionTimer = 12; 
             playTone(600, 'square', 0.05);
        }
        return;
    }
    
    if (dist > window.INTERACTION_RANGE) return;
    player.actionTimer = 8; 

    // Left Click: Dig / Interact
    if (button === 0) { 
        let current = getBlock(tx, ty);
        if (current === window.BLOCKS.GOAL) return; 

        if (current === window.BLOCKS.TNT) {
            setBlock(tx, ty, window.BLOCKS.AIR);
            activeTNTs.push({ x: tx, y: ty, timer: 100, flash: false });
            spawnFloatingText(mx, my, "IGNITE!", "#ff5252");
            playTone(400, 'sawtooth', 0.1);
        }
        else if (current !== window.BLOCKS.AIR) {
            let def = window.BLOCK_DEF[current] || {};
            
            // Hard block logic
            if (def.hard) {
                if (worldHealth[ty][tx] > 1) {
                     worldHealth[ty][tx]--;
                     spawnParticles(tx * window.TILE_SIZE + window.TILE_SIZE/2, ty * window.TILE_SIZE + window.TILE_SIZE/2, '#888', 3);
                     playTone(100 + Math.random()*50, 'square', 0.05);
                     return; 
                }
            }

            // Mining Cost & Reward
            if (player.gold >= 1) {
                player.gold -= 1;
                updateHUD();
                spawnFloatingText(mx, my, "-1G", "#ffff00");

                if (def.value) {
                     addGold(def.value); 
                     spawnFloatingText(mx, my - 20, `+${def.value}G`, '#FFD700');
                }
                if (def.color) spawnParticles(tx * window.TILE_SIZE + window.TILE_SIZE/2, ty * window.TILE_SIZE + window.TILE_SIZE/2, def.color);
                setBlock(tx, ty, window.BLOCKS.AIR);
                playTone(200, 'triangle', 0.05);
            } else {
                spawnFloatingText(mx, my, "Need Gold!", "#ff0000");
            }
        }
    } 
    // Right Click: Build
    else if (button === 2) { 
        if (selected >= 100) return; 

        let px = player.x / window.TILE_SIZE;
        let py = player.y / window.TILE_SIZE;
        let pw = player.width / window.TILE_SIZE;
        let ph = player.height / window.TILE_SIZE;
        
        // Prevent trapping self
        if (!(tx >= px + pw || tx + 1 <= px || ty >= py + ph || ty + 1 <= py)) return;
        
        let current = getBlock(tx, ty);
        let def = window.BLOCK_DEF[current] || {};
        
        if (current === selected) return;

        if (current === window.BLOCKS.AIR || def.alpha) {
            let cost = 1;
            if (selected === window.BLOCKS.WATER) cost = 5;
            else if (selected === window.BLOCKS.LAVA) cost = 30;
            else if (selected === window.BLOCKS.TNT) cost = 10;

            if (player.gold >= cost) {
                player.gold -= cost;
                updateHUD();
                spawnFloatingText(mx, my, `-${cost}G`, "#ffff00");
                setBlock(tx, ty, selected);
                let newDef = window.BLOCK_DEF[selected];
                worldHealth[ty][tx] = (newDef && newDef.hard) ? newDef.maxHp : 1;
                playTone(300, 'sine', 0.05);
            } else {
                spawnFloatingText(mx, my, "Need Gold!", "#ff0000");
            }
        }
    }
}

function shootWand(mx, my) {
    player.attackTimer = 20; 
    let angle = Math.atan2(my - (player.y + 10), mx - (player.x + 10));
    projectiles.push({
        x: player.x + 10,
        y: player.y + 10,
        vx: Math.cos(angle) * 12,
        vy: Math.sin(angle) * 12,
        life: 50
    });
    playTone(500, 'square', 0.1);
    shake = 2;
}

function performAttack(weaponType) {
    player.attackTimer = 15; 
    let reach = 80;
    let damageMult = 1.0;

    if (weaponType === window.ITEMS.AXE) { reach = 90; damageMult = 1.5; player.attackTimer = 25; } 
    if (weaponType === window.ITEMS.SPEAR) { reach = 140; damageMult = 0.8; } 

    let hitX = player.x + player.width/2 - reach/2;
    if (player.facingRight) hitX = player.x + player.width/2 - 10;
    else hitX = player.x + player.width/2 - reach + 10;

    let hitY = player.y - 10;
    let hitW = reach;
    let hitH = player.height + 20;

    // Visual Slash
    spawnParticles(hitX + hitW/2, hitY + hitH/2, '#fff', 3);

    mobs.forEach((m, idx) => {
        if (hitX < m.x + m.width && hitX + hitW > m.x &&
            hitY < m.y + m.height && hitY + hitH > m.y) {
            
            let dmg = player.damage * damageMult;
            m.hp -= dmg;
            m.hurtTimer = 10;
            m.vy = -6;
            m.vx = player.facingRight ? 8 : -8;
            spawnParticles(m.x + m.width/2, m.y + m.height/2, '#fff', 5);
            spawnFloatingText(m.x, m.y, Math.floor(dmg), '#fff');
            shake = 4; 
            playTone(100, 'sawtooth', 0.1);
        }
    });
}

function explode(cx, cy, radius, hurtPlayer = true) { 
    if (getBlock(cx, cy) === window.BLOCKS.GOAL) return;
    
    setBlock(cx, cy, window.BLOCKS.AIR);
    spawnParticles(cx * window.TILE_SIZE, cy * window.TILE_SIZE, '#ff0000', 30);
    shake = radius * 5; 
    playTone(50, 'sawtooth', 0.5);
    
    let r = Math.ceil(radius);
    for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
            if ((x-cx)*(x-cx) + (y-cy)*(y-cy) <= radius*radius) {
                let b = getBlock(x,y);
                if (b !== window.BLOCKS.BRICK && b !== window.BLOCKS.GOAL) {
                    setBlock(x, y, window.BLOCKS.AIR);
                    if (Math.random() > 0.5) spawnParticles(x * window.TILE_SIZE, y * window.TILE_SIZE, '#555', 1);
                }
            }
        }
    }
    
    mobs.forEach((m, idx) => {
        let dx = (m.x/window.TILE_SIZE) - cx;
        let dy = (m.y/window.TILE_SIZE) - cy;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < radius + 1) {
            let damageFactor = 1 - (dist / (radius + 2)); 
            if(damageFactor < 0) damageFactor = 0;
            m.hp -= 100 * damageFactor; 
            m.vy = -10;
            m.hurtTimer = 10;
        }
    });

    if (hurtPlayer) {
        let pdx = (player.x/window.TILE_SIZE) - cx;
        let pdy = (player.y/window.TILE_SIZE) - cy;
        let pDist = Math.sqrt(pdx*pdx + pdy*pdy);
        if (pDist < radius + 1) {
            let damageFactor = 1 - (pDist / (radius + 2));
            takeDamage(Math.floor(40 * damageFactor));
            player.vx += (pdx / pDist) * 15; 
            player.vy += (pdy / pDist) * 15;
        }
    }
}

// --- UI & Utils ---

function updateHUD() {
    document.getElementById('ui-level').innerText = currentLevel;
    document.getElementById('ui-gold').innerText = Math.floor(player.gold);
    document.getElementById('shop-gold').innerText = Math.floor(player.gold);
    document.getElementById('ui-hp-text').innerText = `${Math.floor(player.hp)}/${player.maxHp}`;
    
    let hpPct = (player.hp / player.maxHp) * 100;
    document.getElementById('ui-hp-bar').style.width = Math.max(0, hpPct) + '%';
    
    let stamPct = (player.stamina / player.maxStamina) * 100;
    document.getElementById('ui-stamina-bar').style.width = Math.max(0, stamPct) + '%';

    let breathContainer = document.getElementById('breath-container');
    if (player.inWater) {
         breathContainer.style.display = 'flex';
         document.getElementById('breath-bar').style.width = player.breath + '%';
    } else {
         breathContainer.style.display = 'none';
    }
}

function spawnFloatingText(x, y, text, color) {
    floatTexts.push({ x, y, text, color, life: 60, vy: -1.5 });
}

function spawnParticles(tx, ty, color, count = 5) {
    for(let i=0; i<count; i++) {
        particles.push({
            x: tx, y: ty,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 20 + Math.random() * 20,
            color: color,
            size: 4 + Math.random() * 4
        });
    }
}

function spawnToast(msg, isError=false) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerText = msg;
    if(isError) el.style.borderColor = '#ff5252';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2000);
}

function addGold(amount) {
    if (!amount) return;
    player.gold += amount;
    updateHUD();
}

function checkShopItems() {
    if(player.hasWand) document.getElementById('btn-wand').classList.add('owned');
    if(player.hasAxe) document.getElementById('btn-axe').classList.add('owned');
    if(player.hasSpear) document.getElementById('btn-spear').classList.add('owned');
}

function selectSlot(index) {
    if (index < 0 || index >= inventory.length) return;
    selectedBlockIndex = index;
    const slots = document.querySelectorAll('.slot');
    slots.forEach(s => s.classList.remove('active'));
    if(slots[index]) slots[index].classList.add('active');
}

function playTone(freq, type, duration) {
    if(!audioCtx || audioCtx.state !== 'running') return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function setupUI() {
    const ui = document.getElementById('inventory-bar');
    ui.innerHTML = '';
    inventory.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = 'slot';
        if (index === selectedBlockIndex) slot.classList.add('active');
        slot.onclick = () => selectSlot(index);
        
        const key = document.createElement('div');
        key.className = 'slot-key';
        key.innerText = index + 1;
        slot.appendChild(key);

        let def = window.BLOCK_DEF[item];
        if (def && def.icon) {
             const icon = document.createElement('div');
             icon.className = 'item-icon';
             icon.innerText = def.icon;
             slot.appendChild(icon);
        } else if (def) {
            const preview = document.createElement('div');
            preview.className = 'block-preview';
            preview.style.backgroundColor = def.color;
            if (def.top) preview.style.borderTop = `4px solid ${def.top}`;
            slot.appendChild(preview);
        }
        ui.appendChild(slot);
    });
}

// --- Draw ---

function draw() {
    // Sky Gradient
    let timeNorm = (Math.sin(gameTime * 0.0005) + 1) / 2;
    let grd = ctx.createLinearGradient(0, 0, 0, height);
    if (weather === "RAIN") { 
        grd.addColorStop(0, "#263238"); grd.addColorStop(1, "#546E7A");
    } else {
        let r1 = Math.floor(135 * timeNorm), g1 = Math.floor(206 * timeNorm), b1 = 235;
        let r2 = 255, g2 = 255, b2 = 255;
        if(timeNorm < 0.3) { r2=200; g2=150; b2=200; } 
        grd.addColorStop(0, `rgb(${r1},${g1},${b1})`);
        grd.addColorStop(1, `rgb(${r2},${g2},${b2})`);
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width, height);

    // Sun/Moon
    if (weather === "NONE") {
        let sunY = height/2 + Math.cos(gameTime * 0.0005) * (height * 0.8);
        let sunX = width/2 + Math.sin(gameTime * 0.0005) * (width * 0.8);
        ctx.fillStyle = timeNorm > 0.5 ? '#FFEB3B' : '#F4F6F0';
        ctx.beginPath(); ctx.arc(sunX, sunY, 40, 0, Math.PI * 2); ctx.fill();
    }

    // Parallax Mountains
    ctx.fillStyle = weather === "RAIN" ? `rgba(20, 30, 40, 0.4)` : `rgba(100, 150, 100, 0.3)`;
    ctx.beginPath(); ctx.moveTo(0, height);
    for(let i=0; i<=width; i+=10) {
        let wx = i + camera.x * 0.05; 
        let mh = 150 + Math.sin(wx * 0.005) * 80 + Math.sin(wx * 0.02) * 30; 
        ctx.lineTo(i, height - mh);
    }
    ctx.lineTo(width, height); ctx.fill();

    // Camera Shake & Translation
    ctx.save();
    let shakeX = (Math.random() - 0.5) * shake; 
    let shakeY = (Math.random() - 0.5) * shake;
    ctx.translate(-Math.floor(camera.x) + shakeX, -Math.floor(camera.y) + shakeY);

    const startCol = Math.floor(camera.x / window.TILE_SIZE);
    const endCol = startCol + (width / window.TILE_SIZE) + 2;
    const startRow = Math.floor(camera.y / window.TILE_SIZE);
    const endRow = startRow + (height / window.TILE_SIZE) + 2;

    for (let y = Math.max(0, startRow); y < Math.min(worldHeight, endRow); y++) {
        for (let x = Math.max(0, startCol); x < Math.min(worldWidth, endCol); x++) {
            let type = world[y][x];
            if (type !== window.BLOCKS.AIR) {
                let def = window.BLOCK_DEF[type];
                let px = x * window.TILE_SIZE, py = y * window.TILE_SIZE;
                
                if (type === window.BLOCKS.WATER) {
                    let isSurface = getBlock(x, y-1) === window.BLOCKS.AIR;
                    ctx.fillStyle = "rgba(41, 182, 246, 0.6)";
                    if (isSurface) {
                        ctx.fillRect(px, py + 8, window.TILE_SIZE, window.TILE_SIZE - 8);
                        ctx.fillStyle = "rgba(225, 245, 254, 0.5)";
                        let wave = Math.sin((x + gameTime * 0.05)) * 4; 
                        ctx.fillRect(px, py + 6 + wave, window.TILE_SIZE, 4);
                    } else {
                        ctx.fillRect(px, py, window.TILE_SIZE, window.TILE_SIZE);
                    }
                } else if (type === window.BLOCKS.LAVA) {
                    ctx.fillStyle = def.color; ctx.fillRect(px, py, window.TILE_SIZE, window.TILE_SIZE);
                    ctx.fillStyle = "#FFEB3B"; 
                    if(Math.random() < 0.01) ctx.fillRect(px + Math.random()*30, py + Math.random()*30, 4, 4);
                } else if (type === window.BLOCKS.TNT) {
                    ctx.fillStyle = def.color; ctx.fillRect(px, py, window.TILE_SIZE, window.TILE_SIZE);
                    ctx.fillStyle = "white"; ctx.font = "10px monospace"; ctx.textAlign = "center"; 
                    ctx.fillText("TNT", px + window.TILE_SIZE/2, py + window.TILE_SIZE/2 + 4);
                    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(px, py+15, window.TILE_SIZE, 10);
                } else {
                    if (def.alpha) ctx.globalAlpha = def.alpha;
                    
                    ctx.fillStyle = def.color;
                    if (def.spike) {
                         ctx.beginPath(); ctx.moveTo(px, py + window.TILE_SIZE); ctx.lineTo(px + window.TILE_SIZE/2, py + 10); ctx.lineTo(px + window.TILE_SIZE, py + window.TILE_SIZE); ctx.fill();
                    } else if (type === window.BLOCKS.GOAL) {
                        ctx.fillStyle = '#6A1B9A'; ctx.fillRect(px, py, window.TILE_SIZE, window.TILE_SIZE);
                        let pulse = Math.sin(gameTime * 0.1) * 5;
                        ctx.fillStyle = `rgba(100, 255, 218, 0.5)`; 
                        ctx.beginPath(); ctx.arc(px + window.TILE_SIZE/2, py + window.TILE_SIZE/2, 10 + pulse, 0, Math.PI*2); ctx.fill();
                    } else {
                        ctx.fillRect(px, py, window.TILE_SIZE, window.TILE_SIZE);
                        
                        // Detail shading
                        ctx.fillStyle = "rgba(0,0,0,0.1)"; ctx.fillRect(px + window.TILE_SIZE - 4, py, 4, window.TILE_SIZE); ctx.fillRect(px, py + window.TILE_SIZE - 4, window.TILE_SIZE, 4);
                        ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(px, py, 4, window.TILE_SIZE); ctx.fillRect(px, py, window.TILE_SIZE, 4);

                        if (def.top) { ctx.fillStyle = (weather === "SNOW" && type === window.BLOCKS.GRASS) ? '#fff' : def.top; ctx.fillRect(px, py, window.TILE_SIZE, 10); }
                        if (def.speckle) { 
                            ctx.fillStyle = def.speckle; 
                            ctx.fillRect(px+10, py+10, 8, 8); 
                            ctx.fillRect(px+25, py+25, 6, 6);
                        }
                        
                        // Crack overlay
                        if (def.hard) {
                            let hp = worldHealth[y][x];
                            if (hp < def.maxHp) {
                                ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 2; ctx.beginPath();
                                ctx.moveTo(px + 5, py + 5); ctx.lineTo(px + 35, py + 35);
                                if(hp < def.maxHp - 1) { ctx.moveTo(px + 35, py + 5); ctx.lineTo(px + 5, py + 35); }
                                ctx.stroke();
                            }
                        }
                    }
                    ctx.globalAlpha = 1.0;
                }
            }
        }
    }
    
    // TNT Flash
    activeTNTs.forEach(tnt => {
        let px = tnt.x * window.TILE_SIZE, py = tnt.y * window.TILE_SIZE;
        if (tnt.flash) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillRect(px, py, window.TILE_SIZE, window.TILE_SIZE);
        }
    });

    // Draw Mobs
    mobs.forEach(m => {
        if (m.hurtTimer > 0) ctx.fillStyle = '#fff'; else ctx.fillStyle = m.color;
        ctx.fillRect(m.x, m.y, m.width, m.height);
        
        // HP Bar
        ctx.fillStyle = '#333'; ctx.fillRect(m.x, m.y - 12, m.width, 6);
        ctx.fillStyle = '#f44336'; ctx.fillRect(m.x + 1, m.y - 11, (m.width - 2) * (m.hp / m.maxHp), 4);
        
        // Mob Eyes
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        if (m.type === 'slime') {
            ctx.fillRect(m.x + 5, m.y + 5, 4, 4); ctx.fillRect(m.x + m.width - 9, m.y + 5, 4, 4);
        } else if (m.type === 'bat') {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.moveTo(m.x+5, m.y+10); ctx.lineTo(m.x+10, m.y+15); ctx.lineTo(m.x+15, m.y+10); ctx.fill();
            // Wings
            let wingY = Math.sin(gameTime * 0.5) * 5;
            ctx.fillStyle = m.color;
            ctx.beginPath(); ctx.moveTo(m.x, m.y+10); ctx.lineTo(m.x-15, m.y-5+wingY); ctx.lineTo(m.x, m.y+15); ctx.fill();
            ctx.beginPath(); ctx.moveTo(m.x+m.width, m.y+10); ctx.lineTo(m.x+m.width+15, m.y-5+wingY); ctx.lineTo(m.x+m.width, m.y+15); ctx.fill();
        } else {
             ctx.fillRect(m.x + 4, m.y + 8, 4, 4); ctx.fillRect(m.x + m.width - 8, m.y + 8, 4, 4);
        }
    });

    // Projectiles
    projectiles.forEach(p => {
        ctx.fillStyle = '#FF5722'; 
        ctx.shadowColor = '#FF5722'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    });

    // Draw Player
    ctx.save();
    ctx.translate(player.x + player.width/2, player.y + player.height/2);
    if(player.spin > 0) ctx.rotate(player.spin * Math.PI / 180);
    ctx.translate(-(player.x + player.width/2), -(player.y + player.height/2));

    ctx.fillStyle = '#FFC107'; ctx.fillRect(player.x, player.y, player.width, player.height);
    // Clothes
    ctx.fillStyle = '#1976D2'; ctx.fillRect(player.x, player.y + 20, player.width, 10);
    ctx.fillStyle = '#388E3C'; ctx.fillRect(player.x, player.y + 30, player.width, 8);
    
    // Eyes
    ctx.fillStyle = 'black';
    let eyeY = player.y + 10;
    let leftEyeX = player.facingRight ? player.x + 14 : player.x + 6;
    let rightEyeX = player.facingRight ? player.x + 22 : player.x + 14;

    if (player.eyeState === 'blink') { 
        ctx.fillRect(leftEyeX, eyeY + 2, 4, 2); ctx.fillRect(rightEyeX, eyeY + 2, 4, 2); 
    } else { 
        ctx.fillRect(leftEyeX, eyeY, 4, 4); ctx.fillRect(rightEyeX, eyeY, 4, 4); 
    }
    
    // Dash Trail
    if (player.dashTimer > 20) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#00E5FF';
        ctx.fillRect(player.x - player.vx, player.y, player.width, player.height);
        ctx.globalAlpha = 1.0;
    }

    ctx.restore();

    // Held Item
    let currentItem = inventory[selectedBlockIndex];
    if (currentItem >= 100) {
        ctx.save();
        ctx.translate(player.x + player.width/2, player.y + 20);
        if (!player.facingRight) ctx.scale(-1, 1);
        let rot = 0;
        if (player.attackTimer > 0) {
             let p = player.attackTimer / 15;
             rot = -Math.PI/2 + (Math.sin(p * Math.PI) * Math.PI);
        }
        ctx.rotate(rot);
        
        let def = window.BLOCK_DEF[currentItem];
        ctx.fillStyle = def.color; 
        
        if (currentItem === window.ITEMS.SWORD) {
             ctx.fillStyle = '#8D6E63'; ctx.fillRect(0, 0, 8, 4); 
             ctx.fillStyle = '#00BCD4'; ctx.fillRect(8, -2, 24, 8); 
        } else if (currentItem === window.ITEMS.WAND) {
             ctx.fillStyle = '#5D4037'; ctx.fillRect(0, 0, 20, 4);
             ctx.fillStyle = '#FF5722'; ctx.beginPath(); ctx.arc(22, 2, 6, 0, Math.PI*2); ctx.fill();
        } else {
             ctx.fillRect(0, -2, 25, 6);
        }
        ctx.restore();
    }

    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    
    // Interaction Highlight
    if (gameState === "PLAY") {
        let mx = mouse.x + camera.x;
        let my = mouse.y + camera.y;
        let dist = Math.hypot(player.x + player.width/2 - mx, player.y + player.height/2 - my);
        
        if (dist <= window.INTERACTION_RANGE) {
            let sx = Math.floor(mx / window.TILE_SIZE) * window.TILE_SIZE;
            let sy = Math.floor(my / window.TILE_SIZE) * window.TILE_SIZE;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; 
            ctx.lineWidth = 2; 
            ctx.strokeRect(sx, sy, window.TILE_SIZE, window.TILE_SIZE);
        }
    }
    
    // Floating Texts
    ctx.font = "12px 'Press Start 2P'";
    ctx.textAlign = "center";
    for (let i = floatTexts.length - 1; i >= 0; i--) {
        let ft = floatTexts[i]; 
        ctx.fillStyle = 'black'; ctx.fillText(ft.text, ft.x + 2, ft.y + 2); 
        ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y); 
        ft.y += ft.vy; ft.life--; 
        if (ft.life <= 0) floatTexts.splice(i, 1);
    }

    ctx.restore(); // Camera Restore

    // Foreground Weather
    if (weather !== "NONE") {
        ctx.fillStyle = weather === "RAIN" ? "rgba(100, 181, 246, 0.6)" : "rgba(255, 255, 255, 0.8)";
        weatherParticles.forEach(p => {
            if (p.x > width + camera.x) p.x = camera.x; if (p.x < camera.x) p.x = camera.x + width;
            if (p.type === 'rain') ctx.fillRect(p.x - camera.x, p.y - camera.y, 2, 12); else ctx.fillRect(p.x - camera.x, p.y - camera.y, 4, 4);
        });
    }

    if (damageFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${damageFlash})`; 
        ctx.fillRect(0, 0, width, height); 
        damageFlash -= 0.05; 
    }
}

// Ensure init runs
window.onload = init;