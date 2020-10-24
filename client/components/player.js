import Phaser from 'phaser'

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, playerId, channel, x, y) {
    super(scene, x, y, 'player')
    scene.add.existing(this)
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.onWorldBounds = true;

    this.playerId = playerId
    this.channel = channel
    this.move = {}
    this.setFrame(4)

    if(this.playerId === this.channel.playerId){
      this.keys = scene.input.keyboard.addKeys({
        up: 'w',
        down: 's',
        left: 'a',
        right: 'd',
        jump: 'space'
      })

      scene.events.on('update', this.updateClient, this)
    } else {
      scene.events.on('update', this.updateNonClient, this)
    }
  }

  setMove(data) {
    this.move = data;
  }

  setLeftAnimation() {
    const now = Date.now();
    if(!this.lastFrameChangeTime || (now - this.lastFrameChangeTime) > 100){
      if(this.lastFrame === 3){
        this.setFrame(2)
        this.lastFrame = 2;
      } else if(this.lastFrame === 2){
        this.setFrame(1)
        this.lastFrame = 1;
      } else if(this.lastFrame === 1){
        this.setFrame(0)
        this.lastFrame = 0;
      } else {
        this.setFrame(3)
        this.lastFrame = 3;
      }
      this.lastFrameChangeTime = now;
    }
  }

  setRightAnimation() {
    const now = Date.now();
    if(!this.lastFrameChangeTime || (now - this.lastFrameChangeTime) > 100){
      if(this.lastFrame === 6){
        this.setFrame(7)
        this.lastFrame = 7;
      } else if(this.lastFrame === 7){
        this.setFrame(8)
        this.lastFrame = 8;
      } else if(this.lastFrame === 8){
        this.setFrame(5)
        this.lastFrame = 5;
      } else {
        this.setFrame(6)
        this.lastFrame = 6;
      }
      this.lastFrameChangeTime = now;
    }
  }

  updateClient() {
    let move = {
      left: false,
      right: false,
      up: false
    }

    if (this.keys.left.isDown) {
      move.left = true
      
    }
    if (this.keys.right.isDown) {
      move.right = true
      
    }
    if(move.right === move.left){
      move.left = false
      move.right = false
    }
    if (this.keys.up.isDown || this.keys.jump.isDown) {
      move.up = true
      move.none = false
    }

    this.update(move);
    this.channel.emit('playerMove', JSON.stringify(move));
  }

  updateNonClient() {
    this.update(this.move);
  }

  update(move) {
    if(move.left){
      this.setLeftAnimation()
    } 
    if(move.right){
      this.setRightAnimation()
    } 
    if(move.right === move.left){
      this.setFrame(4)
      delete this.lastFrameChangeTime;
    } 
  }
}
