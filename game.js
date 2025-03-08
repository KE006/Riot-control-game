// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SPEED = 3;
const CAMERA_SPEED = 5;
const RADIO_COOLDOWN = 30000; // 30 seconds in milliseconds
const GROUND_LEVEL = 400; // Define GROUND_LEVEL
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const BULLET_SPEED = 12;
const MELEE_COOLDOWN = 300; // 300ms between melee attacks
const BATON_RANGE = 50;
const KNIFE_RANGE = 30;
const BATON_DAMAGE = 40;
const KNIFE_DAMAGE = 60;
const GRENADE_THROW_FORCE = 15;
const GRENADE_DAMAGE = 150;
const GRENADE_RADIUS = 100;
const MEDKIT_HEAL = 50;
const MAX_HEALTH = 500;
const OFFICER_HEALTH = 200;
const TRUCK_SPEED = 5;
const BRIEFING_DELAY = 2000; // 2 seconds before briefing appears
const SPAWN_DISTANCE = 2000; // Distance from rioters
const RIOTER_BASE_SPEED = 0.7; // New constant for rioter speed

// Update the truck position constant
const TRUCK_GROUND_LEVEL = GROUND_LEVEL - 100; // Truck sits higher than ground level

// Add venue configurations
const VENUES = {
    "Downtown Business District": {
        background: {
            buildings: true,
            shops: true,
            streetLights: true,
            worldWidth: 4000,
            startX: 100
        },
        boundaries: {
            left: 0,
            right: 4000
        }
    },
    "City Stadium Area": {
        background: {
            stadium: true,
            parkingLot: true,
            fences: true,
            worldWidth: 3500,
            startX: 200
        },
        boundaries: {
            left: 200,
            right: 3300
        }
    },
    "City Hall Plaza": {
        background: {
            cityHall: true,
            plaza: true,
            monuments: true,
            worldWidth: 3000,
            startX: 150
        },
        boundaries: {
            left: 150,
            right: 2850
        }
    }
};

// Add these constants at the top with other game constants
const SCORE_VALUES = {
    RIOTER_ARREST: 100,    // Subduing a rioter non-lethally
    RIOTER_DEFEAT: 50,     // Defeating a rioter with force
    PROPERTY_SAVED: 200,   // Preventing property damage
    CIVILIAN_PROTECTED: 150, // Protecting civilians
    OFFICER_SAVED: 125,    // Healing/protecting fellow officers
    PEACEFUL_RESOLUTION: 300, // Resolving conflict without violence
    COMBO_MULTIPLIER: 1.5   // Multiplier for quick successive arrests
};

// Add these constants at the top
const OFFICER_DIVISIONS = {
    GUNNER: 'gunner',
    MEDIC: 'medic', 
    CLOSE_COMBAT: 'close_combat'
};

const DIVISION_STATS = {
    [OFFICER_DIVISIONS.GUNNER]: {
        health: 200,
        weapon: "SMG",
        color: '#1a478c',
        attackRange: 300,
        attackCooldown: 800,
        damage: 20,
        accuracy: 0.8
    },
    [OFFICER_DIVISIONS.MEDIC]: {
        health: 150,
        weapon: "Medkit",
        color: '#27ae60',
        healRange: 100,
        healAmount: 30,
        healCooldown: 3000,
        // Medics carry pistols for self-defense
        attackRange: 150,
        attackCooldown: 1200,
        damage: 10,
        accuracy: 0.6
    },
    [OFFICER_DIVISIONS.CLOSE_COMBAT]: {
        health: 250,
        weapon: "Baton",
        color: '#2c3e50',
        hasShield: true,
        attackRange: 60,
        attackCooldown: 1000,
        damage: 40,
        chargeSpeed: 4
    }
};

// Game state
let gameState = {
    player: {
        x: 200,
        y: CANVAS_HEIGHT / 2,
        width: 30,
        height: 50,
        inventory: ["SMG", "Baton", "Knife"],
        currentWeapon: 0,
        shieldActive: false,
        lastRadioUse: -Infinity,
        velocityY: 0,
        isJumping: false,
        bullets: [],  // Store active bullets
        health: 100,
        maxHealth: MAX_HEALTH,
        grenades: 3,
        medkits: 2,
        score: 0,
        scoreMultiplier: 1,
        lastScoreTime: 0,
        comboCount: 0,
        statistics: {
            arrestsMade: 0,
            officersSaved: 0,
            propertyProtected: 0,
            civiliansProtected: 0,
            peacefulResolutions: 0
        }
    },
    camera: {
        x: 0
    },
    officers: [],
    rioters: [],
    keys: {
        up: false,
        down: false,
        left: false,
        right: false
    },
    gameWorld: {
        width: 3000 // Total world width
    },
    effects: [],
    mouse: {
        x: 0,
        y: 0
    },
    mission: {
        phase: 'briefing',
        briefingShown: false,
        briefingAcknowledged: false,
        inTruck: false,
        truckPosition: {
            x: 100,
            y: GROUND_LEVEL - 80 // Adjust truck height from ground
        },
        riotCause: getRiotCause()
    }
};

// Initialize the game
function init() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Clear existing officers
    gameState.officers = [];
    
    // Create initial officers with divisions
    createOfficersByDivision(10, OFFICER_DIVISIONS.GUNNER);
    createOfficersByDivision(2, OFFICER_DIVISIONS.MEDIC);
    createOfficersByDivision(8, OFFICER_DIVISIONS.CLOSE_COMBAT);
    
    // Spawn initial rioters
    for (let i = 0; i < 50; i++) {
        gameState.rioters.push({
            x: Math.random() * 400 + 1500,
            y: Math.random() * CANVAS_HEIGHT,
            width: 30,
            height: 50,
            speed: 1 + Math.random() * 2,
            health: 100
        });
    }
    
    // Set world boundaries based on venue
    const venue = VENUES[gameState.mission.riotCause.location];
    gameState.gameWorld.width = venue.background.worldWidth;
    gameState.mission.truckPosition.x = venue.background.startX;
    
    // Update spawn positions based on venue
    gameState.player.x = venue.background.startX;
    gameState.player.y = GROUND_LEVEL - gameState.player.height;
    
    // Position officers near spawn
    gameState.officers.forEach(officer => {
        officer.x = Math.random() * 200 + 20;
        officer.y = GROUND_LEVEL - officer.height;
    });
    
    // Position rioters far away
    gameState.rioters.forEach(rioter => {
        rioter.x = SPAWN_DISTANCE + Math.random() * 400;
        rioter.y = GROUND_LEVEL - rioter.height;
        rioter.active = false; // They won't move until players arrive
    });

    // Show briefing after delay
    setTimeout(() => {
        if (!gameState.mission.briefingShown) {
            showBriefing();
        }
    }, BRIEFING_DELAY);
    
    // Set up event listeners
    setupEventListeners();
    
    // Start the game loop
    gameLoop();
}

