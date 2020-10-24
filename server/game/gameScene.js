const geckos = require('@geckos.io/server').default
const { iceServers } = require('@geckos.io/server')

const { Scene } = require('phaser')
const Player = require('./components/player')

class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.playerId = 0
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
        dead: player.dead
      };
    }))
  }

  create() {
    this.playersGroup = this.add.group()

    this.io.onConnection((channel) => {
      channel.onDisconnect(() => {
        console.log('Disconnect user ' + channel.id)
        this.playersGroup.children.each((player) => {
          if (player.playerId === channel.playerId) {
            player.kill()
          }
        })
        channel.room.emit('removePlayer', channel.playerId)
      })

      channel.on('getId', () => {
        channel.playerId = this.getId().toString()
        channel.emit('getId', JSON.stringify({ playerId: channel.playerId }))
      })

      channel.on('playerMove', (data) => {
        this.playersGroup.children.iterate((player) => {
          if (player.playerId === channel.playerId) {
            player.setMove(JSON.parse(data))
          }
        })
      })

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
        playerId: player.playerId,
        x: Math.round(player.x),
        y: Math.round(player.y),
        dead: player.dead,
        move: player.move
      })
      player.postUpdate()
    })

    this.io.room().emit('updateObjects', [JSON.stringify(updates)])
  }
}

module.exports = GameScene
