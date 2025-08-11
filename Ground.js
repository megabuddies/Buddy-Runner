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
    this.groundImage.src = "images/ground.png";
  }

  update(gameSpeed, frameTimeDelta) {
    this.x -= gameSpeed * frameTimeDelta * this.speed * this.scaleRatio;
  }

  draw() {
    // Draw main ground texture
    this.ctx.drawImage(
      this.groundImage,
      this.x,
      this.y,
      this.width,
      this.height
    );

    this.ctx.drawImage(
      this.groundImage,
      this.x + this.width,
      this.y,
      this.width,
      this.height
    );

    // Add garden-like grass details on top
    this.drawGrassDetails();

    if (this.x < -this.width) {
      this.x = 0;
    }
  }

  drawGrassDetails() {
    // Draw small grass tufts on top of the ground for garden theme
    this.ctx.fillStyle = "#7BA05B";
    const grassY = this.y - 2 * this.scaleRatio;
    const grassHeight = 4 * this.scaleRatio;
    
    // Create repeating grass pattern
    for (let i = 0; i < this.canvas.width + 100; i += 20 * this.scaleRatio) {
      const grassX = (this.x + i) % (this.canvas.width + 100);
      
      // Draw small grass blades
      this.ctx.fillRect(grassX, grassY, 2 * this.scaleRatio, grassHeight);
      this.ctx.fillRect(grassX + 3 * this.scaleRatio, grassY + 1 * this.scaleRatio, 1 * this.scaleRatio, grassHeight - 1 * this.scaleRatio);
      this.ctx.fillRect(grassX + 6 * this.scaleRatio, grassY, 2 * this.scaleRatio, grassHeight);
    }

    // Add some flower dots occasionally
    this.ctx.fillStyle = "#FFB6C1";
    for (let i = 0; i < this.canvas.width + 100; i += 80 * this.scaleRatio) {
      const flowerX = (this.x + i) % (this.canvas.width + 100);
      const flowerY = grassY + 1 * this.scaleRatio;
      
      // Small flower dot
      this.ctx.beginPath();
      this.ctx.arc(flowerX, flowerY, 1.5 * this.scaleRatio, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }

  reset() {
    this.x = 0;
  }
}
