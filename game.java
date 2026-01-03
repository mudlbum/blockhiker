// --- Initialization ---
function init() {
    resize();
    window.addEventListener('resize', resize);
    generateLevel(1);
    setupUI();
    updateHUD();
    
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if(gameState === "PLAY") {
            const num = parseInt(e.key);
            if (!isNaN(num) && num >= 1 && num <= 9) {
                 if (num <= inventory.length) selectSlot(num - 1);
            }
            
            // Double Jump Input
            if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat) {
                handleJump();
            }
        }
    });
    window.addEventListener('keyup', e => keys[e.code] = false);
    
    canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
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

    requestAnimationFrame(loop);
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}

function handleJump() {
    if (player.inWater) {
         // Water Jump logic handled in update
    } else {
        if (player.grounded) {
            // Ground Jump handled in update for Bounce Block check
        } else if (player.jumps < 2) {
            // Double Jump
            player.vy = JUMP_FORCE;
            player.jumps = 2;
            player.spin = 720; 
            player.eyeState = 'surprise';
            player.eyeTimer = 20;
            spawnParticles(player.x + player.width/2, player.y + player.height, '#fff', 5);
            playTone(400, 'sine', 0.1);
        }
    }
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
    activeBoss = null;
    document.getElementById('boss-hud').style.display = 'none';
    
    let wRand = Math.random();
    if (wRand < 0.2) weather = "RAIN";
    else if (wRand < 0.4 && level > 2) weather = "SNOW";
    else weather = "NONE";

    worldWidth = 150 + (level * 20); 
    worldHeight = 60;
    const mobChance = Math.min(0.05, 0.02 + (level * 0.005)); 

    const heights = [];
    for (let x = 0; x < worldWidth; x++) {
        let base = Math.sin(x * 0.05) * (5 + level * 2); 
        let detail = Math.sin(x * 0.3) * (2 + level);
        let h = Math.floor(worldHeight / 2 + base + detail);
        if(h < 5) h = 5;
        if(h > worldHeight - 5) h = worldHeight - 5;
        heights.push(h);
    }

    const isBossLevel = level % 3 === 0;

    let dirtDepths = [];
    let currDepth = 4;
    for(let x=0; x<worldWidth; x++) {
        let change = Math.floor(Math.random() * 5) - 2; 
        currDepth += change;
        if (currDepth < 0) currDepth = 0;
        if (currDepth > 5) currDepth = 5;
        dirtDepths.push(currDepth);
    }

    for (let y = 0; y < worldHeight; y++) {
        let row = [];
        let hpRow = [];
        for (let x = 0; x < worldWidth; x++) {
            let h = heights[x];
            let dDepth = dirtDepths[x];
            let block = BLOCKS.AIR;

            if (x < 20) {
                h = Math.floor(worldHeight / 2);
                if (y >= h) block = (y === h) ? BLOCKS.GRASS : BLOCKS.DIRT;
                if (y >= worldHeight - 2) block = BLOCKS.BRICK;
            } else {
                let isGap = false;
                if (isBossLevel && x > worldWidth - 60) h = Math.floor(worldHeight/2);
                else if (x < worldWidth - 20) {
                     let gapNoise = Math.sin(x * 0.8) * Math.cos(x * 0.4);
                     if (gapNoise > (0.9 - (level * 0.02))) isGap = true;
                }

                if (isGap && y > worldHeight - 5) {
                    block = (Math.random() < 0.5) ? BLOCKS.SPIKE : BLOCKS.LAVA;
                } else if (!isGap && y >= h) {
                    if (y === h) block = BLOCKS.GRASS;
                    else if (y > h && y <= h + dDepth) block = BLOCKS.DIRT; 
                    else block = BLOCKS.STONE;
                    
                    if (block === BLOCKS.STONE) {
                        let r = Math.random();
                        if (r < 0.05) block = BLOCKS.COAL_ORE;
                        else if (r < 0.03) block = BLOCKS.GOLD_ORE;
                        else if (r < 0.02) block = BLOCKS.DIAMOND_ORE;
                    }
                }
                if (y >= worldHeight - 2) block = BLOCKS.BRICK;
            }
            
            // One Block Portal
            if (x === worldWidth - 4 && y === h - 1) block = BLOCKS.GOAL;
            if (x > worldWidth - 10 && y >= h && block === BLOCKS.AIR) block = BLOCKS.STONE;
            
            // Feature Blocks
            if (block === BLOCKS.DIRT && Math.random() < 0.02) block = BLOCKS.PLANK;
            if (block === BLOCKS.STONE && Math.random() < 0.02) block = BLOCKS.ICE;
            if (block === BLOCKS.DIRT && Math.random() < 0.01) block = BLOCKS.BOUNCE;

            row.push(block);
            let def = BLOCK_DEF[block];
            hpRow.push(def && def.hard ? def.maxHp : 1);
        }
        world.push(row);
        worldHealth.push(hpRow);
    }

    let numPonds = Math.floor(Math.random() * 4); 
    for(let i=0; i<numPonds; i++) {
        let pW = 7 + Math.floor(Math.random() * 6); 
        let pD = 3 + Math.floor(Math.random() * 3); 
        
        let startX = 25 + Math.floor(Math.random() * (worldWidth - 50));
        if (isBossLevel && startX > worldWidth - 70) continue; 

        let centerIdx = startX + Math.floor(pW/2);
        if (centerIdx >= heights.length) continue;
        let surfaceY = heights[centerIdx];
        
        let cX = startX + pW / 2;
        let cY = surfaceY; 
        let rX = pW / 2;
        let rY = pD;

        for (let x = startX; x < startX + pW; x++) {
            if (x >= worldWidth - 10) continue;
            let xDist = (x - cX);
            let yDist = rY * Math.sqrt(1 - (xDist*xDist)/(rX*rX));
            if (isNaN(yDist)) continue;
            let maxY = Math.floor(cY + yDist);

            for (let y = surfaceY; y <= maxY; y++) {
                if (y < 0 || y >= worldHeight - 2) continue; 
                if (!world[y]) continue; 
                let existing = world[y][x];
                if (existing !== BLOCKS.AIR && existing !== BLOCKS.GOAL && existing !== BLOCKS.BRICK) {
                    world[y][x] = BLOCKS.WATER;
                }
            }
        }
    }

    // Mobs
    for (let x = 20; x < worldWidth - 20; x++) {
        if (isBossLevel && x > worldWidth - 60) continue;
        if (Math.random() < mobChance) {
            let h = heights[x];
            if (world[h][x] !== BLOCKS.AIR && world[h-1][x] === BLOCKS.AIR) {
                let type = (Math.random() < 0.6) ? 'SLIME' : 'ZOMBIE';
                spawnMob(x * TILE_SIZE, (h - 2) * TILE_SIZE, type);
            }
            if (level > 2 && Math.random() < 0.3) {
                 spawnMob(x * TILE_SIZE, (h - 10) * TILE_SIZE, 'BAT');
            }
        }
    }

    while (mobs.length < 3) {
        let rx = 20 + Math.floor(Math.random() * (worldWidth - 40));
        if (isBossLevel && rx > worldWidth - 60) continue;
        let rh = heights[rx];
        if (world[rh][rx] !== BLOCKS.AIR && world[rh-1][rx] === BLOCKS.AIR) {
            spawnMob(rx * TILE_SIZE, (rh - 2) * TILE_SIZE, 'SLIME');
        }
    }

    if (isBossLevel) {
        let bx = (worldWidth - 30) * TILE_SIZE;
        let bossType = 'BOSS_SLIME';
        if (level % 9 === 3) bossType = 'BOSS_SLIME';
        else if (level % 9 === 6) bossType = 'BOSS_ZOMBIE';
        else if (level % 9 === 0) bossType = 'BOSS_VOID';
        spawnMob(bx, 0, bossType);
    }

    player.x = 5 * TILE_SIZE;
    player.y = 0; 
    
    gameState = "PLAY";
    document.getElementById('overlay').style.display = 'none';
    updateHUD();
}

