const monsters = {
    Emby: {
        position: {
            x: BATTLE_P_START_X,
            y: BATTLE_P_START_Y
        },
        imageSrc: './img/emby_sprite.png',
        frames: {
            max: 4,
            hold: MONSTER_ANIMATION_DELAY
        },
        name: 'Emby',
        attacks: [attacks.Tackle, attacks.Fireball]
    },
    Draggle: {
        position: {
            x: BATTLE_E_START_X,
            y: BATTLE_E_START_Y
        },
        imageSrc: './img/draggle_sprite.png',
        frames: {
            max: 4,
            hold: MONSTER_ANIMATION_DELAY
        },
        isEnemy: true,
        name: 'Draggle',
        attacks: [attacks.Tackle, attacks.Fireball]
    }
}