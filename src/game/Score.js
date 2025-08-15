export default class Score {
  score = 0;
  HIGH_SCORE_KEY = "highScore";

  constructor(ctx, scaleRatio, blockchainStatus = null) {
    this.ctx = ctx;
    this.canvas = ctx.canvas;
    this.scaleRatio = scaleRatio;
    this.blockchainStatus = blockchainStatus;
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
    const y = 20 * this.scaleRatio;

    const fontSize = 20 * this.scaleRatio;
    this.ctx.font = `${fontSize}px serif`;
    this.ctx.fillStyle = "#6B8E6B";
    const scoreX = this.canvas.width - 75 * this.scaleRatio;
    const highScoreX = scoreX - 125 * this.scaleRatio;

    const scorePadded = Math.floor(this.score).toString().padStart(6, 0);
    const highScorePadded = highScore.toString().padStart(6, 0);

    this.ctx.fillText(scorePadded, scoreX, y);
    this.ctx.fillText(`HI ${highScorePadded}`, highScoreX, y);

    // Draw blockchain status if available
    if (this.blockchainStatus) {
      const blockchainY = y + 30 * this.scaleRatio;
      const smallFontSize = 12 * this.scaleRatio;
      this.ctx.font = `${smallFontSize}px monospace`;
      
      // Network name
      this.ctx.fillStyle = this.blockchainStatus.contractAvailable ? "#7FBC7F" : "#FFA500";
      this.ctx.fillText(
        `⛓️ ${this.blockchainStatus.networkName}`,
        10 * this.scaleRatio,
        blockchainY
      );

      // On-chain movements
      this.ctx.fillStyle = "#4169E1";
      this.ctx.fillText(
        `Moves: ${this.blockchainStatus.totalMovements}`,
        10 * this.scaleRatio,
        blockchainY + 20 * this.scaleRatio
      );

      // Pending transactions
      if (this.blockchainStatus.pendingTransactions > 0) {
        this.ctx.fillStyle = "#FF6347";
        this.ctx.fillText(
          `Pending: ${this.blockchainStatus.pendingTransactions}`,
          10 * this.scaleRatio,
          blockchainY + 40 * this.scaleRatio
        );
      }

      // Pre-signed pool status (PRE-SIGNED ONLY MODE)
      if (this.blockchainStatus.poolStatus) {
        const pool = this.blockchainStatus.poolStatus;
        const poolColor = pool.remaining > 15 ? "#32CD32" : pool.remaining > 5 ? "#FFA500" : "#FF6347";
        this.ctx.fillStyle = poolColor;
        this.ctx.fillText(
          `Pool: ${pool.remaining}/${pool.total}`,
          10 * this.scaleRatio,
          blockchainY + 40 * this.scaleRatio
        );
        
        // Pool status indicator
        if (!pool.isReady) {
          this.ctx.fillStyle = "#FF6347";
          this.ctx.fillText(
            `⏳ Preparing...`,
            10 * this.scaleRatio,
            blockchainY + 60 * this.scaleRatio
          );
        } else if (pool.isRefilling) {
          this.ctx.fillStyle = "#4169E1";
          this.ctx.fillText(
            `🔄 Refilling...`,
            10 * this.scaleRatio,
            blockchainY + 60 * this.scaleRatio
          );
        }
      }

      // On-chain score (if available)
      if (this.blockchainStatus.onChainScore > 0) {
        this.ctx.fillStyle = "#32CD32";
        this.ctx.fillText(
          `On-chain: ${this.blockchainStatus.onChainScore}`,
          10 * this.scaleRatio,
          blockchainY + 80 * this.scaleRatio
        );
      }
    }
  }
}
