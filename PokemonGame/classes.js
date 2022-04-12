//=============CLASSES=============
class Sprite {
    constructor({ position, imageSrc, frames = { max: 1 }, sprites, animate, rotation }) {
        this.position = position
        this.frames = { ...frames, val: 0, elapsed: 0 }
        this.animate = animate
        this.sprites = sprites
        this.opacity = 1        
        this.rotation = rotation

        
        this.image = new Image()
        this.image.onload = () => {
            this.width = this.image.width / this.frames.max
            this.height = this.image.height
        }
        this.image.src = imageSrc
    }

    draw() {
        c.save()
        c.globalAlpha = this.opacity
        c.translate(
            this.position.x + (this.width / 2), 
            this.position.y + (this.height / 2)
        )
        c.rotate(this.rotation)
        c.translate(
            -this.position.x - (this.width / 2), 
            -this.position.y - (this.height / 2)
        )
        c.drawImage(
            this.image,
            this.frames.val * this.width,
            0,
            this.width,
            this.height,
            this.position.x,
            this.position.y,
            this.width,
            this.height,
        )
        c.restore()

        if (!this.animate) return

        if (this.frames.max > 1) ++this.frames.elapsed

        if (this.frames.elapsed % this.frames.hold === 0) {
            if (this.frames.val < this.frames.max - 1) ++this.frames.val
            else this.frames.val = 0
        }
    }

    resetAnimation() {
        this.animate = false
        this.frames.val = 0
        this.frames.elapsed = 0
    }
}

class Monster extends Sprite {
    constructor({
        position, 
        imageSrc, 
        frames = { max: 1 }, 
        sprites,
        animate = false, 
        isEnemy = false, 
        rotation = 0, 
        name,
        attacks
    }) {
        super({
            position,
            imageSrc,
            frames,
            sprites,
            animate,
            rotation
        })
        this.maxHealth = 100
        this.health = 100
        this.name = name
        this.isEnemy = isEnemy
        this.attacks = attacks
    }

    faint() {
        document.querySelector('#dialogBox').innerHTML = this.name + ' fainted...'
        gsap.to(this.position, {
            y: this.position.y + 20
        })
        gsap.to(this, {
            opacity: 0
        })
    }

    attack({ attack, recipient, renderedSprites }) {
        document.querySelector('#dialogBox').style.display = 'block'
        document.querySelector('#dialogBox').innerHTML = this.name + ' used ' + attack.name

        recipient.health -= attack.damage

        let movementDistance = 20
        if (this.isEnemy) movementDistance = -20

        let rotation = 1
        if (this.isEnemy) rotation = -2.2

        let healthBar = '#enemyHealthBar'
        if (this.isEnemy) healthBar = '#playerHealthBar'

        switch (attack.name) {
            case 'Tackle':
                const tl = gsap.timeline()

                tl.to(this.position, {
                    x: this.position.x - movementDistance
                }).to(this.position, {
                    x: this.position.x + (movementDistance * 2),
                    duration: 0.1,
                    onComplete: () => {
                        audio.tackleHit.play()

                        gsap.to(healthBar, {
                            width: (100 * recipient.health / recipient.maxHealth) + '%'
                        })

                        gsap.to(recipient.position, {
                            x: recipient.position.x + (movementDistance / 2),
                            yoyo: true,
                            repeat: 5,
                            duration: 0.05
                        })

                        gsap.to(recipient, {
                            opacity: 0,
                            yoyo: true,
                            repeat: 5,
                            duration: 0.05
                        })
                    }
                }).to(this.position, {
                    x: this.position.x
                })

                break
            case 'Fireball':
                audio.fireballInit.play()

                const fireball = new Sprite({
                    position: {
                        x: this.position.x,
                        y: this.position.y
                    },
                    imageSrc: './img/fireball.png',
                    frames: {
                        max: 4,
                        hold: 10
                    },
                    animate: true,
                    rotation: rotation
                })

                renderedSprites.push(fireball)

                gsap.to(fireball.position, {
                    x: recipient.position.x,
                    y: recipient.position.y,
                    onComplete: () => {
                        audio.fireballHit.play()

                        renderedSprites.pop()

                        gsap.to(healthBar, {
                            width: (100 * recipient.health / recipient.maxHealth) + '%'
                        })

                        gsap.to(recipient.position, {
                            x: recipient.position.x + (movementDistance / 2),
                            yoyo: true,
                            repeat: 5,
                            duration: 0.05
                        })

                        gsap.to(recipient, {
                            opacity: 0,
                            yoyo: true,
                            repeat: 5,
                            duration: 0.05
                        })
                    }
                })

                break
        }
    }
}

class Boundary {
    constructor({ position }) {
        this.position = position
        this.width = TILESIZE * SCALE
        this.height = TILESIZE * SCALE
    }

    draw() {
        c.save()
        c.globalAlpha = 0.5
        c.fillStyle = 'red'
        c.fillRect(this.position.x, this.position.y, this.width, this.height)
        c.restore()
    }
}