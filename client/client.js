import '@babel/polyfill'

import Phaser, { Game } from 'phaser'
import BootScene from './scenes/bootScene'
import GameScene from './scenes/gameScene'

const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 896,
    height: 504
  },
  physics: {
    default: "arcade",
    arcade: {
        debug: true,
        // gravity: { y: 1200 }
    }
  },
  scene: [BootScene, GameScene]
}

window.addEventListener('load', () => {
  const game = new Game(config)
})