function spawnMob(x, y, typeKey) {
    let stats = MOB_TYPES[typeKey];
    let hpScale = stats.hp + (currentLevel * 10);
    let m = {
        x: x, y: y,
        vx: 0, vy: 0,
        ...stats,
        maxHp: hpScale,
        hp: hpScale,
        grounded: false,
        hurtTimer: 0
    };
    mobs.push(m);
    if (stats.type === 'boss') {
        activeBoss = m;
        document.querySelector('.boss-name').innerText = stats.name;
    }
}

// --- Game Logic ---
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

    if (player.invulnerable > 0) player.eyeState = 'hurt';
    else if (player.spin > 0) player.eyeState = 'surprise';
    else if (player.eyeTimer > 0) {
        player.eyeTimer--;
    } else {
        if (Math.random() < 0.01) {
            player.eyeState = Math.random() < 0.5 ? 'blink' : 'wink';
            player.eyeTimer = 10;
        } else {
            player.eyeState = 'normal';
        }
    }

    if (weather === "RAIN") {
        if (Math.random() < 0.5) weatherParticles.push({x: Math.random()*width, y: -10, vy: 15 + Math.random()*5, type: 'rain'});
    } else if (weather === "SNOW") {
        if (Math.random() < 0.2) weatherParticles.push({x: Math.random()*width, y: -10, vy: 2 + Math.random(), vx: Math.random()-0.5, type: 'snow'});
    }
    
    if (gameTime % 5 === 0) {
        for (let y = worldHeight - 2; y >= 0; y--) {
            for (let x = 0; x < worldWidth; x++) {
                if (world[y][x] === BLOCKS.WATER && world[y+1][x] === BLOCKS.AIR) {
                    world[y+1][x] = BLOCKS.WATER;
                    world[y][x] = BLOCKS.AIR;
                }
            }
        }
    }

    let blockAtFeet = getBlock(Math.floor((player.x + player.width/2)/TILE_SIZE), Math.floor((player.y + player.height/2)/TILE_SIZE));
    let blockBelow = getBlock(Math.floor((player.x + player.width/2)/TILE_SIZE), Math.floor((player.y + player.height + 2)/TILE_SIZE));
    
    player.inWater = (blockAtFeet === BLOCKS.WATER);
    let inLava = (blockAtFeet === BLOCKS.LAVA);
    let onIce = (blockBelow === BLOCKS.ICE);
    let onBounce = (blockBelow === BLOCKS.BOUNCE);
    let onPlank = (blockBelow === BLOCKS.PLANK);

    let moveSpeed = player.speed;
    let friction = 0.8; 
    if (onIce) friction = 0.98;

    if (player.inWater) { moveSpeed *= 0.5; friction = 0.7; }
    if (inLava) { moveSpeed *= 0.1; friction = 0.5; }

    if (keys['KeyA'] || keys['ArrowLeft']) { 
        player.vx -= moveSpeed * 0.2; 
        player.facingRight = false; 
    } else if (keys['KeyD'] || keys['ArrowRight']) { 
        player.vx += moveSpeed * 0.2; 
        player.facingRight = true; 
    } else {
        player.vx *= friction;
    }
    
    if (player.vx > moveSpeed) player.vx = moveSpeed;
    if (player.vx < -moveSpeed) player.vx = -moveSpeed;
    if (Math.abs(player.vx) < 0.1) player.vx = 0;

    if (keys['Space'] || keys['ArrowUp'] || keys['KeyW']) {
        if (player.inWater) {
            let headBlockX = Math.floor((player.x + player.width/2)/TILE_SIZE);
            let headBlockY = Math.floor((player.y)/TILE_SIZE);
            let blockAboveHead = getBlock(headBlockX, headBlockY - 1);
            
            if (blockAboveHead === BLOCKS.AIR) player.vy = JUMP_FORCE * 0.5;
            else player.vy = -3;
        } else if (player.grounded) {
            let jumpPower = JUMP_FORCE;
            if (onBounce) jumpPower *= 1.5; 
            player.vy = jumpPower;
            player.grounded = false;
            player.jumps = 1;
            playTone(300, 'square', 0.1);
        }
    }

    if (onPlank && player.grounded) {
        let tx = Math.floor((player.x + player.width/2)/TILE_SIZE);
        let ty = Math.floor((player.y + player.height + 2)/TILE_SIZE);
        let exists = crumbleTimers.find(c => c.x === tx && c.y === ty);
        if (!exists) {
            crumbleTimers.push({x: tx, y: ty, time: 30}); 
        }
    }
    
    for (let i = crumbleTimers.length - 1; i >= 0; i--) {
        let c = crumbleTimers[i];
        c.time--;
        if (c.time <= 0) {
            setBlock(c.x, c.y, BLOCKS.AIR);
            spawnParticles(c.x * TILE_SIZE + TILE_SIZE/2, c.y * TILE_SIZE + TILE_SIZE/2, '#D2B48C', 5);
            crumbleTimers.splice(i, 1);
        }
    }

    if (player.inWater) {
         player.vy += 0.1;
         if(player.vy > 3) player.vy = 3;
         player.breath -= 0.5;
         if(player.breath <= 0 && gameTime % 30 === 0) takeDamage(5);
    } else {
         player.vy += GRAVITY;
         player.breath = Math.min(player.breath + 1, 100);
    }
    
    if (inLava && gameTime % 30 === 0) takeDamage(10);

    if (player.vy > TERMINAL_VELOCITY) player.vy = TERMINAL_VELOCITY;
    if (player.attackTimer > 0) player.attackTimer--;
    if (player.actionTimer > 0) player.actionTimer--;

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

    if (gameState === "PLAY") {
        if (mouse.leftDown) handleInteraction(0);
        if (mouse.rightDown) handleInteraction(2);
    }

    let px = Math.floor((player.x + player.width/2) / TILE_SIZE);
    let py = Math.floor((player.y + player.height/2) / TILE_SIZE);
    if (getBlock(px, py) === BLOCKS.GOAL) {
        completeLevel();
    }

    if (player.y > worldHeight * TILE_SIZE + 100) die();
    if (player.hp <= 0) die();

    let targetCamX = player.x + player.width / 2 - width / 2;
    let targetCamY = player.y + player.height / 2 - height / 2;
    camera.x += (targetCamX - camera.x) * 0.1;
    camera.y += (targetCamY - camera.y) * 0.1;

    updateMobs();
    updateProjectiles();
    updateParticles();
    updateTNTs();
    updateHUD(); 
}

