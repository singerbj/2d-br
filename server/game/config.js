require('@geckos.io/phaser-on-nodejs')

const Phaser = require('phaser')
const GameScene = require('./gameScene')

const config = {
  type: Phaser.HEADLESS,
  parent: 'phaser-game',
  width: 960,
  height: 540,
  banner: false,
  audio: false,
  scene: [GameScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1200 }
    }
  }
}
module.exports = config
