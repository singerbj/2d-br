import Phaser from 'phaser';
import { Vault } from '@geckos.io/snapshot-interpolation';
import server from '@geckos.io/server';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, playerId, channel, x, y, vx, vy, move) {
    super(scene, x, y, 'player')
    // this.setVelocity(vx, vy);
    this.scene = scene;
    this.vault = new Vault();

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.onWorldBounds = true;

    this.playerId = playerId;;
    this.channel = channel;
    this.move = move || {};
    this.setFrame(4);

    this.isClient = this.playerId === this.channel.playerId;

    if(this.isClient){
      this.keys = scene.input.keyboard.addKeys({
        up: 'w',
        down: 's',
        left: 'a',
        right: 'd',
        jump: 'space'
      });
    } else {
      this.body.setAllowGravity(false);
    }
  }

  setMove(data) {
    this.move = data;
  }

  updateAnimation(move) {
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

  update(state, playerMap) {
    const serverPlayer = state.filter(s => s.playerId === this.playerId)[0];
    this.hitbox = new Phaser.Geom.Rectangle(this.x - (this.displayWidth / 2), this.y - (this.displayHeight / 2), this.displayWidth, this.displayHeight, 0);

    //draw playerid
    if(!this.playerText){
      this.playerText = this.scene.add.text(this.x, this.y - this.displayHeight, "Player " + this.playerId, { fontFamily: 'monospace' });
    } else {
      this.playerText.text = "Player " + this.playerId;
      this.playerText.x = this.x - (this.playerText.width / 2);
      this.playerText.y = this.y - this.displayHeight;
    }

    //draw server rect
    this.scene.graphics.clear();
    this.scene.graphics.lineStyle(1, 0xBBBB00, 1);
    this.scene.graphics.strokeRect(this.hitbox.x, this.hitbox.y, this.hitbox.length, this.hitbox.height);
    
    if(this.isClient && this.x && this.y){
      //draw aim line
      this.angle = Phaser.Math.Angle.Between(this.x, this.y, this.scene.input.activePointer.x, this.scene.input.activePointer.y) 
      const line = new Phaser.Geom.Line();
      Phaser.Geom.Line.SetToAngle(line, this.x, this.y, this.angle, 2000);
      
      //draw pointer circle
      const circle = new Phaser.Geom.Circle(this.scene.input.activePointer.x, this.scene.input.activePointer.y, 10);
      this.scene.graphics.lineStyle(5, 0xBB00FF, 1);
      this.scene.graphics.strokeCircleShape(circle);

      this.scene.graphics.lineStyle(1, 0x0000ff);
      Object.keys(playerMap).forEach((playerId) => {
        const player = playerMap[playerId];
        if(this.playerId !== playerId && player.hitbox){
          const rect = player.hitbox;
          if (Phaser.Geom.Intersects.LineToRectangle(line, rect)){
            this.scene.graphics.lineStyle(1, 0xff0000);
          } else {
            this.scene.graphics.lineStyle(1, 0x0000ff);
          }
        }
      })
      this.scene.graphics.strokeLineShape(line);
    }

    if(this.isClient){
      this.updateClient(serverPlayer);
      this.serverReconciliation(); 
    } else {
      this.updateNonClient(serverPlayer);
    }
  }

  serverReconciliation() {
    try {
      // get the latest snapshot from the server
      const serverSnapshot = this.scene.SI.vault.get();
      // get the closest player snapshot that matches the server snapshot time
      const playerSnapshot = this.vault.get(serverSnapshot.time, true);

      if (serverSnapshot && playerSnapshot) {
        // get the current player position on the server
        const serverPos = serverSnapshot.state.filter(s => s.playerId === this.playerId)[0];
        if(serverPos){
          // calculate the offset between server and client
          const offsetX = playerSnapshot.state[0].x - serverPos.x;
          const offsetY = playerSnapshot.state[0].y - serverPos.y;
          const offsetVx = playerSnapshot.state[0].vx - serverPos.vx;
          const offsetVy = playerSnapshot.state[0].vy - serverPos.vy;

          // check if the player is currently on the move
          const isMoving = this.body.velocity.x !== 0 || this.body.velocity.y !== 0;

          // we correct the position faster if the player moves
          let xCorrection = isMoving ? 10 : 10
          let yCorrection = isMoving ? 10 : 10
          if(this.isClient) xCorrection = xCorrection * 5;
          if(this.isClient) yCorrection = yCorrection * 5;

          // apply a step by step correction of the player's position
          this.setX(this.x -= offsetX / xCorrection);
          this.setY(this.y -= offsetY / yCorrection);
          // if(this.isClient) this.setVelocity(this.body.velocity.x -= offsetVx / xCorrection, this.body.velocity.y -= offsetVy / yCorrection);
        }
      }
    } catch (e) {
      console.error("Error doing server reconciliation: " + e.message);
    }
  }

  updateClient(currentTime, serverSnapshot, serverPlayer) {
    let move = { left: false, right: false, up: false };

    if (this.keys.left.isDown) move.left = true;
    if (this.keys.right.isDown) move.right = true;
    if(move.right === move.left){
      move.left = false;
      move.right = false;
    }
    if (this.keys.up.isDown || this.keys.jump.isDown) move.up = true;

    this.setMove(move);

    if (move.left) this.setVelocityX(-160);
    else if (move.right) this.setVelocityX(160);
    else this.setVelocityX(0);
    if (move.up && (this.body.blocked.down || this.body.touching.down)) this.setVelocityY(-550)

    this.updateAnimation(move);
    this.channel.emit('playerMove', JSON.stringify(move));

    this.vault.add(
     this.scene.SI.snapshot.create([{
      id: this.playerId,
      x: this.x,
      y: this.y,
      vx: this.body.velocity.x,
      vy: this.body.velocity.y,
      dead: this.dead,
      move: this.move
     }])
    );
  }

  updateNonClient(serverPlayer) {
    this.setVelocityX(serverPlayer.vx);
    this.setVelocityY(serverPlayer.vy);

    const xDiff = Math.abs(this.x - serverPlayer.x);
    const yDiff = Math.abs(this.y - serverPlayer.y);
    const potentialTweenSpeed = 100 - (xDiff > yDiff ? xDiff : yDiff);
    const tweenSpeed = potentialTweenSpeed < 0 ? 0 : potentialTweenSpeed;

    this.scene.tweens.add({
      targets: this,
      x: serverPlayer.x,
      y: serverPlayer.y,
      ease: "Linear", // 'Cubic', 'Elastic', 'Bounce', 'Back'
      duration: tweenSpeed + 15,
      repeat: 0,
      yoyo: false
    });
  }
}