function updateTNTs() {
    for (let i = activeTNTs.length - 1; i >= 0; i--) {
        let tnt = activeTNTs[i];
        tnt.timer--;
        if (tnt.timer % 20 === 0) spawnParticles(tnt.x, tnt.y, '#fff', 1);
        if (tnt.timer <= 0) {
            explode(tnt.x, tnt.y, 4, true); 
            activeTNTs.splice(i, 1);
        }
    }
}

function updateMobs() {
    if (activeBoss) {
        let distToBoss = Math.abs(player.x - activeBoss.x);
        let hud = document.getElementById('boss-hud');
        if (distToBoss < 800 && activeBoss.hp > 0) {
            hud.style.display = 'block';
            let pct = (activeBoss.hp / activeBoss.maxHp) * 100;
            document.getElementById('boss-hp-bar').style.width = pct + '%';
        } else {
            hud.style.display = 'none';
        }
    }

    for (let i = mobs.length - 1; i >= 0; i--) {
        let m = mobs[i];
        let dist = player.x - m.x;
        let range = 600;
        let mCx = Math.floor((m.x + m.width/2) / TILE_SIZE);
        let mCy = Math.floor((m.y + m.height/2) / TILE_SIZE);
        let mBlock = getBlock(mCx, mCy);
        
        let speedMult = 1.0;
        if (mBlock === BLOCKS.WATER) { speedMult = 0.5; m.vy = Math.min(m.vy, 2); } 
        else if (mBlock === BLOCKS.LAVA) {
            speedMult = 0.1;
            if (gameTime % 30 === 0) { m.hp -= 10; m.hurtTimer = 10; spawnParticles(mCx, mCy, '#ff0000', 2); }
        }

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
            
            if (checkRectOverlap(player, m)) {
                if (gameTime % 20 === 0) {
                    let dmg = 5 + currentLevel;
                    if (m.type === 'boss') dmg = 20 + currentLevel;
                    takeDamage(dmg);
                    player.vx = (player.x < m.x ? -10 : 10);
                    player.vy = -5;
                    shake = 5;
                }
            }
        } else {
            if(!m.fly) m.vx *= 0.9;
        }

        if(!m.fly) {
            if (mBlock === BLOCKS.WATER) m.vy += 0.1;
            else m.vy += GRAVITY;
        }
        
        m.x += m.vx;
        checkEntityCollision(m, 'x');
        m.y += m.vy;
        m.grounded = false;
        checkEntityCollision(m, 'y');

        if (m.hurtTimer > 0) m.hurtTimer--;

        if (m.y > worldHeight * TILE_SIZE + 100) {
             mobs.splice(i, 1); 
        } else if (m.hp <= 0) {
            spawnParticles(m.x/TILE_SIZE, m.y/TILE_SIZE, m.color, 30);
            addGold(m.reward);
            spawnFloatingText(m.x, m.y, `+${m.reward}g`, '#FFD700');
            if (m.type === 'boss') {
                activeBoss = null;
                document.getElementById('boss-hud').style.display = 'none';
                shake = 20; 
            }
            mobs.splice(i, 1);
        }
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; 
        p.life--;

        let tx = Math.floor(p.x / TILE_SIZE);
        let ty = Math.floor(p.y / TILE_SIZE);
        let b = getBlock(tx, ty);
        let bDef = BLOCK_DEF[b] || {};
        if ((b !== BLOCKS.AIR && !bDef.fluid) || p.life <= 0) {
            explode(tx, ty, 1.2, false); 
            projectiles.splice(i, 1);
            continue;
        }

        for (let m of mobs) {
            if (p.x > m.x && p.x < m.x + m.width && p.y > m.y && p.y < m.y + m.height) {
                m.hp -= 30 + (player.damage); 
                m.hurtTimer = 10;
                spawnParticles(m.x/TILE_SIZE, m.y/TILE_SIZE, '#FF5722', 10);
                explode(Math.floor(p.x/TILE_SIZE), Math.floor(p.y/TILE_SIZE), 1.2, false); 
                projectiles.splice(i, 1);
                break;
            }
        }
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
    
    for (let i = weatherParticles.length - 1; i >= 0; i--) {
        let p = weatherParticles[i];
        p.x += (p.vx || 0) - player.vx; 
        p.y += p.vy;
        if(p.y > height) weatherParticles.splice(i, 1);
    }
}

