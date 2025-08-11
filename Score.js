export default class Score {
  score = 0;
  HIGH_SCORE_KEY = "buddyHighScore";

  constructor(ctx, scaleRatio) {
    this.ctx = ctx;
    this.canvas = ctx.canvas;
    this.scaleRatio = scaleRatio;
  }

  update(frameTimeDelta) {
    this.score += frameTimeDelta * 0.01;
  }

  reset() {
    this.score = 0;
  }

  setHighScore() {
    const highScore = Number(localStorage.getItem(this.HIGH_SCORE_KEY));
    if (this.score > highScore) {
      localStorage.setItem(this.HIGH_SCORE_KEY, Math.floor(this.score));
    }
  }

  draw() {
    const highScore = Number(localStorage.getItem(this.HIGH_SCORE_KEY));
    const y = 25 * this.scaleRatio;

    const fontSize = 22 * this.scaleRatio;
    this.ctx.font = `bold ${fontSize}px Arial`;
    this.ctx.fillStyle = "#6B8E6B";
    
    // Add subtle shadow for score text
    this.ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;
    this.ctx.shadowBlur = 2;
    
    const scoreX = this.canvas.width - 85 * this.scaleRatio;
    const highScoreX = scoreX - 140 * this.scaleRatio;

    const scorePadded = Math.floor(this.score).toString().padStart(6, 0);
    const highScorePadded = highScore.toString().padStart(6, 0);

    // Draw current score with carrot emoji
    this.ctx.fillText(`🥕 ${scorePadded}`, scoreX, y);
    
    // Draw high score with trophy emoji
    this.ctx.fillText(`🏆 ${highScorePadded}`, highScoreX, y);
    
    // Reset shadow effects
    this.ctx.shadowColor = "transparent";
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.shadowBlur = 0;
  }
}
