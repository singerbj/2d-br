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

  prepareToSync(player) {
    return JSON.stringify({
      playerId: player.playerId,
      x: Math.round(player.x),
      y: Math.round(player.y),
      dead: player.dead
    });
  }

  getState() {
    let state = ''
    this.playersGroup.children.iterate((player) => {
      state += this.prepareToSync(player)
    })
    return state
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
        channel.playerId = this.getId()
        channel.emit('getId', channel.playerId.toString(36))
      })

      channel.on('playerMove', (data) => {
        this.playersGroup.children.iterate((player) => {
          if (player.playerId === channel.playerId) {
            player.setMove(data)
          }
        })
      })

      channel.on('addPlayer', (data) => {
        let dead = this.playersGroup.getFirstDead()
        if (dead) {
          dead.revive(channel.playerId, false)
        } else {
          this.playersGroup.add(
            new Player(
              this,
              channel.playerId,
              Phaser.Math.RND.integerInRange(100, 700)
            )
          )
        }
      })

      channel.emit('ready')
    })
  }

  update() {
    let updates = []
    this.playersGroup.children.iterate((player) => {
      let x = Math.abs(player.x - player.prevX) > 0.5
      let y = Math.abs(player.y - player.prevY) > 0.5
      let dead = player.dead != player.prevDead
      if (x || y || dead) {
        if (dead || !player.dead) {
          updates.push(this.prepareToSync(player))
        }
      }
      player.postUpdate()
    })

    if (updates.length > 0) {
      this.io.room().emit('updateObjects', [updates])
    }
  }
}

module.exports = GameScene