function checkRectOverlap(a, b) {
    return (a.x < b.x + b.width && a.x + a.width > b.x &&
            a.y < b.y + b.height && a.y + a.height > b.y);
}

function isBlocked(entity) {
    let tx = Math.floor((entity.x + (entity.vx > 0 ? entity.width + 5 : -5)) / TILE_SIZE);
    let ty = Math.floor((entity.y + entity.height - 5) / TILE_SIZE);
    let b = getBlock(tx, ty);
    let def = BLOCK_DEF[b] || {};
    return b !== BLOCKS.AIR && !def.fluid;
}

function checkEntityCollision(ent, axis) {
    let left = Math.floor(ent.x / TILE_SIZE);
    let right = Math.floor((ent.x + ent.width - 0.01) / TILE_SIZE);
    let top = Math.floor(ent.y / TILE_SIZE);
    let bottom = Math.floor((ent.y + ent.height - 0.01) / TILE_SIZE);

    for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
            let b = getBlock(x, y);
            if (b === BLOCKS.AIR) continue;
            let def = BLOCK_DEF[b];
            if (!def) continue;
            if (def.fluid) continue; 
            
            if (b === BLOCKS.SPIKE && ent === player) {
                 takeDamage(10);
                 ent.vy = -10; 
                 shake = 5;
            }
            
            if (b !== BLOCKS.GOAL && b !== BLOCKS.SPIKE && !def.alpha) {
                if (axis === 'x') {
                    if (ent.vx > 0) ent.x = x * TILE_SIZE - ent.width;
                    else if (ent.vx < 0) ent.x = (x + 1) * TILE_SIZE;
                    ent.vx = 0;
                } else {
                    if (ent.vy > 0) {
                        ent.y = y * TILE_SIZE - ent.height;
                        ent.grounded = true;
                        ent.vy = 0;
                    } else if (ent.vy < 0) {
                        ent.y = (y + 1) * TILE_SIZE;
                        ent.vy = 0;
                    }
                }
                return;
            }
        }
    }
}

function takeDamage(amount) {
    if(player.invulnerable > 0) return;
    player.hp -= amount;
    player.invulnerable = 15;
    damageFlash = 0.6; 
    updateHUD();
    spawnFloatingText(player.x, player.y, `-${amount}`, '#ff0000');
    playTone(150, 'sawtooth', 0.2);
}

function die() {
    gameState = "DEAD";
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('shop-menu').style.display = 'none';
    document.getElementById('death-menu').style.display = 'block';
    document.getElementById('death-level').innerText = currentLevel;
}

function completeLevel() {
    if(gameState === "SHOP") return;
    gameState = "SHOP";
    addGold(100); 
    document.getElementById('overlay').style.display = 'flex';
    document.getElementById('shop-menu').style.display = 'block';
    document.getElementById('death-menu').style.display = 'none';
    document.getElementById('shop-gold').innerText = Math.floor(player.gold);
    
    // Update Shop Buttons State
    document.getElementById('btn-wand').className = "shop-item" + (player.hasWand ? " owned" : "");
    document.getElementById('btn-axe').className = "shop-item" + (player.hasAxe ? " owned" : "");
    document.getElementById('btn-spear').className = "shop-item" + (player.hasSpear ? " owned" : "");
}

