export default class Carrot {
  constructor(ctx, x, y, width, height, image) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.image = image;
  }

  update(speed, gameSpeed, frameTimeDelta, scaleRatio) {
    this.x -= speed * gameSpeed * frameTimeDelta * scaleRatio;
  }

  draw() {
    // Draw shadow for depth
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    this.ctx.fillRect(
      this.x + 3, 
      this.y + this.height - 2, 
      this.width - 6, 
      4
    );

    // Draw the carrot image
    this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);

    // Add a subtle glow effect for garden magic
    this.ctx.shadowColor = "rgba(255, 140, 0, 0.3)";
    this.ctx.shadowBlur = 2;
    this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    
    // Reset shadow
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowBlur = 0;
  }

  collideWith(sprite) {
    const adjustBy = 1.4;
    if (
      sprite.x < this.x + this.width / adjustBy &&
      sprite.x + sprite.width / adjustBy > this.x &&
      sprite.y < this.y + this.height / adjustBy &&
      sprite.height + sprite.y / adjustBy > this.y
    ) {
      return true;
    } else {
      return false;
    }
  }
}
