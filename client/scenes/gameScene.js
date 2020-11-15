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
    this.frameCount = 0;
  }

  init({ channel }) {
    this.channel = channel
    this.events.on('update', this.update, this);
  }

  drawFps(dt, frameCount) {
    if(frameCount % 12 === 0) this.fps = (1000 / dt).toFixed(2);
    if(!this.fpsText){
      this.fpsText = this.add.text(this.cameras.main.worldView.x + 10, this.cameras.main.worldView.y + 10, '', { fontFamily: 'monospace' });
    } else {
      this.fpsText.x = this.cameras.main.worldView.x + 10;
      this.fpsText.y = this.cameras.main.worldView.y + 10;
      this.fpsText.text = "Client FPS: " + this.fps + " - Server FPS: " + this.serverFps || '-';
    }
  }
  
  update(timestep, dt) {
    this.frameCount += 1;
    if(!this.graphics){
      this.graphics = this.add.graphics();
      this.graphics.setDepth(999)
    }
    this.graphics.clear();
    const snapshot = this.SI.calcInterpolation('x y vx vy angle');
    if (snapshot) {
      const { state } = snapshot;
      state.forEach((s) => {
        const { playerId } = s;
        if (Object.keys(this.playerMap).includes(playerId)) {
          const player = this.playerMap[playerId];
          player.update(state, this.playerMap);
        } else {
          const { x, y, vx, vy, dead, move, angle } = s;
          const alpha = dead ? 0 : 1
          const newPlayer = new Player(this, playerId, this.channel, x, y, vx, vy, move, angle);
          newPlayer.setAlpha(alpha);
          if(!newPlayer.isClient) {
            this.playersGroup.add(newPlayer);
          }
          // this.physics.add.collider(newPlayer, this.playersGroup);
          this.physics.add.collider(newPlayer, this.platforms);
          this.playerMap[playerId] = newPlayer;
        }
      });
    }
    this.drawFps(dt, this.frameCount);
  }

  preload() {
    this.load.spritesheet('player', 'player.png', {
      frameWidth: 32,
      frameHeight: 48
    });
    this.load.image('2dbr_ground', 'spritesheet_ground.png');
    this.load.image('2dbr_tiles', 'spritesheet_tiles.png');
    this.load.tilemapTiledJSON('map', '2dbr.json');
  }

  async create() {
    const map = this.make.tilemap({ key: 'map' });
    const tilesetGround = map.addTilesetImage('2dbr_ground', '2dbr_ground');
    const tilesetTiles = map.addTilesetImage('2dbr_tiles', '2dbr_tiles');
    this.platforms = map.createStaticLayer('platform', [tilesetGround, tilesetTiles], 0, 200);
    this.platforms.setCollisionByExclusion(-1, true);

    this.playersGroup = this.add.group()

    this.channel.on('updateObjects', (snapshot) => {
      addLatencyAndPackagesLoss(() => {
        this.SI.snapshot.add(snapshot);
      });
    });

    this.channel.on('removePlayer', (playerId) => {
      try {
        this.playerMap[playerId].destroy();
        delete this.playerMap[playerId];
      } catch (error) {
        console.error(error.message);
      }
    });

    this.channel.on('fps', (serverFps) => {
      this.serverFps = serverFps;
    });

    try {
      this.channel.on('getId', data => {
        this.playerId = JSON.parse(data).playerId;
        this.channel.playerId = this.playerId;
        this.channel.emit('addPlayer');
      })
      this.channel.emit('getId');
    } catch (error) {
      console.error(error.message);
    }
  }
}
