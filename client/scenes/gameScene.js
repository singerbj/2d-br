import { Scene } from 'phaser'
// import axios from 'axios'
import Player from '../components/player'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'
import { addLatencyAndPackagesLoss } from '../../shared/util';


export default class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.playerMap = {};
    this.SI = new SnapshotInterpolation();
  }

  init({ channel }) {
    this.channel = channel
    this.events.on('update', this.update, this);
  }
  
  update() {
    const snapshot = this.SI.calcInterpolation('x y vx vy');
    if (snapshot) {
      const { state } = snapshot;
      state.forEach((s) => {
        const { playerId } = s;
        if (Object.keys(this.playerMap).includes(playerId)) {
          const player = this.playerMap[playerId];
          player.update();
        } else {
          const { x, y, vx, vy, dead, move } = s;
          const alpha = dead ? 0 : 1
          const newPlayer = new Player(this, playerId, this.channel, x, y, vx, vy, move);
          newPlayer.setAlpha(alpha);
          // this.playersGroup.add(newPlayer);
          // this.physics.add.collider(newPlayer, this.playersGroup);
          this.playerMap[playerId] = newPlayer;
        }
      });
    }
  }

  preload() {
    this.load.spritesheet('player', 'player.png', {
      frameWidth: 32,
      frameHeight: 48
    })
  }

  async create() {
    // this.playersGroup = this.add.group()

    this.channel.on('updateObjects', (snapshot) => {
      addLatencyAndPackagesLoss(() => {
        this.SI.snapshot.add(snapshot);
      });
    })

    this.channel.on('removePlayer', (playerId) => {
      try {
        this.playerMap[playerId].destroy()
        delete this.playerMap[playerId]
      } catch (error) {
        console.error(error.message)
      }
    })

    try {
      this.channel.on('getId', data => {
        this.playerId = JSON.parse(data).playerId;
        this.channel.playerId = this.playerId
        this.channel.emit('addPlayer')
      })

      this.channel.emit('getId')
    } catch (error) {
      console.error(error.message)
    }
  }
}