function handleInteraction(button) {
    if (player.actionTimer > 0) return;
    
    let mx = mouse.x + camera.x;
    let my = mouse.y + camera.y;
    let tx = Math.floor(mx / TILE_SIZE);
    let ty = Math.floor(my / TILE_SIZE);

    let dist = Math.hypot(player.x + player.width/2 - mx, player.y + player.height/2 - my);
    let selected = inventory[selectedBlockIndex];
    
    // Weapon Logic
    if (button === 0 && (selected === ITEMS.SWORD || selected === ITEMS.WAND || selected === ITEMS.AXE || selected === ITEMS.SPEAR)) {
        if (player.attackTimer <= 0) {
             if (selected === ITEMS.WAND) shootWand(mx, my);
             else performAttack(selected); 
             player.actionTimer = 10; 
             playTone(600, 'square', 0.05);
        }
        return;
    }
    
    if (dist > INTERACTION_RANGE) return;
    player.actionTimer = 8; 

    if (button === 0) { // Mine
        let current = getBlock(tx, ty);
        if (current === BLOCKS.GOAL) return; 

        if (current === BLOCKS.TNT) {
            setBlock(tx, ty, BLOCKS.AIR);
            activeTNTs.push({ x: tx, y: ty, timer: 120 });
            spawnFloatingText(mx, my, "Ignited!", "#ff5252");
        }
        else if (current !== BLOCKS.AIR) {
            let def = BLOCK_DEF[current] || {};
            
            if (def.hard) {
                if (worldHealth[ty][tx] > 1) {
                     worldHealth[ty][tx]--;
                     spawnParticles(tx * TILE_SIZE + TILE_SIZE/2, ty * TILE_SIZE + TILE_SIZE/2, '#888', 2);
                     return; 
                }
            }

            if (player.gold >= 1) {
                player.gold -= 1;
                updateHUD();
                spawnFloatingText(mx, my, "-1g", "#ffff00");

                if (def.value) {
                     addGold(def.value); 
                     spawnFloatingText(mx, my - 20, `+$${def.value}`, '#FFD700');
                }
                if (def.color) spawnParticles(tx, ty, def.color);
                setBlock(tx, ty, BLOCKS.AIR);
                playTone(200, 'triangle', 0.05);
            } else {
                spawnFloatingText(mx, my, "Need Gold!", "#ff0000");
            }
        }
    } else if (button === 2) { // Place
        if (selected >= 100) return; 

        let px = player.x / TILE_SIZE;
        let py = player.y / TILE_SIZE;
        let pw = player.width / TILE_SIZE;
        let ph = player.height / TILE_SIZE;
        
        if (!(tx >= px + pw || tx + 1 <= px || ty >= py + ph || ty + 1 <= py)) return;
        
        let current = getBlock(tx, ty);
        let def = BLOCK_DEF[current] || {};
        
        if (current === selected) return;

        if (current === BLOCKS.AIR || def.alpha) {
            let cost = 1;
            if (selected === BLOCKS.WATER) cost = 5;
            else if (selected === BLOCKS.LAVA) cost = 30;
            else if (selected === BLOCKS.TNT) cost = 10;

            if (player.gold >= cost) {
                player.gold -= cost;
                updateHUD();
                spawnFloatingText(mx, my, `-${cost}g`, "#ffff00");
                setBlock(tx, ty, selected);
                let newDef = BLOCK_DEF[selected];
                worldHealth[ty][tx] = (newDef && newDef.hard) ? newDef.maxHp : 1;
                playTone(300, 'sine', 0.05);
            } else {
                spawnFloatingText(mx, my, "Need Gold!", "#ff0000");
            }
        }
    }
}

function shootWand(mx, my) {
    player.attackTimer = 12; 
    let angle = Math.atan2(my - (player.y + 10), mx - (player.x + 10));
    projectiles.push({
        x: player.x + 10,
        y: player.y + 10,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        life: 60
    });
    playTone(500, 'square', 0.1);
}

function performAttack(weaponType) {
    player.attackTimer = 8; 
    let reach = 80;
    let damageMult = 1.0;

    if (weaponType === ITEMS.AXE) { reach = 70; damageMult = 1.5; player.attackTimer = 12; } 
    if (weaponType === ITEMS.SPEAR) { reach = 130; damageMult = 0.8; } 

    let hitX = player.x + player.width/2 - reach/2;
    if (player.facingRight) hitX = player.x + player.width/2 - 10;
    else hitX = player.x + player.width/2 - reach + 10;

    let hitY = player.y - 10;
    let hitW = reach;
    let hitH = player.height + 20;

    mobs.forEach(m => {
        if (hitX < m.x + m.width && hitX + hitW > m.x &&
            hitY < m.y + m.height && hitY + hitH > m.y) {
            
            m.hp -= player.damage * damageMult;
            m.hurtTimer = 10;
            m.vy = -5;
            m.vx = player.facingRight ? 8 : -8;
            spawnParticles(m.x/TILE_SIZE, m.y/TILE_SIZE, '#fff', 5);
            spawnFloatingText(m.x, m.y, Math.floor(player.damage * damageMult), '#fff');
            shake = 2; 
            playTone(100, 'sawtooth', 0.1);
        }
    });
}