// Set up event listeners for keyboard and mouse
function setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', (e) => {
        handleKeyDown(e.key.toLowerCase());
    });
    
    window.addEventListener('keyup', (e) => {
        handleKeyUp(e.key.toLowerCase());
    });
    
    const canvas = document.getElementById('gameCanvas');
    
    // Mouse events
    canvas.addEventListener('click', (e) => {
        handleMouseClick(e);
    });
    
    // Track mouse position
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        gameState.mouse.x = e.clientX - rect.left;
        gameState.mouse.y = e.clientY - rect.top;
    });
}

// Handle key down events
function handleKeyDown(key) {
    switch (key) {
        case 'w':
            if (!gameState.mission.inTruck && nearTruck()) {
                enterTruck();
            } else if (gameState.mission.inTruck) {
                exitTruck();
            }
            break;
        case 's':
        case 'arrowdown':
            gameState.keys.down = true;
            break;
        case 'a':
        case 'arrowleft':
            gameState.keys.left = true;
            break;
        case 'd':
        case 'arrowright':
            gameState.keys.right = true;
            break;
        case 'e':
            // Cycle through weapons
            gameState.player.currentWeapon = (gameState.player.currentWeapon + 1) % gameState.player.inventory.length;
            updateUI();
            break;
        case 'y':
            // Toggle shield
            gameState.player.shieldActive = !gameState.player.shieldActive;
            updateUI();
            break;
        case 'r':
            // Use radio to call for backup
            useRadio();
            break;
        case ' ':  // Space to shoot
            shoot(gameState.player);
            break;
        case 'shift':  // Shift to jump
            if (!gameState.player.isJumping) {
                gameState.player.velocityY = JUMP_FORCE;
                gameState.player.isJumping = true;
            }
            break;
        case 'f':
            throwGrenade(gameState.player);
            break;
        case 'm':
            useMedkit(gameState.player);
            break;
        case 'u':
            console.log("U key pressed");
            console.log("In truck:", gameState.mission.inTruck);
            console.log("Near riot:", nearRiot());
            if (gameState.mission.inTruck && nearRiot()) {
                deployOfficers();
            }
            break;
    }
}

// Handle key up events
function handleKeyUp(key) {
    switch (key) {
        case 'w':
        case 'arrowup':
            gameState.keys.up = false;
            break;
        case 's':
        case 'arrowdown':
            gameState.keys.down = false;
            break;
        case 'a':
        case 'arrowleft':
            gameState.keys.left = false;
            break;
        case 'd':
        case 'arrowright':
            gameState.keys.right = false;
            break;
    }
}

// Handle mouse click events
function handleMouseClick(e) {
    shoot(gameState.player);
}

// Use radio to call for backup
function useRadio() {
    const currentTime = Date.now();
    
    if (currentTime - gameState.player.lastRadioUse >= RADIO_COOLDOWN) {
        // Call for backup with division distribution
        createOfficersByDivision(10, OFFICER_DIVISIONS.GUNNER);
        createOfficersByDivision(2, OFFICER_DIVISIONS.MEDIC);
        createOfficersByDivision(8, OFFICER_DIVISIONS.CLOSE_COMBAT);
        
        gameState.player.lastRadioUse = currentTime;
        updateUI();
        
        // Show radio call effect
        showObjective("Backup units arriving!");
    }
}

// Attack function
function attack(targetX, targetY) {
    const weapon = gameState.player.inventory[gameState.player.currentWeapon];
    let range = 0;
    let damage = 0;
    
    // Set range and damage based on weapon
    switch (weapon) {
        case "SMG":
            range = 300;
            damage = 25;
            break;
        case "Baton":
            range = 80;
            damage = 50;
            break;
        case "Knife":
            range = 50;
            damage = 75;
            break;
    }
    
    // Check for hits on rioters
    for (let i = 0; i < gameState.rioters.length; i++) {
        const rioter = gameState.rioters[i];
        const rioterScreenX = rioter.x - gameState.camera.x;
        
        // Calculate distance to rioter
        const dx = rioterScreenX + rioter.width / 2 - (gameState.player.x + gameState.player.width / 2);
        const dy = rioter.y + rioter.height / 2 - (gameState.player.y + gameState.player.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= range) {
            // Hit the rioter
            rioter.health -= damage;
            
            // Remove rioter if health is depleted
            if (rioter.health <= 0) {
                gameState.rioters.splice(i, 1);
                i--;
                
                // Check if we need to spawn more rioters
                if (gameState.rioters.length <= 10) {
                    spawnMoreRioters();
                }
            }
        }
    }
}

// Update spawnMoreRioters function
function spawnMoreRioters() {
    const baseY = GROUND_LEVEL; // Base ground level for rioters
    const spawnWidth = 400; // Width of spawn area
    const spawnStartX = SPAWN_DISTANCE; // Starting X position for spawn area

    for (let i = 0; i < 100; i++) {
        // Create rioter with proper positioning and initialization
        const rioter = {
            x: spawnStartX + Math.random() * spawnWidth,
            y: baseY - 50, // 50 is rioter height
            width: 30,
            height: 50,
            speed: RIOTER_BASE_SPEED + Math.random() * 2,
            health: 100,
            velocityY: 0,
            active: true, // Make them active immediately if riot has started
            isJumping: false
        };

        // If the riot hasn't started yet, make them inactive
        if (!gameState.rioters.some(r => r.active)) {
            rioter.active = false;
        }

        gameState.rioters.push(rioter);
    }
    updateUI();
}

// Update the UI elements
function updateUI() {
    document.getElementById('weapon').textContent = `Current Weapon: ${gameState.player.inventory[gameState.player.currentWeapon]}`;
    document.getElementById('shield').textContent = `Shield: ${gameState.player.shieldActive ? 'Active' : 'Ready'}`;
    
    const radioStatus = Date.now() - gameState.player.lastRadioUse >= RADIO_COOLDOWN ? 'Ready' : 'Cooldown';
    document.getElementById('radio').textContent = `Radio: ${radioStatus}`;
    
    document.getElementById('officers').textContent = `Officers: ${gameState.officers.length}`;
    document.getElementById('rioters').textContent = `Rioters: ${gameState.rioters.length}`;
    document.getElementById('health').textContent = `Health: ${Math.ceil(gameState.player.health)}`;
    document.getElementById('score').textContent = `Score: ${gameState.player.score}`;
    document.getElementById('grenades').textContent = `Grenades: ${gameState.player.grenades}`;
    document.getElementById('medkits').textContent = `Medkits: ${gameState.player.medkits}`;
}

