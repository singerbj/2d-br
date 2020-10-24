import { Scene } from 'phaser'
import axios from 'axios'
import Player from '../components/player'
import Keys from '../components/keys'

export default class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' })
    this.objects = {}
    this.playerId
  }

  init({ channel }) {
    this.channel = channel
  }

  preload() {
    this.load.image('controls', 'controls.png')
    
    this.load.spritesheet('player', 'player.png', {
      frameWidth: 32,
      frameHeight: 48
    })
  }

  async create() {
    new Keys(this, this.channel)

    const parseUpdates = updates => {
      if (typeof updates === undefined || updates === '' || !updates.map) return []

      // // parse
      // let u = updates.split(',')
      // u.pop()

      // let u2 = []

      // u.forEach((el, i) => {
      //   if (i % 4 === 0) {
      //     u2.push({
      //       playerId: u[i + 0],
      //       x: parseInt(u[i + 1], 36),
      //       y: parseInt(u[i + 2], 36),
      //       dead: parseInt(u[i + 3]) === 1 ? true : false
      //     })
      //   }
      // })
      // return u2
      console.log(updates);
      return updates.map((player) => JSON.parse(player))
    }

    const updatesHandler = updates => {
      updates.forEach(gameObject => {
        const { playerId, x, y, dead } = gameObject
        const alpha = dead ? 0 : 1

        if (Object.keys(this.objects).includes(playerId)) {
          // if the gameObject does already exist,
          // update the gameObject
          let sprite = this.objects[playerId].sprite
          sprite.setAlpha(alpha)
          sprite.setPosition(x, y)
        } else {
          // if the gameObject does NOT exist,
          // create a new gameObject
          let newGameObject = {
            sprite: new Player(this, playerId, x || 200, y || 200),
            playerId: playerId
          }
          newGameObject.sprite.setAlpha(alpha)
          this.objects = { ...this.objects, [playerId]: newGameObject }
        }
      })
    }

    this.channel.on('updateObjects', updates => {
      let parsedUpdates = parseUpdates(updates[0])
      updatesHandler(parsedUpdates)
    })

    this.channel.on('removePlayer', playerId => {
      try {
        this.objects[playerId].sprite.destroy()
        delete this.objects[playerId]
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

      this.channel.on('getId', playerId36 => {
        this.playerId = parseInt(playerId36, 36)
        this.channel.emit('addPlayer')
      })

      this.channel.emit('getId')
    } catch (error) {
      console.error(error.message)
    }
  }
}