function explode(cx, cy, radius, hurtPlayer = true) { 
    if (getBlock(cx, cy) === BLOCKS.GOAL) return;
    
    setBlock(cx, cy, BLOCKS.AIR);
    spawnParticles(cx, cy, '#ff0000', 30);
    shake = radius * 2; 
    playTone(50, 'sawtooth', 0.5);
    
    let r = Math.ceil(radius);
    for (let y = cy - r; y <= cy + r; y++) {
        for (let x = cx - r; x <= cx + r; x++) {
            if ((x-cx)*(x-cx) + (y-cy)*(y-cy) <= radius*radius) {
                let b = getBlock(x,y);
                if (b !== BLOCKS.BRICK && b !== BLOCKS.GOAL) {
                    setBlock(x, y, BLOCKS.AIR);
                    if (Math.random() > 0.5) spawnParticles(x, y, '#555', 2);
                }
            }
        }
    }
    
    mobs.forEach(m => {
        let dx = (m.x/TILE_SIZE) - cx;
        let dy = (m.y/TILE_SIZE) - cy;
        let dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < radius + 1) {
            let damageFactor = 1 - (dist / (radius + 2)); 
            if(damageFactor < 0) damageFactor = 0;
            m.hp -= 50 * damageFactor; 
            m.vy = -10;
        }
    });

    if (hurtPlayer) {
        let pdx = (player.x/TILE_SIZE) - cx;
        let pdy = (player.y/TILE_SIZE) - cy;
        let pDist = Math.sqrt(pdx*pdx + pdy*pdy);
        if (pDist < radius + 1) {
            let damageFactor = 1 - (pDist / (radius + 2));
            takeDamage(Math.floor(25 * damageFactor));
            player.vx += (pdx / pDist) * 10; 
            player.vy += (pdy / pDist) * 10;
        }
    }
}

