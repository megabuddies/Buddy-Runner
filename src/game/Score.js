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

      // INFINITE PRE-SIGNED POOL status
      if (this.blockchainStatus.poolStatus) {
        const pool = this.blockchainStatus.poolStatus;
        const cyclesCompleted = Math.floor(pool.used / 5);
        const netGrowth = cyclesCompleted * 10;
        
        // Dynamic color based on infinite pool logic - UPDATED FOR 10000 POOL SIZE
        const poolColor = pool.remaining > 1000 ? "#32CD32" : pool.remaining > 500 ? "#7FBC7F" : pool.remaining > 100 ? "#FFA500" : "#FF6347";
        this.ctx.fillStyle = poolColor;
        
        // Pool status with infinite indicator - UPDATED FOR 10000 POOL SIZE
        const infiniteIndicator = pool.total > 1000 ? "∞" : "";
        this.ctx.fillText(
          `Pool: ${pool.remaining}/${pool.total}${infiniteIndicator}`,
          10 * this.scaleRatio,
          blockchainY + 40 * this.scaleRatio
        );
        
        // Growth statistics
        if (pool.used > 0) {
          this.ctx.fillStyle = "#4169E1";
          this.ctx.fillText(
            `Growth: +${netGrowth} (${cyclesCompleted} cycles)`,
            10 * this.scaleRatio,
            blockchainY + 60 * this.scaleRatio
          );
        }
        
        // Pool status indicator - UPDATED FOR 10000 POOL SIZE
        if (!pool.isReady) {
          this.ctx.fillStyle = "#FF6347";
          this.ctx.fillText(
            `⏳ Initializing...`,
            10 * this.scaleRatio,
            blockchainY + 80 * this.scaleRatio
          );
        } else if (pool.isRefilling) {
          this.ctx.fillStyle = "#32CD32";
          this.ctx.fillText(
            `🔄 Growing pool...`,
            10 * this.scaleRatio,
            blockchainY + 80 * this.scaleRatio
          );
        } else if (pool.total > 1000) {
          this.ctx.fillStyle = "#7FBC7F";
          this.ctx.fillText(
            `♾️ Infinite mode`,
            10 * this.scaleRatio,
            blockchainY + 80 * this.scaleRatio
          );
        }
      }

      // On-chain score (if available)
      if (this.blockchainStatus.onChainScore > 0) {
        this.ctx.fillStyle = "#32CD32";
        this.ctx.fillText(
          `On-chain: ${this.blockchainStatus.onChainScore}`,
          10 * this.scaleRatio,
          blockchainY + 100 * this.scaleRatio
        );
      }
    }
  }
}