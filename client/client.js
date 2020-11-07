import '@babel/polyfill'

import Phaser, { Game } from 'phaser'
import BootScene from './scenes/bootScene'
import GameScene from './scenes/gameScene'
// import PhaserRaycaster from 'phaser-raycaster';

const config = {
  type: Phaser.CANVAS,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540
  },
  physics: {
    default: "arcade",
    arcade: {
        // debug: true,
        gravity: { y: 1200 }
    }
  },
  scene: [BootScene, GameScene],
  // plugins: {
  //   scene: [
  //       {
  //           key: 'PhaserRaycaster',
  //           plugin: PhaserRaycaster,
  //           mapping: 'raycasterPlugin'
  //       }
  //   ]
  // }
}

window.addEventListener('load', () => {
  const game = new Game(config)
})
