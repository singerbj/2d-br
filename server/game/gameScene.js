const geckos = require('@geckos.io/server').default;
const { iceServers } = require('@geckos.io/server');
const { SnapshotInterpolation } = require('@geckos.io/snapshot-interpolation');
const { addLatencyAndPackagesLoss } = require('../../shared/util');

const { Scene } = require('phaser')
const Player = require('./components/player')

class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.playerId = 0
    this.SI = new SnapshotInterpolation()
  }

  init() {
    this.io = geckos({
      iceServers: process.env.NODE_ENV === 'production' ? iceServers : [],
    })
    this.io.addServer(this.game.server)
  }

  getId() {
    return this.playerId++
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
    this.playersGroup = this.add.group()

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

      channel.on('playerMove', (data) => {
        addLatencyAndPackagesLoss(() => {
          let found = false;
          this.playersGroup.children.iterate((player) => {
            if (!found && player.playerId === channel.playerId) {
              player.setMove(JSON.parse(data));
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
          this.physics.add.collider(newPlayer, this.playersGroup);
          this.playersGroup.add(newPlayer);
          
        }
      })

      channel.emit('ready')
    })
  }

  update() {
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
        move: player.move
      })
      player.postUpdate()
    })
    const snapshot = this.SI.snapshot.create(updates)
    this.SI.vault.add(snapshot)
    this.io.room().emit('updateObjects', snapshot)
  }
}

module.exports = GameScene
