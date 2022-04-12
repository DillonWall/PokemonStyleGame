//=============FUNCTIONS=============

function readTextFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
            callback(rawFile.responseText);
        }
    }
    rawFile.send(null);
}

function rectangularCollision({ r1, r2 }) {
    return (
        r1.position.x + r1.width >= r2.position.x &&
        r1.position.x <= r2.position.x + r2.width &&
        r1.position.y + r1.height >= r2.position.y &&
        r1.position.y <= r2.position.y + r2.height
    )
}

function getPlayerHitbox() {
    return {
        width: P_HITBOX_WIDTH,
        height: P_HITBOX_HEIGHT,
        position: {
            x: player.position.x + (player.width - P_HITBOX_WIDTH) / 2,         //center the width hitbox
            y: player.position.y + (player.height - P_HITBOX_HEIGHT)            //put at feet
        }
    }
}

function getBoundaryHitboxAfterMove(b, dx, dy) {
    return {
        width: b.width,
        height: b.height,
        position: {
            x: b.position.x + (PLAYER_SPEED * dx),
            y: b.position.y + (PLAYER_SPEED * dy)
        }
    }
}

function setWorld() {
    gameState = 'world'

    document.querySelector('#userInterface').style.display = 'none'

    gsap.to('#overlappingDiv', {
        opacity: 0
    })

    emby.resetAnimation()
    draggle.resetAnimation()
    player.animate = true

    audio.map.play()
}

function updateWorld() {
    // Handle Input
    let dx = 0
    let dy = 0
    if (keys.w.pressed) ++dy
    if (keys.a.pressed) ++dx
    if (keys.s.pressed) --dy
    if (keys.d.pressed) --dx
    // if diagonal, take the most recent axis pressed
    if (dx !== 0 && dy !== 0) {
        if (lastKey === 'w' || lastKey === 's') dx = 0
        else dy = 0
    }
    if (dx !== 0 || dy !== 0) {
        player.animate = true

        if (dy > 0) player.image = player.sprites.up
        else if (dx > 0) player.image = player.sprites.left
        else if (dy < 0) player.image = player.sprites.down
        else if (dx < 0) player.image = player.sprites.right
    }
    else {
        player.resetAnimation()
    }

    // Handle Collisions
    boundaries.forEach((b) => {
        if (
            rectangularCollision({
                r1: getPlayerHitbox(),
                r2: getBoundaryHitboxAfterMove(b, dx, dy)
            })
        ) {
            dx = 0
            dy = 0
        }
    })
    if (player.animate) {
        battlezones.every((bz) => {
            const player_hitbox = getPlayerHitbox()
            const overlappingArea = (
                Math.min(player_hitbox.position.x + player_hitbox.width, bz.position.x + bz.width) -
                Math.max(player_hitbox.position.x, bz.position.x)
            ) * (
                Math.min(player_hitbox.position.y + player_hitbox.height, bz.position.y + bz.height) -
                Math.max(player_hitbox.position.y, bz.position.y)
            )

            if (
                rectangularCollision({
                    r1: player_hitbox,
                    r2: getBoundaryHitboxAfterMove(bz, dx, dy)
                }) &&
                overlappingArea >= (player_hitbox.width * player_hitbox.height) / 2 &&
                Math.random() < ENCOUNTER_RATE
            ) {
                setEnteringBattle()
                return false
            }
            return true
        })
    }

    // Update Game Objects
    moveables.forEach((m) => {
        m.position.x += (PLAYER_SPEED * dx)
        m.position.y += (PLAYER_SPEED * dy)
    })
}

function drawWorld() {
    background.draw()
    if (DEBUG) {
        boundaries.forEach(b => {
            b.draw()
        })
        battlezones.forEach(bz => {
            bz.draw()
        })
    }
    player.draw()
    foreground.draw()
}

