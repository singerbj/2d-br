require('@geckos.io/phaser-on-nodejs');

const Phaser = require('phaser');
const GameScene = require('./gameScene');
// const window = require('window-shim');
// const PhaserRaycaster = require('phaser-raycaster');

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
  },
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
module.exports = config
