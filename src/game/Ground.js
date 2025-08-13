// Import ground image as module so Vite can properly handle it
import groundImg from '/images/ground.png?url';

export default class Ground {
  constructor(ctx, width, height, speed, scaleRatio) {
    this.ctx = ctx;
    this.canvas = ctx.canvas;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.scaleRatio = scaleRatio;

    this.x = 0;
    this.y = this.canvas.height - this.height;

    this.groundImage = new Image();
    this.groundImage.src = groundImg;
    this.groundImage.onerror = () => console.error('Failed to load ground.png');
  }

  update(gameSpeed, frameTimeDelta) {
    this.x -= gameSpeed * frameTimeDelta * this.speed * this.scaleRatio;
  }

  draw() {
    // Draw a grass-like ground
    this.ctx.fillStyle = "#7BA428";
    this.ctx.fillRect(0, this.y, this.canvas.width, this.height);
    
    // Add some texture lines for grass effect
    this.ctx.fillStyle = "#6B9420";
    for (let i = 0; i < this.canvas.width; i += 3) {
      this.ctx.fillRect(i, this.y, 1, this.height);
    }
    
    // Add some darker earth below
    this.ctx.fillStyle = "#8B4513";
    this.ctx.fillRect(0, this.y + this.height * 0.7, this.canvas.width, this.height * 0.3);

    if (this.x < -this.width) {
      this.x = 0;
    }
  }

  reset() {
    this.x = 0;
  }
}