function setEnteringBattle() {
    gameState = 'enteringBattle'

    audio.map.stop()
    audio.startBattle.play()
    audio.battle.play()

    player.resetAnimation()

    gsap.to('#overlappingDiv', {
        opacity: 1,
        repeat: 3,
        yoyo: true,
        duration: 0.4,
        onComplete() {
            gsap.to('#overlappingDiv', {
                opacity: 1,
                duration: 0.4,
                onComplete() {
                    setBattle()
                    gsap.to('#overlappingDiv', {
                        opacity: 0,
                        duration: 0.4
                    })
                }
            })
        }
    })
}

function updateEnteringBattle() {

}

function drawEnteringBattle() {
    drawWorld()
}

function initBattle() {
    document.querySelector('#userInterface').style.display = 'block'
    document.querySelector('#dialogBox').style.display = 'none'
    document.querySelector('#enemyHealthBar').style.width = '100%'
    document.querySelector('#playerHealthBar').style.width = '100%'
    document.querySelector('#attacksBox').replaceChildren()

    emby = new Monster(monsters.Emby)
    draggle = new Monster(monsters.Draggle)
    renderedSprites = []
    battleQueue = []

    // Setup Emby attacks
    emby.attacks.forEach((attack) => {
        const attackButton = document.createElement('button')
        attackButton.innerHTML = attack.name
        document.querySelector('#attacksBox').append(attackButton)
    })

    // Setup emby attack buttons
    document.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', (e) => {
            const selectedAttack = attacks[e.currentTarget.innerHTML]
            emby.attack({
                attack: selectedAttack,
                recipient: draggle,
                renderedSprites: renderedSprites
            })

            // Faint enemy if dead
            if (draggle.health <= 0) {
                battleQueue.push(() => {
                    draggle.faint()
                })
                battleQueue.push(() => {
                    // fade back to black
                    gsap.to('#overlappingDiv', {
                        opacity: 1,
                        onComplete: () => {
                            setWorld()
                        }
                    })
                })
                audio.battle.stop()
                audio.victory.play()

                return
            }

            // Add enemy attack to queue
            const randomAttack = draggle.attacks[Math.floor(Math.random() * draggle.attacks.length)]

            battleQueue.push(() => {
                draggle.attack({
                    attack: randomAttack,
                    recipient: emby,
                    renderedSprites: renderedSprites
                })

                // Faint if emby dies
                if (emby.health <= 0) {
                    battleQueue.push(() => {
                        emby.faint()
                    })
                    battleQueue.push(() => {
                        // fade back to black
                        gsap.to('#overlappingDiv', {
                            opacity: 1,
                            onComplete: () => {
                                setWorld()
                            }
                        })
                    })

                    return
                }
            })
        })

        button.addEventListener('mouseenter', (e) => {
            const selectedAttack = attacks[e.currentTarget.innerHTML]
            document.querySelector('#attackType').innerHTML = selectedAttack.type
            document.querySelector('#attackType').style.color = selectedAttack.color
        })
    })
}

function setBattle() {
    gameState = 'battle'

    initBattle()

    emby.animate = true
    draggle.animate = true
}

function updateBattle() {

}

function drawBattle() {
    battleBackground.draw()
    draggle.draw()
    emby.draw()

    renderedSprites.forEach((sprite) => {
        sprite.draw()
    })
}

function step() {
    window.requestAnimationFrame(step)

    switch (gameState) {
        case 'world':
            updateWorld()
            drawWorld()
            break
        case 'enteringBattle':
            updateEnteringBattle()
            drawEnteringBattle()
            break
        case 'battle':
            updateBattle()
            drawBattle()
            break
    }
}

// Setup battle dialog
document.querySelector('#dialogBox').addEventListener('click', (e) => {
    if (battleQueue.length > 0) {
        battleQueue[0]()
        battleQueue.shift()
    } else e.currentTarget.style.display = 'none'
})

window.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'w':
            keys.w.pressed = true
            lastKey = 'w'
            break
        case 'a':
            keys.a.pressed = true
            lastKey = 'a'
            break
        case 's':
            keys.s.pressed = true
            lastKey = 's'
            break
        case 'd':
            keys.d.pressed = true
            lastKey = 'd'
            break
    }
})

window.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'w':
            keys.w.pressed = false
            break
        case 'a':
            keys.a.pressed = false
            break
        case 's':
            keys.s.pressed = false
            break
        case 'd':
            keys.d.pressed = false
            break
    }
})

