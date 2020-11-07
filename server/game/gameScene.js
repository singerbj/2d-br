const geckos = require('@geckos.io/server').default;
const { iceServers } = require('@geckos.io/server');
const { SnapshotInterpolation } = require('@geckos.io/snapshot-interpolation');
const { addLatencyAndPackagesLoss } = require('../../shared/util');

const { Scene } = require('phaser')
const Player = require('./components/player')

global.phaserOnNodeFPS = 60;

class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.playerId = 0
    this.SI = new SnapshotInterpolation()
    this.frameCount = 0
  }

  init() {
    this.io = geckos({
      iceServers: process.env.NODE_ENV === 'production' ? iceServers : [],
    })
    this.io.addServer(this.game.server);
  }

  getId() {
    return this.playerId++;
  }

  getState() {
    return JSON.stringify(this.playersGroup.children.entries.map((player) => {
      return {
        playerId: player.playerId,
        x: Math.round(player.x),
        y: Math.round(player.y),
        vx: Math.round(player.body.velocity.x),
        vy: Math.round(player.body.velocity.y),
        dead: player.dead
      };
    }))
  }

  create() {
    this.playersGroup = this.add.group();
    // this.raycaster = this.raycasterPlugin.createRaycaster({});
    // this.ray = this.raycaster.createRay();

    this.io.onConnection((channel) => {
      channel.onDisconnect(() => {
        console.log('Disconnect user ' + channel.id)
        let found = false;
        this.playersGroup.children.each((player) => {
          if (!found && player.playerId === channel.playerId) {
            player.kill();
            found = true;
          }
        });
        channel.room.emit('removePlayer', channel.playerId)
      })

      channel.on('getId', () => {
        channel.playerId = this.getId().toString()
        channel.emit('getId', JSON.stringify({ playerId: channel.playerId }))
      })

      channel.on('playerMoveAndAngle', (data) => {
        addLatencyAndPackagesLoss(() => {
          let found = false;
          this.playersGroup.children.iterate((player) => {
            if (!found && player.playerId === channel.playerId) {
              player.setMoveAndAngle(JSON.parse(data));
              found = true;
            }
          });
        });
      });

      channel.on('addPlayer', (data) => {
        let dead = this.playersGroup.getFirstDead()
        if (dead) {
          dead.revive(channel.playerId, false)
        } else {
          const newPlayer = new Player(
            this,
            channel.playerId,
            Phaser.Math.RND.integerInRange(100, 700)
          );
          // this.physics.add.collider(newPlayer, this.playersGroup);
          this.playersGroup.add(newPlayer);
          // this.raycaster.mapGameObjects(this.playersGroup.getChildren(), true);
        }
      })

      channel.emit('ready')
    })
  }

  update(timestep, dt) {
    this.frameCount += 1;
    let updates = []
    this.playersGroup.children.iterate((player) => {
      updates.push({
        id: player.playerId,
        playerId: player.playerId,
        x: Math.round(player.x),
        y: Math.round(player.y),
        vx: Math.round(player.body.velocity.x),
        vy: Math.round(player.body.velocity.y),
        dead: player.dead,
        move: player.move,
        angle: player.angle
      })
      player.postUpdate()
    })
    const snapshot = this.SI.snapshot.create(updates)
    this.SI.vault.add(snapshot)
    this.io.room().emit('updateObjects', snapshot);
    this.frameCount % 12 === 0 && this.io.room().emit('fps', (1000 / dt).toFixed(2));
  }
}

module.exports = GameScene
