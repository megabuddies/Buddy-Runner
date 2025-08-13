import Carrot from "./Carrot.js";

export default class CarrotController {
  CARROT_INTERVAL_MIN = 500;
  CARROT_INTERVAL_MAX = 2000;

  nextCarrotInterval = null;
  carrots = [];

  constructor(ctx, carrotImages, scaleRatio, speed) {
    this.ctx = ctx;
    this.canvas = ctx.canvas;
    this.carrotImages = carrotImages;
    this.scaleRatio = scaleRatio;
    this.speed = speed;

    this.setNextCarrotTime();
  }

  setNextCarrotTime() {
    const num = this.getRandomNumber(
      this.CARROT_INTERVAL_MIN,
      this.CARROT_INTERVAL_MAX
    );

    this.nextCarrotInterval = num;
  }

  getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  createCarrot() {
    const index = this.getRandomNumber(0, this.carrotImages.length - 1);
    const carrotImage = this.carrotImages[index];
    const x = this.canvas.width * 1.5;
    const y = this.canvas.height - carrotImage.height;
    const carrot = new Carrot(
      this.ctx,
      x,
      y,
      carrotImage.width,
      carrotImage.height,
      carrotImage.image
    );

    this.carrots.push(carrot);
  }

  update(gameSpeed, frameTimeDelta) {
    if (this.nextCarrotInterval <= 0) {
      this.createCarrot();
      this.setNextCarrotTime();
    }
    this.nextCarrotInterval -= frameTimeDelta;

    this.carrots.forEach((carrot) => {
      carrot.update(this.speed, gameSpeed, frameTimeDelta, this.scaleRatio);
    });

    this.carrots = this.carrots.filter((carrot) => carrot.x > -carrot.width);
  }

  get collisionBoxes() {
    return this.carrots.map(carrot => carrot.collisionBox);
  }

  draw() {
    this.carrots.forEach((carrot) => carrot.draw());
  }

  collideWith(sprite) {
    return this.carrots.some((carrot) => carrot.collideWith(sprite));
  }

  reset() {
    this.carrots = [];
  }
}