// Update game state
function update() {
    const venue = VENUES[gameState.mission.riotCause.location];

    if (gameState.mission.inTruck) {
        // Truck movement
        if (gameState.keys.right) {
            const newX = gameState.mission.truckPosition.x + TRUCK_SPEED;
            if (newX < venue.boundaries.right - 160) {
                gameState.mission.truckPosition.x = newX;
            }
        }
        if (gameState.keys.left) {
            const newX = gameState.mission.truckPosition.x - TRUCK_SPEED;
            if (newX > venue.boundaries.left) {
                gameState.mission.truckPosition.x = newX;
            }
        }

        // Camera follows truck
        const targetCameraX = gameState.mission.truckPosition.x - CANVAS_WIDTH * 0.3;
        gameState.camera.x += (targetCameraX - gameState.camera.x) * 0.1; // Smooth camera movement
    } else {
        // Normal player movement
        if (gameState.keys.left) {
            const newX = gameState.player.x - PLAYER_SPEED;
            if (newX > venue.boundaries.left) {
                gameState.player.x = newX;
            }
        }
        if (gameState.keys.right) {
            const newX = gameState.player.x + PLAYER_SPEED;
            if (newX < venue.boundaries.right - gameState.player.width) {
                gameState.player.x = newX;
            }
        }

        // Camera follows player
        const CAMERA_MARGIN = CANVAS_WIDTH * 0.3;
        if (gameState.player.x > CAMERA_MARGIN + gameState.camera.x) {
            gameState.camera.x = gameState.player.x - CAMERA_MARGIN;
        } else if (gameState.player.x < gameState.camera.x + CAMERA_MARGIN) {
            gameState.camera.x = gameState.player.x - CAMERA_MARGIN;
        }
    }

    // Keep camera within world bounds
    if (gameState.camera.x < venue.boundaries.left) {
        gameState.camera.x = venue.boundaries.left;
    }
    if (gameState.camera.x > venue.boundaries.right - CANVAS_WIDTH) {
        gameState.camera.x = venue.boundaries.right - CANVAS_WIDTH;
    }

    // Update officers in truck
    if (gameState.mission.inTruck) {
        gameState.officers.forEach(officer => {
            if (officer.inTruck && officer.truckOffset) {
                officer.x = gameState.mission.truckPosition.x + officer.truckOffset.x;
                officer.y = gameState.mission.truckPosition.y + officer.truckOffset.y;
            }
        });
    }

    // Update rioters
    gameState.rioters.forEach(rioter => {
        if (!rioter.active) return;

        // Find nearest target (player or officer)
        let nearestTarget = gameState.player;
        let minDistance = Infinity;

        // Check distance to player
        const dxPlayer = gameState.player.x - rioter.x;
        const dyPlayer = gameState.player.y - rioter.y;
        minDistance = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);

        // Check distance to officers
        gameState.officers.forEach(officer => {
            if (!officer.inTruck) {
                const dx = officer.x - rioter.x;
                const dy = officer.y - rioter.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestTarget = officer;
                }
            }
        });

        // Move towards nearest target
        if (nearestTarget) {
            const dx = nearestTarget.x - rioter.x;
            rioter.x += Math.sign(dx) * rioter.speed;

            // Apply gravity
            rioter.velocityY += GRAVITY;
            rioter.y += rioter.velocityY;

            // Ground collision
            if (rioter.y > GROUND_LEVEL - rioter.height) {
                rioter.y = GROUND_LEVEL - rioter.height;
                rioter.velocityY = 0;
                rioter.isJumping = false;
            }

            // Random jumping
            if (!rioter.isJumping && Math.random() < 0.01) {
                rioter.velocityY = JUMP_FORCE;
                rioter.isJumping = true;
            }
        }
    });

    // Update officers
    gameState.officers.forEach(officer => {
        if (!officer.inTruck) {
            updateOfficerBehavior(officer);
            
            // Apply gravity
            officer.velocityY += GRAVITY;
            officer.y += officer.velocityY;

            // Ground collision
            if (officer.y > GROUND_LEVEL - officer.height) {
                officer.y = GROUND_LEVEL - officer.height;
                officer.velocityY = 0;
                officer.isJumping = false;
            }
        }
    });

    // Update bullets
    if (gameState.player.bullets) {
        updateBullets(gameState.player.bullets);
    }

    gameState.officers.forEach(officer => {
        if (officer.bullets) {
            updateBullets(officer.bullets);
        }
    });

    // Update grenades
    if (gameState.grenades) {
        for (let i = gameState.grenades.length - 1; i >= 0; i--) {
            const grenade = gameState.grenades[i];
            
            // Apply gravity and update position
            grenade.velocityY += GRAVITY;
            grenade.x += grenade.velocityX;
            grenade.y += grenade.velocityY;

            // Ground collision
            if (grenade.y > GROUND_LEVEL - grenade.height) {
                grenade.y = GROUND_LEVEL - grenade.height;
                grenade.velocityY *= -0.5;
                grenade.velocityX *= 0.7;
            }

            // Update explosion timer
            grenade.timeToExplode--;
            if (grenade.timeToExplode <= 0) {
                // Explosion damage
                gameState.rioters.forEach((rioter, index) => {
                    const dx = rioter.x - grenade.x;
                    const dy = rioter.y - grenade.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance <= GRENADE_RADIUS) {
                        const damage = GRENADE_DAMAGE * (1 - distance/GRENADE_RADIUS);
                        rioter.health -= damage;
                        
                        if (rioter.health <= 0) {
                            gameState.rioters.splice(index, 1);
                            gameState.player.score += 100;
                            if (gameState.rioters.length <= 10) {
                                spawnMoreRioters();
                            }
                        }
                    }
                });

                // Add explosion effect
                gameState.effects.push({
                    type: 'explosion',
                    x: grenade.x,
                    y: grenade.y,
                    radius: GRENADE_RADIUS,
                    duration: 15
                });

                // Remove grenade
                gameState.grenades.splice(i, 1);
            }
        }
    }

    // Check for player damage from rioters
    gameState.rioters.forEach(rioter => {
        const dx = rioter.x - gameState.player.x;
        const dy = rioter.y - gameState.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 50 && !gameState.player.shieldActive) {
            gameState.player.health -= 1;
            if (gameState.player.health <= 0) {
                // Game over logic here
                gameState.player.health = 0;
            }
            updateUI();
        }
    });

    // Handle medic healing
    gameState.officers.forEach(medic => {
        if (medic.division === OFFICER_DIVISIONS.MEDIC && !medic.inTruck) {
            const currentTime = Date.now();
            if (currentTime - medic.lastHeal >= DIVISION_STATS.medic.healCooldown) {
                // Find wounded officers in range
                gameState.officers.forEach(wounded => {
                    if (wounded !== medic && wounded.health < wounded.maxHealth) {
                        const dx = wounded.x - medic.x;
                        const dy = wounded.y - medic.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance <= DIVISION_STATS.medic.healRange) {
                            wounded.health = Math.min(
                                wounded.maxHealth, 
                                wounded.health + DIVISION_STATS.medic.healAmount
                            );
                            medic.lastHeal = currentTime;
                            
                            // Add healing effect
                            gameState.effects.push({
                                type: 'heal',
                                x: wounded.x + wounded.width/2,
                                y: wounded.y + wounded.height/2,
                                duration: 30,
                                radius: 20
                            });
                        }
                    }
                });
            }
        }
    });

    // Update UI
    updateUI();
}

