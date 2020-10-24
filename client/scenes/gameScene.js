import { Scene } from 'phaser'
import axios from 'axios'
import Player from '../components/player'

export default class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.playerMap = {}
  }

  init({ channel }) {
    this.channel = channel
  }

  preload() {
    this.load.spritesheet('player', 'player.png', {
      frameWidth: 32,
      frameHeight: 48
    })
  }

  async create() {
    this.playersGroup = this.add.group()

    const parseUpdates = updates => {
      if (typeof updates === undefined || updates === '' || !updates.map) return []
      return updates.map((player) => JSON.parse(player))
    }

    const updatesHandler = updates => {
      updates.forEach(gameObject => {
        const { playerId, x, y, dead, move } = gameObject
        const alpha = dead ? 0 : 1

        if (Object.keys(this.playerMap).includes(playerId)) {
          const player = this.playerMap[playerId];
          player.setMove(move)
          player.setAlpha(alpha)
          player.setPosition(x, y)
        } else {
          const newPlayer = new Player(this, playerId, this.channel, x || 200, y || 200)
          newPlayer.setAlpha(alpha)
          this.playersGroup.add(newPlayer)
          this.physics.add.collider(newPlayer, this.playersGroup);
          this.playerMap[playerId] = newPlayer
        }
      })
    }

    this.channel.on('updateObjects', updates => {
      updatesHandler(JSON.parse(updates[0]))
    })

    this.channel.on('removePlayer', playerId => {
      try {
        this.playerMap[playerId].destroy()
        delete this.playerMap[playerId]
      } catch (error) {
        console.error(error.message)
      }
    })

    try {
      let res = await axios.get(
        `${location.protocol}//${location.hostname}:1444/getState`
      )

      let parsedUpdates = parseUpdates(res.data.state)
      updatesHandler(parsedUpdates)

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