function draw() {
    let timeNorm = (Math.sin(gameTime * 0.001) + 1) / 2;
    let r, g, b;
    
    if (weather === "RAIN") { r = 50; g = 60; b = 80; } 
    else {
        r = Math.floor(135 * timeNorm); g = Math.floor(206 * timeNorm); b = Math.floor(235 * timeNorm);
        r = Math.max(20, r); g = Math.max(20, g); b = Math.max(50, b);
    }
    
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, width, height);

    if (weather === "NONE") {
        ctx.fillStyle = timeNorm > 0.5 ? '#FFD700' : '#F4F6F0';
        let sunY = height/2 + Math.cos(gameTime * 0.001) * (height/2 + 50);
        let sunX = width/2 + Math.sin(gameTime * 0.001) * (width/2);
        ctx.beginPath(); ctx.arc(sunX, sunY, 40, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = weather === "RAIN" ? `rgba(0, 0, 0, 0.4)` : `rgba(0, 0, 0, 0.2)`;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for(let i=0; i<=width; i+=10) {
        let wx = i + camera.x * 0.1; 
        let mh = 150 + Math.sin(wx * 0.005) * 50 + Math.sin(wx * 0.02) * 20; 
        ctx.lineTo(i, height - mh);
    }
    ctx.lineTo(width, height);
    ctx.fill();

    ctx.save();
    let shakeX = (Math.random() - 0.5) * shake;
    let shakeY = (Math.random() - 0.5) * shake;
    ctx.translate(-Math.floor(camera.x) + shakeX, -Math.floor(camera.y) + shakeY);

    const startCol = Math.floor(camera.x / TILE_SIZE);
    const endCol = startCol + (width / TILE_SIZE) + 2;
    const startRow = Math.floor(camera.y / TILE_SIZE);
    const endRow = startRow + (height / TILE_SIZE) + 2;

    for (let y = Math.max(0, startRow); y < Math.min(worldHeight, endRow); y++) {
        for (let x = Math.max(0, startCol); x < Math.min(worldWidth, endCol); x++) {
            let type = world[y][x];
            if (type !== BLOCKS.AIR) {
                let def = BLOCK_DEF[type];
                let px = x * TILE_SIZE;
                let py = y * TILE_SIZE;
                
                if (type === BLOCKS.WATER) {
                    let isSurface = getBlock(x, y-1) === BLOCKS.AIR;
                    ctx.fillStyle = def.color;
                    if (isSurface) {
                        ctx.fillRect(px, py + 6, TILE_SIZE, TILE_SIZE - 6);
                        ctx.fillStyle = "rgba(255,255,255,0.4)";
                        let wave = Math.sin((x + gameTime * 0.1)) * 3;
                        ctx.fillRect(px, py + 4 + wave, TILE_SIZE, 2);
                    } else {
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        if ((x+y+Math.floor(gameTime/20)) % 7 === 0) {
                            ctx.fillStyle = "rgba(255,255,255,0.2)";
                            ctx.fillRect(px + 10, py + 10, 4, 4);
                         }
                    }
                } else if (type === BLOCKS.LAVA) {
                    ctx.fillStyle = def.color;
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = "#FFEB3B";
                    let bubbleY = (py + gameTime * 0.5 + x*10) % TILE_SIZE;
                    ctx.fillRect(px + (x*7)%20 + 5, py + TILE_SIZE - bubbleY, 4, 4);
                } else if (type === BLOCKS.TNT) {
                    ctx.fillStyle = def.color;
                    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                    ctx.fillStyle = "white";
                    ctx.font = "12px Arial";
                    ctx.textAlign = "center";
                    ctx.fillText("TNT", px + TILE_SIZE/2, py + TILE_SIZE/2 + 4);
                    ctx.strokeStyle = "rgba(0,0,0,0.2)";
                    ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                } else {
                    if (def.alpha) ctx.globalAlpha = def.alpha;
                    ctx.fillStyle = def.color;
                    
                    if (def.spike) {
                         ctx.beginPath();
                         ctx.moveTo(px, py + TILE_SIZE);
                         ctx.lineTo(px + TILE_SIZE/2, py);
                         ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE);
                         ctx.fill();
                    } else if (type === BLOCKS.GOAL) {
                        ctx.fillStyle = '#1A237E'; 
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        ctx.fillStyle = '#000';
                        ctx.beginPath();
                        ctx.ellipse(px + TILE_SIZE/2, py + TILE_SIZE/2, 12, 16, 0, 0, Math.PI*2);
                        ctx.fill();
                        let pulse = Math.sin(gameTime * 0.1);
                        ctx.fillStyle = `rgba(0, 229, 255, ${0.6 + pulse * 0.2})`; 
                        ctx.beginPath();
                        ctx.ellipse(px + TILE_SIZE/2, py + TILE_SIZE/2, 8 + pulse, 12 - pulse, gameTime * 0.05, 0, Math.PI*2);
                        ctx.fill();
                    } else {
                        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                        if (def.top) { 
                            ctx.fillStyle = (weather === "SNOW" && type === BLOCKS.GRASS) ? '#ffffff' : def.top; 
                            ctx.fillRect(px, py, TILE_SIZE, 8); 
                        }
                        if (def.speckle) { 
                            ctx.fillStyle = def.speckle; 
                            ctx.fillRect(px+10, py+10, 6, 6); 
                        }
                        if (def.hard) {
                            let hp = worldHealth[y][x];
                            if (hp < def.maxHp) {
                                ctx.strokeStyle = "rgba(0,0,0,0.5)";
                                ctx.lineWidth = 2;
                                ctx.beginPath();
                                ctx.moveTo(px + 5, py + 5);
                                ctx.lineTo(px + 35, py + 35);
                                if(hp < def.maxHp - 1) {
                                    ctx.moveTo(px + 35, py + 5);
                                    ctx.lineTo(px + 5, py + 35);
                                }
                                ctx.stroke();
                            }
                        }
                    }
                    ctx.globalAlpha = 1.0;
                }
            }
        }
        
        activeTNTs.forEach(tnt => {
            let px = tnt.x * TILE_SIZE;
            let py = tnt.y * TILE_SIZE;
            if (Math.floor(gameTime / 5) % 2 === 0) ctx.fillStyle = "#fff";
            else ctx.fillStyle = "#d32f2f";
            ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = "black";
            ctx.font = "12px Arial";
            ctx.textAlign = "center";
            ctx.fillText("TNT", px + TILE_SIZE/2, py + TILE_SIZE/2 + 4);
        });

        mobs.forEach(m => {
            if (m.hurtTimer > 0) ctx.fillStyle = '#fff';
            else ctx.fillStyle = m.color;
            ctx.fillRect(m.x, m.y, m.width, m.height);
            ctx.fillStyle = 'red';
            ctx.fillRect(m.x, m.y - 10, m.width, 4);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(m.x, m.y - 10, m.width * (m.hp / m.maxHp), 4);
            
            ctx.fillStyle = 'black';
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'black';
            
            if (m.hurtTimer > 0) { 
                 ctx.beginPath(); 
                 ctx.moveTo(m.x+5, m.y+8); ctx.lineTo(m.x+10, m.y+13); 
                 ctx.moveTo(m.x+10, m.y+8); ctx.lineTo(m.x+5, m.y+13); 
                 ctx.stroke();
                 
                 ctx.beginPath(); 
                 ctx.moveTo(m.x+m.width-10, m.y+8); ctx.lineTo(m.x+m.width-5, m.y+13); 
                 ctx.moveTo(m.x+m.width-5, m.y+8); ctx.lineTo(m.x+m.width-10, m.y+13); 
                 ctx.stroke();
                 
                 ctx.beginPath(); ctx.arc(m.x + m.width/2, m.y + 18, 4, 0, Math.PI*2); ctx.fill();
            } else { 
                if (m.type === 'bat') {
                     ctx.beginPath();
                     ctx.moveTo(m.x, m.y+10); ctx.lineTo(m.x-10, m.y-5); ctx.lineTo(m.x, m.y+5); ctx.fill();
                     ctx.beginPath();
                     ctx.moveTo(m.x+m.width, m.y+10); ctx.lineTo(m.x+m.width+10, m.y-5); ctx.lineTo(m.x+m.width, m.y+5); ctx.fill();
                } else if (m.type === 'boss') {
                     ctx.fillRect(m.x + 10, m.y + 20, 15, 15);
                     ctx.fillRect(m.x + m.width - 25, m.y + 20, 15, 15);
                     ctx.fillRect(m.x + 20, m.y + 50, m.width - 40, 10);
                } else {
                     ctx.fillRect(m.x + 5, m.y + 8, 4, 4);
                     ctx.fillRect(m.x + m.width - 9, m.y + 8, 4, 4);
                }
            }
        });

        projectiles.forEach(p => {
            ctx.fillStyle = '#FF5722';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
            ctx.fill();
        });

        ctx.save();
        ctx.translate(player.x + player.width/2, player.y + player.height/2);
        
        if(player.spin > 0) ctx.rotate(player.spin * Math.PI / 180);
        
        ctx.translate(-(player.x + player.width/2), -(player.y + player.height/2));

        ctx.fillStyle = '#FFC107'; 
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.fillStyle = '#1E88E5'; ctx.fillRect(player.x, player.y + 16, player.width, 12);
        ctx.fillStyle = '#43A047'; ctx.fillRect(player.x, player.y + 28, player.width, 10);
        
        ctx.fillStyle = 'black';
        let eyeY = player.y + 8;
        let leftEyeX = player.facingRight ? player.x + 14 : player.x + 6;
        let rightEyeX = player.facingRight ? player.x + 22 : player.x + 14;

        if (player.eyeState === 'blink') {
             ctx.fillRect(leftEyeX, eyeY + 2, 4, 1);
             ctx.fillRect(rightEyeX, eyeY + 2, 4, 1);
        } else if (player.eyeState === 'wink') {
             ctx.fillRect(leftEyeX, eyeY, 4, 4);
             ctx.fillRect(rightEyeX, eyeY + 2, 4, 1);
        } else if (player.eyeState === 'surprise') {
             ctx.beginPath(); ctx.arc(leftEyeX + 2, eyeY + 2, 3, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(rightEyeX + 2, eyeY + 2, 3, 0, Math.PI*2); ctx.fill();
        } else if (player.eyeState === 'hurt') {
             ctx.beginPath(); ctx.moveTo(leftEyeX, eyeY); ctx.lineTo(leftEyeX+4, eyeY+4); ctx.moveTo(leftEyeX+4, eyeY); ctx.lineTo(leftEyeX, eyeY+4); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(rightEyeX, eyeY); ctx.lineTo(rightEyeX+4, eyeY+4); ctx.moveTo(rightEyeX+4, eyeY); ctx.lineTo(rightEyeX, eyeY+4); ctx.stroke();
        } else {
             ctx.fillRect(leftEyeX, eyeY, 4, 4);
             ctx.fillRect(rightEyeX, eyeY, 4, 4);
        }
        
        ctx.restore();

        let currentItem = inventory[selectedBlockIndex];
        if (currentItem >= 100) {
            ctx.save();
            ctx.translate(player.x + player.width/2, player.y + 20);
            if (!player.facingRight) ctx.scale(-1, 1);
            let rot = 0;
            if (player.attackTimer > 0) {
                 if (currentItem === ITEMS.SWORD) {
                      let maxT = 8; 
                      let p = 1 - (player.attackTimer / maxT);
                      let ease = 1 - Math.pow(1 - p, 3); 
                      rot = -Math.PI * 0.8 + ease * Math.PI * 1.6; 
                 } else if (currentItem === ITEMS.AXE) {
                      let maxT = 12;
                      let p = 1 - (player.attackTimer / maxT);
                      let ease = 1 - Math.pow(1 - p, 4); 
                      rot = -Math.PI * 0.9 + ease * Math.PI * 1.5;
                 } else if (currentItem === ITEMS.SPEAR) {
                      let maxT = 15;
                      let p = 1 - (player.attackTimer / maxT);
                      let thrust = Math.sin(p * Math.PI) * 20; 
                      ctx.translate(thrust, 0); 
                      rot = 0;
                 } else { 
                      rot = -Math.PI / 4; 
                      if (mouse.leftDown) rot = -Math.PI / 6; 
                 }
            }

            ctx.rotate(rot);
            let def = BLOCK_DEF[currentItem];
            ctx.fillStyle = def.color; 
            
            if (currentItem === ITEMS.SWORD) {
                 ctx.fillRect(10, -4, 20, 6); 
                 ctx.fillStyle = '#5d4037'; ctx.fillRect(0, -2, 10, 4);
            } else if (currentItem === ITEMS.AXE) {
                 ctx.fillStyle = '#5d4037'; ctx.fillRect(0, -2, 25, 4); 
                 ctx.fillStyle = def.color;
                 ctx.beginPath(); ctx.arc(25, 0, 10, Math.PI/2, -Math.PI/2, true); ctx.fill(); 
            } else if (currentItem === ITEMS.SPEAR) {
                 ctx.fillStyle = '#5d4037'; ctx.fillRect(0, -2, 35, 4); 
                 ctx.fillStyle = def.color; 
                 ctx.beginPath(); ctx.moveTo(35, -2); ctx.lineTo(45, 0); ctx.lineTo(35, 2); ctx.fill(); 
            } else { 
                 ctx.fillRect(0, -2, 20, 4);
                 ctx.fillStyle = 'red'; ctx.fillRect(20, -3, 4, 6);
            }
            ctx.restore();
        }

        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        
        if (gameState === "PLAY") {
            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.beginPath();
            ctx.arc(player.x + player.width/2, player.y + player.height/2, INTERACTION_RANGE, 0, Math.PI*2);
            ctx.stroke();
        }
        
        for (let i = floatTexts.length - 1; i >= 0; i--) {
            let ft = floatTexts[i];
            ctx.fillStyle = ft.color;
            ctx.font = "bold 16px Arial";
            ctx.fillText(ft.text, ft.x, ft.y);
            ft.y += ft.vy;
            ft.life--;
            if (ft.life <= 0) floatTexts.splice(i, 1);
        }

        let mx = mouse.x + camera.x;
        let my = mouse.y + camera.y;
        let sx = Math.floor(mx / TILE_SIZE) * TILE_SIZE;
        let sy = Math.floor(my / TILE_SIZE) * TILE_SIZE;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);

        ctx.restore();

        if (weather !== "NONE") {
            ctx.fillStyle = weather === "RAIN" ? "#64B5F6" : "#FFF";
            weatherParticles.forEach(p => {
                if (p.x > width) p.x = 0;
                if (p.x < 0) p.x = width;
                if (p.type === 'rain') ctx.fillRect(p.x, p.y, 2, 10);
                else ctx.fillRect(p.x, p.y, 4, 4);
            });
        }

        if (damageFlash > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${damageFlash})`;
            ctx.fillRect(0, 0, width, height);
            damageFlash -= 0.02; 
        }
    }