// Render the game
function render() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw venue-specific background
    drawVenueBackground(ctx, VENUES[gameState.mission.riotCause.location]);
    
    // Draw city background
    drawCityBackground(ctx);
    
    // Draw ground
    drawGround(ctx);
    
    // Draw player
    drawPlayer(ctx, gameState.player);
    
    // Draw officers
    gameState.officers.forEach(officer => {
        if (!officer.inTruck) {
            const screenX = officer.x - gameState.camera.x;
            if (screenX + officer.width >= 0 && screenX <= CANVAS_WIDTH) {
                drawOfficer(ctx, officer);
            }
        }
    });
    
    // Draw rioters
    gameState.rioters.forEach(rioter => {
        drawRioter(ctx, rioter);
    });
    
    // Draw bullets
    drawBullets(ctx);

    // Draw grenades
    if (gameState.grenades) {
        ctx.fillStyle = '#333';
        gameState.grenades.forEach(grenade => {
            const screenX = grenade.x - gameState.camera.x;
            ctx.beginPath();
            ctx.arc(screenX, grenade.y, grenade.width/2, 0, Math.PI * 2);
            ctx.fill();
            // Draw pin
            ctx.fillStyle = '#666';
            ctx.fillRect(screenX - 2, grenade.y - 8, 4, 6);
        });
    }

    // Draw effects with enhanced explosions
    gameState.effects.forEach(effect => {
        if (effect.type === 'explosion') {
            // Draw shockwave
            const gradient = ctx.createRadialGradient(
                effect.x - gameState.camera.x, effect.y, 0,
                effect.x - gameState.camera.x, effect.y, effect.radius
            );
            gradient.addColorStop(0, 'rgba(255,200,0,0.8)');
            gradient.addColorStop(0.2, 'rgba(255,100,0,0.5)');
            gradient.addColorStop(0.4, 'rgba(255,50,0,0.3)');
            gradient.addColorStop(1, 'rgba(255,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(effect.x - gameState.camera.x, effect.y, effect.radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw particles
            if (effect.particles) {
                effect.particles.forEach(particle => {
                    ctx.fillStyle = particle.color;
                    ctx.beginPath();
                    ctx.arc(
                        particle.x - gameState.camera.x,
                        particle.y,
                        2,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                });
            }
        } else if (effect.type === 'heal') {
            ctx.strokeStyle = '#2ecc71';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(effect.x - gameState.camera.x, effect.y, effect.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    // Draw SWAT truck (draw after officers so truck appears on top)
    drawSWATTruck(ctx);
}

function drawCityBackground(ctx) {
    // Draw distant buildings
    for (let i = 0; i < 40; i++) {
        const x = (i * 80 - (gameState.camera.x * 0.2)) % CANVAS_WIDTH;
        const height = 100 + Math.sin(i * 0.8) * 50;
        
        // Building base
        ctx.fillStyle = '#111827';
        ctx.fillRect(x - 20, GROUND_LEVEL - height, 40, height);
        
        // Windows
        ctx.fillStyle = 'rgba(255, 255, 150, 0.2)';
        for (let w = 0; w < 3; w++) {
            for (let h = 0; h < height/20; h++) {
                if (Math.random() > 0.5) {
                    ctx.fillRect(x - 15 + w * 10, GROUND_LEVEL - height + h * 20, 6, 6);
                }
            }
        }
    }
}

function drawGround(ctx) {
    // Main ground
    const groundGradient = ctx.createLinearGradient(0, GROUND_LEVEL, 0, CANVAS_HEIGHT);
    groundGradient.addColorStop(0, '#2f3542');
    groundGradient.addColorStop(1, '#1e272e');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, GROUND_LEVEL, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_LEVEL);
    
    // Road details
    ctx.strokeStyle = '#fff3';
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(0, GROUND_LEVEL + 30);
    ctx.lineTo(CANVAS_WIDTH, GROUND_LEVEL + 30);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawPlayer(ctx, player) {
    const screenX = player.x - gameState.camera.x;
    
    // Body
    ctx.fillStyle = '#1a478c';
    ctx.fillRect(screenX, player.y, player.width, player.height);
    
    // Riot gear
    // Vest
    ctx.fillStyle = '#2a579c';
    ctx.fillRect(screenX, player.y + 15, player.width, player.height - 25);
    ctx.fillStyle = '#fff';
    ctx.font = '8px Arial';
    ctx.fillText('POLICE', screenX + 2, player.y + 28);
    
    // Helmet
    ctx.fillStyle = '#2a579c';
    ctx.beginPath();
    ctx.ellipse(screenX + player.width/2, player.y + 10, 15, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Visor
    ctx.fillStyle = '#111111';
    ctx.fillRect(screenX + 5, player.y + 5, 20, 8);
    
    // Shield if active
    if (player.shieldActive) {
        // Shield frame
        ctx.fillStyle = '#4a90e2';
        ctx.strokeStyle = '#2a6ac2';
        ctx.lineWidth = 2;
        
        // Draw curved riot shield
        ctx.beginPath();
        ctx.moveTo(screenX - 10, player.y - 10);
        ctx.quadraticCurveTo(
            screenX - 15, player.y + player.height/2,
            screenX - 10, player.y + player.height + 10
        );
        ctx.lineTo(screenX + 15, player.y + player.height + 10);
        ctx.lineTo(screenX + 15, player.y - 10);
        ctx.closePath();
        ctx.globalAlpha = 0.4;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        
        // Shield text
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText('POLICE', screenX - 8, player.y + 25);
    }
    
    // Draw weapon
    drawWeapon(ctx, screenX, player);
}

function drawWeapon(ctx, x, player) {
    const weapon = player.inventory[player.currentWeapon];
    const y = player.y + player.height/2;
    
    // Check if weapon is currently being swung
    const isSwinging = gameState.effects.some(effect => 
        effect.type === 'meleeSwing' && 
        effect.weapon === weapon
    );
    
    switch (weapon) {
        case "SMG":
            ctx.fillStyle = '#111';
            ctx.fillRect(x + 25, y - 2, 20, 4);
            ctx.fillRect(x + 30, y - 4, 10, 8);
            ctx.fillRect(x + 28, y + 2, 6, 8); // Magazine
            break;
            
        case "Baton":
            ctx.fillStyle = '#111';
            if (isSwinging) {
                // Draw baton in swing motion
                ctx.save();
                ctx.translate(x + 25, y);
                ctx.rotate(Math.PI / 4); // 45-degree swing
                ctx.fillRect(0, -2, 25, 4);
                ctx.restore();
            } else {
                // Draw baton in rest position
                ctx.fillRect(x + 25, y - 2, 25, 4);
            }
            // Handle grip
            ctx.fillStyle = '#333';
            ctx.fillRect(x + 25, y - 1, 8, 2);
            break;
            
        case "Knife":
            if (isSwinging) {
                // Draw knife in stabbing motion
                ctx.save();
                ctx.translate(x + 25, y);
                ctx.rotate(-Math.PI / 6); // -30-degree stab
                // Blade
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(15, -2);
                ctx.lineTo(15, 2);
                ctx.closePath();
                ctx.fill();
                // Handle
                ctx.fillStyle = '#333';
                ctx.fillRect(0, -1, 5, 2);
                ctx.restore();
            } else {
                // Draw knife in rest position
                ctx.fillStyle = '#666';
                ctx.beginPath();
                ctx.moveTo(x + 25, y);
                ctx.lineTo(x + 40, y - 2);
                ctx.lineTo(x + 40, y + 2);
                ctx.closePath();
                ctx.fill();
                // Handle
                ctx.fillStyle = '#333';
                ctx.fillRect(x + 25, y - 1, 5, 2);
            }
            break;
    }
}

function drawOfficer(ctx, officer) {
    const screenX = officer.x - gameState.camera.x;
    
    // Body
    ctx.fillStyle = officer.color;
    ctx.fillRect(screenX, officer.y, officer.width, officer.height);
    
    // Vest with division-specific details
    ctx.fillStyle = '#2a579c';
    ctx.fillRect(screenX, officer.y + 15, officer.width, officer.height - 25);
    
    // Helmet base
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.ellipse(screenX + officer.width/2, officer.y + 10, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Visor
    ctx.fillStyle = '#34495e';
    ctx.fillRect(screenX + 8, officer.y + 5, 15, 8);
    
    // Division-specific equipment and details
    switch(officer.division) {
        case OFFICER_DIVISIONS.MEDIC:
            // Medic cross on helmet
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(screenX + 13, officer.y + 2, 4, 12);
            ctx.fillRect(screenX + 9, officer.y + 6, 12, 4);
            
            // Medical bag on back
            ctx.fillStyle = '#fff';
            ctx.fillRect(screenX + 2, officer.y + 25, 10, 15);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(screenX + 4, officer.y + 30, 6, 5);
            
            // Small pistol
            ctx.fillStyle = '#333';
            ctx.fillRect(screenX + 25, officer.y + 25, 8, 4);
            break;
            
        case OFFICER_DIVISIONS.CLOSE_COMBAT:
            // Tactical shield
            if (officer.shieldActive) {
                ctx.fillStyle = '#34495e';
                ctx.fillRect(screenX - 5, officer.y + 10, 8, 35);
                // Shield details
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(screenX - 4, officer.y + 15, 6, 25);
                ctx.fillStyle = '#fff';
                ctx.font = '8px Arial';
                ctx.fillText('POLICE', screenX - 4, officer.y + 30);
            }
            
            // Baton with better detail
            ctx.fillStyle = '#111';
            ctx.fillRect(screenX + 25, officer.y + 20, 15, 3);
            ctx.fillStyle = '#333';
            ctx.fillRect(screenX + 25, officer.y + 20, 5, 3);
            break;
            
        case OFFICER_DIVISIONS.GUNNER:
            // SMG with more detail
            ctx.fillStyle = '#111';
            ctx.fillRect(screenX + 25, officer.y + 20, 12, 4);
            ctx.fillRect(screenX + 28, officer.y + 18, 6, 8);
            // Magazine
            ctx.fillStyle = '#333';
            ctx.fillRect(screenX + 28, officer.y + 24, 4, 8);
            break;
    }
    
    // Health bar with better visuals
    const healthPercent = officer.health / officer.maxHealth;
    // Health bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(screenX, officer.y - 10, officer.width, 4);
    // Health bar with color based on health
    const healthColor = healthPercent > 0.6 ? '#2ecc71' : 
                       healthPercent > 0.3 ? '#f1c40f' : '#e74c3c';
    ctx.fillStyle = healthColor;
    ctx.fillRect(screenX, officer.y - 10, officer.width * healthPercent, 4);
}

function drawRioter(ctx, rioter) {
    const screenX = rioter.x - gameState.camera.x;
    
    if (screenX + rioter.width >= 0 && screenX <= CANVAS_WIDTH) {
        // Body
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(screenX, rioter.y, rioter.width, rioter.height);
        
        // Hoodie
        ctx.fillStyle = '#660000';
        ctx.beginPath();
        ctx.arc(screenX + rioter.width/2, rioter.y + 10, 12, 0, Math.PI, true);
        ctx.fill();
        
        // Hood shadow
        ctx.fillStyle = '#4d0000';
        ctx.beginPath();
        ctx.arc(screenX + rioter.width/2, rioter.y + 12, 10, 0, Math.PI, true);
        ctx.fill();
        
        // Mask
        ctx.fillStyle = '#333';
        ctx.fillRect(screenX + 5, rioter.y + 5, 20, 10);
        
        // Health bar with gradient
        const healthPercentage = rioter.health / 100;
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(screenX, rioter.y - 15, rioter.width, 5);
        // Health bar
        const healthGradient = ctx.createLinearGradient(screenX, 0, screenX + rioter.width * healthPercentage, 0);
        healthGradient.addColorStop(0, '#ff5e57');
        healthGradient.addColorStop(1, '#ff3f34');
        ctx.fillStyle = healthGradient;
        ctx.fillRect(screenX, rioter.y - 15, rioter.width * healthPercentage, 5);
    }
}

function drawBullets(ctx) {
    ctx.fillStyle = '#ff0';
    
    // Draw player bullets
    gameState.player.bullets.forEach(bullet => {
        const screenX = bullet.x - gameState.camera.x;
        // Bullet with trail
        ctx.fillStyle = '#ff0';
        ctx.fillRect(screenX, bullet.y, bullet.width, bullet.height);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(screenX - 4, bullet.y, 4, bullet.height);
    });

    // Draw officer bullets
    gameState.officers.forEach(officer => {
        if (officer.bullets) {
            officer.bullets.forEach(bullet => {
                const screenX = bullet.x - gameState.camera.x;
                ctx.fillStyle = '#ff0';
                ctx.fillRect(screenX, bullet.y, bullet.width, bullet.height);
                ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
                ctx.fillRect(screenX - 4, bullet.y, 4, bullet.height);
            });
        }
    });
}

// Game loop
function gameLoop() {
    if (!gameState.gameOver) {  // Only pause if game is over
        update();
        render();
    }
    requestAnimationFrame(gameLoop);
}

// Start the game when the page loads
window.onload = init;

// Update the shoot function to handle officer weapons properly
function shoot(shooter) {
    const currentTime = Date.now();
    
    if (shooter === gameState.player) {
        if (currentTime - shooter.lastShot < 200) return; // Rate limiting
        const weapon = shooter.inventory[shooter.currentWeapon];
        
        switch(weapon) {
            case "SMG":
                shootBullet(shooter);
                break;
            case "Baton":
                meleeAttack(shooter, BATON_RANGE, BATON_DAMAGE);
                break;
            case "Knife":
                meleeAttack(shooter, KNIFE_RANGE, KNIFE_DAMAGE);
                break;
        }
    } else {
        // Officers use their division-specific weapons
        const stats = DIVISION_STATS[shooter.division];
        if (currentTime - shooter.lastShot < stats.attackCooldown) return;
        
        if (shooter.weapon === "SMG" || shooter.weapon === "Medkit") {
            shootBullet(shooter);
        } else if (shooter.weapon === "Baton") {
            meleeAttack(shooter, stats.attackRange, stats.damage);
        }
    }
}

// Update shootBullet function to handle aiming
function shootBullet(shooter) {
    const bullet = {
        x: shooter.x + shooter.width/2,
        y: shooter.y + shooter.height/2,
        width: 4,
        height: 2,
        damage: shooter === gameState.player ? 25 : 15,
        velocityX: BULLET_SPEED,
        velocityY: 0
    };

    if (shooter === gameState.player) {
        // Player bullets always go straight
        bullet.velocityX = BULLET_SPEED;
        bullet.velocityY = 0;
    } else {
        // Officers aim at nearest rioter
        const nearestRioter = findNearestRioter(shooter);
        if (nearestRioter) {
            const dx = nearestRioter.x - shooter.x;
            const dy = nearestRioter.y - shooter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            bullet.velocityX = (dx / distance) * BULLET_SPEED;
            bullet.velocityY = (dy / distance) * BULLET_SPEED;
        }
    }

    if (!shooter.bullets) shooter.bullets = [];
    shooter.bullets.push(bullet);
    shooter.lastShot = Date.now();
}

// Update meleeAttack function to work with both player and officers
function meleeAttack(attacker, range, damage) {
    gameState.rioters.forEach((rioter, index) => {
        const dx = rioter.x - attacker.x;
        const dy = rioter.y - attacker.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= range) {
            rioter.health -= damage;
            
            // Add melee swing effect
            gameState.effects.push({
                type: 'meleeSwing',
                x: attacker.x + attacker.width/2,
                y: attacker.y + attacker.height/2,
                duration: 10,
                weapon: attacker.weapon || attacker.inventory[attacker.currentWeapon]
            });

            if (rioter.health <= 0) {
                gameState.rioters.splice(index, 1);
                
                // Score points if player made the takedown
                if (attacker === gameState.player) {
                    const scoreType = attacker.inventory[attacker.currentWeapon] === "Baton" ? 
                        "RIOTER_ARREST" : "RIOTER_DEFEAT";
                    addScore(scoreType);
                }
                
                if (gameState.rioters.length <= 10) {
                    spawnMoreRioters();
                }
            }
        }
    });
    
    attacker.lastShot = Date.now();
}

// Update updateOfficerBehavior to fix close combat behavior
function updateOfficerBehavior(officer) {
    if (officer.inTruck || !officer.active) return;

    const currentTime = Date.now();
    const nearestRioter = findNearestRioter(officer);
    
    if (!nearestRioter) return;
    
    const dx = nearestRioter.x - officer.x;
    const dy = nearestRioter.y - officer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const stats = DIVISION_STATS[officer.division];
    
    switch(officer.division) {
        case OFFICER_DIVISIONS.GUNNER:
            // Gunners maintain distance and shoot
            if (distance < stats.attackRange * 0.5) {
                // Too close, back up
                officer.x -= officer.speed;
            } else if (distance > stats.attackRange * 0.8) {
                // Too far, move closer
                officer.x += officer.speed;
            }
            
            // Shoot if cooldown is ready
            if (currentTime - officer.lastShot >= stats.attackCooldown) {
                if (Math.random() <= stats.accuracy) {
                    shootBullet(officer);
                }
            }
            break;
            
        case OFFICER_DIVISIONS.MEDIC:
            // Medics prioritize healing but will defend themselves
            const woundedOfficer = findWoundedOfficer(officer);
            
            if (woundedOfficer) {
                // Move towards wounded officer
                const healDx = woundedOfficer.x - officer.x;
                officer.x += Math.sign(healDx) * officer.speed;
                
                // Heal if in range and cooldown ready
                if (Math.abs(healDx) < stats.healRange && 
                    currentTime - officer.lastHeal >= stats.healCooldown) {
                    healOfficer(officer, woundedOfficer);
                }
            } else if (distance < stats.attackRange && 
                       currentTime - officer.lastShot >= stats.attackCooldown) {
                // Defend self if no one needs healing
                if (Math.random() <= stats.accuracy) {
                    shootBullet(officer);
                }
            }
            break;
            
        case OFFICER_DIVISIONS.CLOSE_COMBAT:
            // Close combat officers charge with shields
            if (distance > stats.attackRange) {
                // Charge towards rioter with shield
                officer.shieldActive = true;
                const moveSpeed = stats.chargeSpeed;
                officer.x += Math.sign(dx) * moveSpeed;
            } else {
                // Attack with baton when in range
                officer.shieldActive = false;
                if (currentTime - officer.lastShot >= stats.attackCooldown) {
                    meleeAttack(officer, stats.attackRange, stats.damage);
                }
            }
            break;
    }
}

// Add helper function to find wounded officers
function findWoundedOfficer(medic) {
    let mostWounded = null;
    let lowestHealthPercent = 0.9; // Only heal officers below 90% health
    
    gameState.officers.forEach(officer => {
        if (officer !== medic) {
            const healthPercent = officer.health / officer.maxHealth;
            if (healthPercent < lowestHealthPercent) {
                lowestHealthPercent = healthPercent;
                mostWounded = officer;
            }
        }
    });
    
    return mostWounded;
}

// Add healing function
function healOfficer(medic, target) {
    const stats = DIVISION_STATS[OFFICER_DIVISIONS.MEDIC];
    target.health = Math.min(target.maxHealth, target.health + stats.healAmount);
    medic.lastHeal = Date.now();
    
    // Add healing effect
    gameState.effects.push({
        type: 'heal',
        x: target.x + target.width/2,
        y: target.y + target.height/2,
        duration: 30,
        radius: 20
    });
    
    // Add score for healing
    if (target.health === target.maxHealth) {
        addScore('OFFICER_SAVED');
    }
}

// Add new functions for grenades and medkits
function throwGrenade(thrower) {
    if (thrower.grenades <= 0) return;
    
    const grenade = {
        x: thrower.x + thrower.width/2,
        y: thrower.y + thrower.height/2,
        width: 8,
        height: 8,
        velocityX: GRENADE_THROW_FORCE * (thrower === gameState.player ? 1 : -1),
        velocityY: -GRENADE_THROW_FORCE/2,
        timeToExplode: 60,
        particles: [],
        thrown: true
    };

    if (!gameState.grenades) gameState.grenades = [];
    gameState.grenades.push(grenade);
    thrower.grenades--;
    updateUI();
}

function useMedkit(user) {
    if (user.medkits <= 0 || user.health >= user.maxHealth) return;
    
    user.health = Math.min(user.maxHealth, user.health + MEDKIT_HEAL);
    user.medkits--;
    
    // Add healing effect
    gameState.effects.push({
        type: 'heal',
        x: user.x + user.width/2,
        y: user.y + user.height/2,
        duration: 30,
        radius: 20
    });
    
    updateUI();
}

// Enhance explosion effects
function createExplosionParticles(x, y) {
    const particles = [];
    const PARTICLE_COUNT = 30;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / PARTICLE_COUNT;
        const speed = 5 + Math.random() * 5;
        particles.push({
            x: x,
            y: y,
            velocityX: Math.cos(angle) * speed,
            velocityY: Math.sin(angle) * speed,
            life: 30 + Math.random() * 20,
            color: `hsl(${30 + Math.random() * 30}, 100%, 50%)`
        });
    }
    
    return particles;
}

// Add death handling
function handlePlayerDeath() {
    const stats = gameState.player.statistics;
    const deathPanel = document.createElement('div');
    deathPanel.id = 'deathPanel';
    deathPanel.innerHTML = `
        <h2>Mission End</h2>
        <div class="score-breakdown">
            <p>Final Score: ${gameState.player.score}</p>
            <p>Arrests Made: ${stats.arrestsMade}</p>
            <p>Officers Saved: ${stats.officersSaved}</p>
            <p>Property Protected: ${stats.propertyProtected}</p>
            <p>Civilians Protected: ${stats.civiliansProtected}</p>
            <p>Peaceful Resolutions: ${stats.peacefulResolutions}</p>
        </div>
        <button onclick="restartGame()">Restart Mission</button>
    `;
    document.body.appendChild(deathPanel);
    gameState.gameOver = true;
}

// Add restart function
function restartGame() {
    const deathPanel = document.getElementById('deathPanel');
    if (deathPanel) {
        deathPanel.remove();
    }
    gameState.gameOver = false;
    gameState.player.health = MAX_HEALTH;
    gameState.player.score = 0;
    // Reset other game state as needed
    init();
}

// Add riot scenarios
function getRiotCause() {
    const scenarios = [
        {
            title: "Civil Unrest in Downtown",
            description: "Peaceful protest turned violent after provocateurs infiltrated the crowd. Protect local businesses and maintain order.",
            location: "Downtown Business District"
        },
        {
            title: "Sports Riot",
            description: "Championship game aftermath has turned destructive. Contain the situation and prevent damage to the stadium.",
            location: "City Stadium Area"
        },
        {
            title: "Political Demonstration",
            description: "Opposing groups have clashed during a political rally. Separate the groups and prevent escalation.",
            location: "City Hall Plaza"
        }
    ];
    return scenarios[Math.floor(Math.random() * scenarios.length)];
}

// Add briefing panel
function showBriefing() {
    const briefingPanel = document.createElement('div');
    briefingPanel.id = 'briefingPanel';
    briefingPanel.innerHTML = `
        <h2>${gameState.mission.riotCause.title}</h2>
        <p>${gameState.mission.riotCause.description}</p>
        <p class="location">Location: ${gameState.mission.riotCause.location}</p>
        <button onclick="acknowledgeBriefing()">Acknowledge</button>
    `;
    document.body.appendChild(briefingPanel);
    gameState.mission.briefingShown = true;
}

function acknowledgeBriefing() {
    const briefingPanel = document.getElementById('briefingPanel');
    if (briefingPanel) {
        briefingPanel.remove();
    }
    gameState.mission.briefingAcknowledged = true;
    showObjective("Proceed to SWAT truck");
}

// Add objective display
function showObjective(text) {
    const objective = document.createElement('div');
    objective.id = 'objective';
    objective.textContent = text;
    document.body.appendChild(objective);
    setTimeout(() => objective.remove(), 5000);
}

// Update nearTruck function to be more precise
function nearTruck() {
    // Only check if player is on ground level (not jumping)
    if (gameState.player.y < GROUND_LEVEL - gameState.player.height - 10) {
        return false;
    }

    // Check if player is near the truck's door
    const doorX = gameState.mission.truckPosition.x + 120; // Door position
    const dx = doorX - gameState.player.x;
    return Math.abs(dx) < 30; // Smaller interaction range
}

function nearRiot() {
    const distance = Math.abs(gameState.mission.truckPosition.x - SPAWN_DISTANCE);
    console.log("Distance to riot:", distance);
    return distance < 500; // More lenient distance check
}

// Update enterTruck function to better handle officer positions
function enterTruck() {
    if (!nearTruck() || gameState.mission.inTruck) return;
    
    gameState.mission.inTruck = true;
    gameState.mission.phase = 'driving';
    showObjective("Drive to riot location. Press U to deploy when in position.");
    
    // Move player to driver's seat
    gameState.player.x = gameState.mission.truckPosition.x + 120;
    gameState.player.y = gameState.mission.truckPosition.y + 30;
    
    // Officers follow into truck in formation (max 12 officers in truck)
    gameState.officers.forEach((officer, index) => {
        officer.inTruck = true; // All officers get in truck
        // Store their positions relative to truck for movement
        officer.truckOffset = {
            x: 30 + (index % 4) * 25,
            y: 20 + Math.floor(index / 4) * 15
        };
    });
}

// Update exitTruck function
function exitTruck() {
    if (!gameState.mission.inTruck) return;
    
    if (nearRiot()) {
        gameState.mission.inTruck = false;
        // Exit to the right side of the truck
        gameState.player.x = gameState.mission.truckPosition.x + 170;
        gameState.player.y = GROUND_LEVEL - gameState.player.height;
        gameState.mission.phase = 'combat';
        
        // Activate rioters
        gameState.rioters.forEach(rioter => {
            rioter.active = true;
        });
    } else {
        // If not at riot scene, exit where we entered
        gameState.mission.inTruck = false;
        gameState.player.x = gameState.mission.truckPosition.x + 120;
        gameState.player.y = GROUND_LEVEL - gameState.player.height;
    }
}

function deployOfficers() {
    if (!gameState.mission.inTruck || !nearRiot()) {
        console.log("Can't deploy - not in truck or not near riot");
        return;
    }

    console.log("Deploying officers...");

    // Deploy in tactical formation
    gameState.officers.forEach((officer, index) => {
        officer.inTruck = false;
        delete officer.truckOffset; // Remove truck offset

        // Deploy in a formation to the right of the truck
        const row = Math.floor(index / 5);
        const col = index % 5;
        
        officer.x = gameState.mission.truckPosition.x + 200 + (col * 40);
        officer.y = GROUND_LEVEL - officer.height;
        
        // Add some randomness to prevent perfect grid
        officer.x += (Math.random() - 0.5) * 20;
    });

    // Exit truck after deploying officers
    exitTruck();
    showObjective("Officers deployed. Contain the riot!");
    
    // Activate rioters
    gameState.rioters.forEach(rioter => {
        rioter.active = true;
    });
}

// Update drawSWATTruck to show better interaction hints
function drawSWATTruck(ctx) {
    const screenX = gameState.mission.truckPosition.x - gameState.camera.x;
    const y = gameState.mission.truckPosition.y;
    
    // Only draw if on screen
    if (screenX + 200 >= 0 && screenX <= CANVAS_WIDTH) {
        // Truck body
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(screenX, y, 160, 80);
        
        // Armored panels
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(screenX + 10, y + 10, 140, 60);
        
        // Windshield
        ctx.fillStyle = '#2980b9';
        ctx.beginPath();
        ctx.moveTo(screenX + 120, y + 15);
        ctx.lineTo(screenX + 150, y + 15);
        ctx.lineTo(screenX + 150, y + 45);
        ctx.lineTo(screenX + 120, y + 45);
        ctx.fill();
        
        // SWAT text
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText('SWAT', screenX + 50, y + 45);
        
        // Wheels
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(screenX + 30, y + 80, 20, 0, Math.PI * 2);
        ctx.arc(screenX + 130, y + 80, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Wheel rims
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(screenX + 30, y + 80, 10, 0, Math.PI * 2);
        ctx.arc(screenX + 130, y + 80, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Police lights (flashing if in use)
        const lightAlpha = Math.sin(Date.now() / 100) * 0.5 + 0.5;
        
        // Red light
        ctx.fillStyle = `rgba(255, 0, 0, ${lightAlpha})`;
        ctx.fillRect(screenX + 10, y - 10, 20, 10);
        
        // Blue light
        ctx.fillStyle = `rgba(0, 0, 255, ${lightAlpha})`;
        ctx.fillRect(screenX + 130, y - 10, 20, 10);
        
        // Front bumper
        ctx.fillStyle = '#666';
        ctx.fillRect(screenX + 150, y + 60, 10, 20);
        
        // Draw interaction hint
        if (nearTruck()) {
            ctx.fillStyle = '#fff';
            ctx.font = '14px Arial';
            if (!gameState.mission.inTruck) {
                ctx.fillText('Press W to enter', screenX + 100, y - 20);
                // Draw highlight around door
                ctx.strokeStyle = '#2ecc71';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX + 115, y + 10, 10, 40);
            } else if (!nearRiot()) {
                ctx.fillText('Press W to exit', screenX + 100, y - 20);
            }
        }
    }
}

// Add venue background drawing
function drawVenueBackground(ctx, venue) {
    const screenX = -gameState.camera.x;

    if (venue.background.buildings) {
        // Draw downtown buildings
        for (let x = 0; x < gameState.gameWorld.width; x += 200) {
            const buildingX = x + screenX;
            if (buildingX > -200 && buildingX < CANVAS_WIDTH) {
                const height = 150 + Math.sin(x * 0.01) * 50;
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(buildingX, GROUND_LEVEL - height, 180, height);
                // Add windows
                ctx.fillStyle = '#f1c40f';
                for (let i = 0; i < height; i += 30) {
                    for (let j = 0; j < 180; j += 40) {
                        ctx.fillRect(buildingX + j + 10, GROUND_LEVEL - height + i + 10, 20, 20);
                    }
                }
            }
        }
    }

    if (venue.background.stadium) {
        // Draw stadium structure
        const stadiumX = screenX + 1000;
        if (stadiumX > -800 && stadiumX < CANVAS_WIDTH) {
            ctx.fillStyle = '#34495e';
            ctx.beginPath();
            ctx.ellipse(stadiumX + 400, GROUND_LEVEL - 200, 400, 200, 0, Math.PI, 0);
            ctx.fill();
        }
    }

    if (venue.background.cityHall) {
        // Draw City Hall
        const hallX = screenX + 1500;
        if (hallX > -400 && hallX < CANVAS_WIDTH) {
            ctx.fillStyle = '#95a5a6';
            ctx.fillRect(hallX, GROUND_LEVEL - 300, 400, 300);
            // Add columns
            ctx.fillStyle = '#bdc3c7';
            for (let i = 0; i < 400; i += 50) {
                ctx.fillRect(hallX + i + 10, GROUND_LEVEL - 280, 30, 280);
            }
        }
    }
}

// Add this new function to handle scoring
function addScore(scoreType, bonus = 0) {
    const currentTime = Date.now();
    const timeSinceLastScore = currentTime - gameState.player.lastScoreTime;
    
    // Update combo system
    if (timeSinceLastScore < 2000) { // 2 seconds window for combo
        gameState.player.comboCount++;
        gameState.player.scoreMultiplier = Math.min(3, 1 + (gameState.player.comboCount * 0.1)); // Max 3x multiplier
    } else {
        gameState.player.comboCount = 0;
        gameState.player.scoreMultiplier = 1;
    }
    
    // Calculate score with multiplier
    const baseScore = SCORE_VALUES[scoreType] || 0;
    const bonusScore = bonus || 0;
    const totalScore = Math.round((baseScore + bonusScore) * gameState.player.scoreMultiplier);
    
    // Update statistics
    switch(scoreType) {
        case 'RIOTER_ARREST':
            gameState.player.statistics.arrestsMade++;
            break;
        case 'OFFICER_SAVED':
            gameState.player.statistics.officersSaved++;
            break;
        case 'PROPERTY_SAVED':
            gameState.player.statistics.propertyProtected++;
            break;
        case 'CIVILIAN_PROTECTED':
            gameState.player.statistics.civiliansProtected++;
            break;
        case 'PEACEFUL_RESOLUTION':
            gameState.player.statistics.peacefulResolutions++;
            break;
    }
    
    // Add score and update UI
    gameState.player.score += totalScore;
    gameState.player.lastScoreTime = currentTime;
    
    // Show score popup
    showScorePopup(totalScore, scoreType);
    updateUI();
}

// Add visual feedback for scoring
function showScorePopup(score, type) {
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.innerHTML = `+${score} ${type.replace(/_/g, ' ')}`;
    
    if (gameState.player.comboCount > 1) {
        popup.innerHTML += ` x${gameState.player.comboCount}`;
    }
    
    document.body.appendChild(popup);
    
    // Position popup near the player
    const canvas = document.getElementById('gameCanvas');
    const rect = canvas.getBoundingClientRect();
    const screenX = gameState.player.x - gameState.camera.x;
    
    popup.style.left = `${rect.left + screenX}px`;
    popup.style.top = `${rect.top + gameState.player.y - 30}px`;
    
    // Animate and remove
    setTimeout(() => popup.remove(), 1000);
}

// Add new function to create officers by division
function createOfficersByDivision(count, division) {
    const stats = DIVISION_STATS[division];
    for (let i = 0; i < count; i++) {
        const officer = {
            x: gameState.player.x - 200 + Math.random() * 100,
            y: GROUND_LEVEL - 50,
            width: 30,
            height: 50,
            speed: 2 + Math.random() * 2,
            velocityY: 0,
            isJumping: false,
            bullets: [],
            lastShot: 0,
            lastHeal: 0,
            health: stats.health,
            maxHealth: stats.health,
            division: division,
            weapon: stats.weapon,
            color: stats.color,
            inTruck: false,
            active: true,
            shieldActive: division === OFFICER_DIVISIONS.CLOSE_COMBAT
        };
        gameState.officers.push(officer);
    }
}

// Add this function near other helper functions
function findNearestRioter(officer) {
    let nearest = null;
    let minDistance = Infinity;
    
    gameState.rioters.forEach(rioter => {
        if (rioter.active) {  // Only target active rioters
            const dx = rioter.x - officer.x;
            const dy = rioter.y - officer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = rioter;
            }
        }
    });
    
    return nearest;
}

// Add this function to handle bullet updates
function updateBullets(bullets) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Update bullet position
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;
        
        // Check for collisions with rioters
        for (let j = gameState.rioters.length - 1; j >= 0; j--) {
            const rioter = gameState.rioters[j];
            const dx = rioter.x - bullet.x;
            const dy = rioter.y - bullet.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 20) { // Hit detection radius
                rioter.health -= bullet.damage;
                
                // Remove bullet on hit
                bullets.splice(i, 1);
                
                // Check if rioter is defeated
                if (rioter.health <= 0) {
                    gameState.rioters.splice(j, 1);
                    
                    // Add score if player's bullet
                    if (bullets === gameState.player.bullets) {
                        addScore('RIOTER_DEFEAT');
                    }
                    
                    // Spawn more rioters if needed
                    if (gameState.rioters.length <= 10) {
                        spawnMoreRioters();
                    }
                }
                break;
            }
        }
        
        // Remove bullets that have gone off screen
        if (bullet.x > gameState.gameWorld.width || bullet.x < 0 || 
            bullet.y > CANVAS_HEIGHT || bullet.y < 0) {
            bullets.splice(i, 1);
        }
    }
} 