let clicked = false
addEventListener('click', () => {
    if (!clicked) {
        audio.map.play()
        clicked = true
    }
})

function setPixelated(context) {
    context['imageSmoothingEnabled'] = false;       /* standard */
    context['mozImageSmoothingEnabled'] = false;    /* Firefox */
    context['oImageSmoothingEnabled'] = false;      /* Opera */
    context['webkitImageSmoothingEnabled'] = false; /* Safari */
    context['msImageSmoothingEnabled'] = false;     /* IE */
}

//=============MAIN=============
// Canvas setup
const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')
setPixelated(c)
canvas.width = 1024
canvas.height = 576
c.fillStyle = 'white'
c.fillRect(0, 0, canvas.width, canvas.height)

// Image setup
const playerUpImage = new Image()
playerUpImage.src = './img/player_up.png'
const playerLeftImage = new Image()
playerLeftImage.src = './img/player_left.png'
const playerDownImage = new Image()
playerDownImage.src = './img/player_down.png'
const playerRightImage = new Image()
playerRightImage.src = './img/player_right.png'

// Import map layers from JSON
var map_island = JSON.parse(map_island_json)
var collisionsRaw = map_island.layers.find(e => e.name === 'Collisions').data
var collisionsMap = []
for (let i = 0; i < collisionsRaw.length; i += MAP_WIDTH) {
    collisionsMap.push(collisionsRaw.slice(i, i + MAP_WIDTH))
}
var battlezonesRaw = map_island.layers.find(e => e.name === 'Battle Zones').data
var battlezonesMap = []
for (let i = 0; i < battlezonesRaw.length; i += MAP_WIDTH) {
    battlezonesMap.push(battlezonesRaw.slice(i, i + MAP_WIDTH))
}

// Variables
let lastKey = ''
const keys = {
    w: {
        pressed: false
    },
    a: {
        pressed: false
    },
    s: {
        pressed: false
    },
    d: {
        pressed: false
    }
}
const offset = {
    x: -PLAYER_SPAWN_X,
    y: -PLAYER_SPAWN_Y
}

let gameState = 'world'

// Game Objects
const background = new Sprite({
    position: {
        x: offset.x,
        y: offset.y
    },
    imageSrc: './img/map_island.png'
})

const foreground = new Sprite({
    position: {
        x: offset.x,
        y: offset.y
    },
    imageSrc: './img/map_island_fg.png'
})

const boundaries = []
collisionsMap.forEach((row, i) => {
    row.forEach((symbol, j) => {
        if (symbol === BOUNDARY_TILE_CODE) {
            boundaries.push(new Boundary({
                position: {
                    x: j * TILESIZE * SCALE + offset.x,
                    y: i * TILESIZE * SCALE + offset.y
                }
            }))
        }
    })
})

const battlezones = []
battlezonesMap.forEach((row, i) => {
    row.forEach((symbol, j) => {
        if (symbol === BOUNDARY_TILE_CODE) {
            battlezones.push(new Boundary({
                position: {
                    x: j * TILESIZE * SCALE + offset.x,
                    y: i * TILESIZE * SCALE + offset.y
                }
            }))
        }
    })
})

const player = new Sprite({
    position: {
        x: (canvas.width / 2) - ((PLAYER_PNG_WIDTH / PLAYER_FRAMES) / 2),
        y: (canvas.height / 2) - (PLAYER_PNG_HEIGHT / 2),
    },
    imageSrc: playerDownImage.src,
    frames: {
        max: 4,
        hold: PLAYER_ANIMATION_DELAY
    },
    sprites: {
        up: playerUpImage,
        left: playerLeftImage,
        down: playerDownImage,
        right: playerRightImage
    }
})

const battleBackground = new Sprite({
    position: {
        x: 0,
        y: 0
    },
    imageSrc: './img/battle_background.png'
})


let emby
let draggle
let renderedSprites = []
let battleQueue = []

const moveables = [background, foreground, ...boundaries, ...battlezones]

// Game Loop
step()