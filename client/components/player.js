import Phaser from 'phaser';
import { Vault } from '@geckos.io/snapshot-interpolation';
import server from '@geckos.io/server';
import { rayCast } from '../../shared/rayCast';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, playerId, channel, x, y, vx, vy, move, angle) {
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
    this.angle = angle;

    this.createAnimations();

    this.hitbox = new Phaser.Geom.Rectangle(this.x - (this.displayWidth / 2), this.y - (this.displayHeight / 2), this.displayWidth, this.displayHeight, 0);

    this.isClient = this.playerId === this.channel.playerId;

    if(this.isClient){
      // this.scene.cameras.main.startFollow(this); //TODO: add a map and then turn this on
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

  createAnimations() {
    this.scene.anims.create({
      key: 'left',
      frames: this.scene.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    this.scene.anims.create({
      key: 'idle',
      frames: [ { key: 'player', frame: 4 } ],
      frameRate: 20
    });

    this.scene.anims.create({
      key: 'right',
      frames: this.scene.anims.generateFrameNumbers('player', { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
  }

  update(state, playerMap) {
    const serverPlayer = state.filter(s => s.playerId === this.playerId)[0];
    
    // this.hitbox = new Phaser.Geom.Rectangle(this.x - (this.displayWidth / 2), this.y - (this.displayHeight / 2), this.displayWidth, this.displayHeight, 0);
    this.hitbox.x = this.x - (this.displayWidth / 2);
    this.hitbox.y = this.y - (this.displayHeight / 2);
    this.hitbox.width = this.displayWidth;
    this.hitbox.height = this.displayHeight;

    //draw playerid
    if(!this.playerText){
      this.playerText = this.scene.add.text(this.x, this.y - this.displayHeight, "Player " + this.playerId, { fontFamily: 'monospace' });
    } else {
      this.playerText.text = "Player " + this.playerId;
      this.playerText.x = this.x - (this.playerText.width / 2);
      this.playerText.y = this.y - this.displayHeight;
    }

    //draw server rect
    this.scene.graphics.lineStyle(1, 0xBBBB00, 1);
    this.scene.graphics.strokeRect(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
    
    if(this.isClient && this.x && this.y){
      //draw aim line
      this.angle = Phaser.Math.Angle.Between(this.x, this.y, this.scene.input.activePointer.x, this.scene.input.activePointer.y);
      const line = new Phaser.Geom.Line();
      Phaser.Geom.Line.SetToAngle(line, this.x, this.y, this.angle, 2000);
      
      //draw pointer circle
      const circle = new Phaser.Geom.Circle(this.scene.input.activePointer.x, this.scene.input.activePointer.y, 10);
      this.scene.graphics.lineStyle(5, 0xBB00FF, 1);
      this.scene.graphics.strokeCircleShape(circle);

      this.scene.graphics.lineStyle(1, 0x0000ff);
      const result = rayCast(this.x, this.y, this.angle, this.scene.playersGroup, 1000);
      if (result){
        this.scene.graphics.fillStyle(0x33ff33, 1);
        this.scene.graphics.fillPointShape(result.intersection, 5);

        this.scene.graphics.lineStyle(1, 0xff0000);
      } else {
        this.scene.graphics.lineStyle(1, 0x0000ff);
      }
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

  setAnimation() {
    if(this.body.velocity.x < 0){
      this.anims.play('left', true);
    } else if(this.body.velocity.x > 0){
      this.anims.play('right', true);
    }else if(this.body.velocity.x === 0){
      this.anims.play('idle', true);
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

    this.setAnimation();
    this.channel.emit('playerMoveAndAngle', JSON.stringify({ move, angle: this.angle }));

    this.vault.add(
      this.scene.SI.snapshot.create([{
        id: this.playerId,
        x: this.x,
        y: this.y,
        vx: this.body.velocity.x,
        vy: this.body.velocity.y,
        dead: this.dead,
        move: this.move,
        angle: this.angle
      }])
    );
  }

  updateNonClient(serverPlayer) {
    this.angle = serverPlayer.angle;
    this.setVelocityX(serverPlayer.vx);
    this.setVelocityY(serverPlayer.vy);

    // const xDiff = Math.abs(this.x - serverPlayer.x);
    // const yDiff = Math.abs(this.y - serverPlayer.y);
    // const potentialTweenSpeed = 100 - (xDiff > yDiff ? xDiff : yDiff);
    // const tweenSpeed = potentialTweenSpeed < 0 ? 0 : potentialTweenSpeed;
    const line = new Phaser.Geom.Line();
    Phaser.Geom.Line.SetToAngle(line, this.x, this.y, this.angle, 100);
    this.scene.graphics.lineStyle(1, 0x7777ff);
    this.scene.graphics.strokeLineShape(line);

    this.setAnimation();

    this.scene.tweens.add({
      targets: this,
      x: serverPlayer.x,
      y: serverPlayer.y,
      ease: "Linear", // 'Cubic', 'Elastic', 'Bounce', 'Back'
      duration: 1, //tweenSpeed + 5,
      repeat: 0,
      yoyo: false
    });
  }
}
