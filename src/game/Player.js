// Import images as static assets - Vite will handle public directory assets automatically

export default class Player {
  WALK_ANIMATION_TIMER = 180;
  walkAnimationTimer = this.WALK_ANIMATION_TIMER;
  buddyRunImages = [];

  jumpPressed = false;
  jumpInProgress = false;
  falling = false;
  JUMP_SPEED = 0.65;
  GRAVITY = 0.38;
  
  dustParticles = [];
  showDust = false;
  dustTimer = 0;

  constructor(ctx, width, height, minJumpHeight, maxJumpHeight, scaleRatio, onMovementCallback = null) {
    this.ctx = ctx;
    this.canvas = ctx.canvas;
    this.width = width;
    this.height = height;
    this.minJumpHeight = minJumpHeight;
    this.maxJumpHeight = maxJumpHeight;
    this.scaleRatio = scaleRatio;
    this.onMovementCallback = onMovementCallback;

    this.x = 10 * scaleRatio;
    this.y = this.canvas.height - this.height - 1.5 * scaleRatio;
    this.yStandingPosition = this.y;

    // Initialize with fallback images first
    this.createFallbackImages();

    // Try to load real images
    this.loadImages();

    //keyboard
    window.removeEventListener("keydown", this.keydown);
    window.removeEventListener("keyup", this.keyup);

    window.addEventListener("keydown", this.keydown);
    window.addEventListener("keyup", this.keyup);

    //touch
    window.removeEventListener("touchstart", this.touchstart);
    window.removeEventListener("touchend", this.touchend);

    window.addEventListener("touchstart", this.touchstart);
    window.addEventListener("touchend", this.touchend);
  }

  // Create fallback images (colored rectangles)
  createFallbackImages() {
    const createColoredCanvas = (width, height, color) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
      
      const img = new Image();
      img.src = canvas.toDataURL();
      return img;
    };

    console.log("Creating fallback images...");
    this.standingStillImage = createColoredCanvas(88, 94, '#FF6B6B');
    this.image = this.standingStillImage;
    this.jumpingImage = createColoredCanvas(88, 94, '#4ECDC4');
    
    const runImage1 = createColoredCanvas(88, 94, '#45B7D1');
    const runImage2 = createColoredCanvas(88, 94, '#96CEB4');
    
    this.buddyRunImages = [runImage1, runImage2];
  }

  // Load real images asynchronously
  async loadImages() {
    const loadImage = (src, name) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          console.log(`✓ Successfully loaded: ${name} from ${src}`);
          resolve(img);
        };
        
        img.onerror = (error) => {
          console.error(`✗ Failed to load: ${name} from ${src}`, error);
          reject(new Error(`Failed to load ${name}`));
        };
        
        img.src = src;
      });
    };

    try {
      console.log("Attempting to load real images...");
      
      const standingStillImage = await loadImage("/images/buddy_standing_still.png", "buddy_standing_still");
      const jumpingImage = await loadImage("/images/buddy_standing_still_eye_closed.png", "buddy_standing_still_eye_closed");
      const runImage1 = await loadImage("/images/buddy_run1.png", "buddy_run1");
      const runImage2 = await loadImage("/images/buddy_run2.png", "buddy_run2");

      // Replace fallback images with real ones
      this.standingStillImage = standingStillImage;
      this.image = this.standingStillImage;
      this.jumpingImage = jumpingImage;
      this.buddyRunImages = [runImage1, runImage2];

      console.log("All Player images loaded successfully!");
    } catch (error) {
      console.error("Failed to load Player images, using fallbacks:", error);
    }
  }

  touchstart = () => {
    this.jumpPressed = true;
  };

  touchend = () => {
    this.jumpPressed = false;
  };

  keydown = (event) => {
    if (event.code === "Space") {
      this.jumpPressed = true;
    }
  };

  keyup = (event) => {
    if (event.code === "Space") {
      this.jumpPressed = false;
    }
  };

  update(gameSpeed, frameTimeDelta) {
    this.run(gameSpeed, frameTimeDelta);

    if (this.jumpInProgress) {
      this.image = this.jumpingImage;
    }

    this.jump(frameTimeDelta);
    this.updateDust(frameTimeDelta);
  }

  jump(frameTimeDelta) {
    if (this.jumpPressed) {
      if (!this.jumpInProgress) {
        // Trigger on-chain movement when starting a new jump
        if (this.onMovementCallback) {
          this.onMovementCallback();
        }
      }
      this.jumpInProgress = true;
    }

    if (this.jumpInProgress && !this.falling) {
      if (
        this.y > this.canvas.height - this.minJumpHeight ||
        (this.y > this.canvas.height - this.maxJumpHeight && this.jumpPressed)
      ) {
        this.y -= this.JUMP_SPEED * frameTimeDelta * this.scaleRatio;
      } else {
        this.falling = true;
      }
    } else {
      if (this.y < this.yStandingPosition) {
        this.y += this.GRAVITY * frameTimeDelta * this.scaleRatio;
        if (this.y + this.height > this.canvas.height) {
          this.y = this.yStandingPosition;
          // Create dust effect when landing
          this.createDustEffect();
        }
      } else {
        this.falling = false;
        this.jumpInProgress = false;
      }
    }
  }

  createDustEffect() {
    this.showDust = true;
    this.dustTimer = 300; // Show dust for 300ms
  }

  updateDust(frameTimeDelta) {
    if (this.showDust) {
      this.dustTimer -= frameTimeDelta;
      if (this.dustTimer <= 0) {
        this.showDust = false;
      }
    }
  }

  run(gameSpeed, frameTimeDelta) {
    if (this.walkAnimationTimer <= 0) {
      if (this.image === this.buddyRunImages[0]) {
        this.image = this.buddyRunImages[1];
      } else {
        this.image = this.buddyRunImages[0];
      }
      this.walkAnimationTimer = this.WALK_ANIMATION_TIMER;
    }
    this.walkAnimationTimer -= frameTimeDelta * gameSpeed;
  }

  draw() {
    if (this.image && this.image.complete && this.image.naturalWidth > 0) {
      this.ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
    
    // Draw dust effect when landing
    if (this.showDust) {
      this.ctx.fillStyle = "rgba(139, 69, 19, 0.6)";
      const dustY = this.yStandingPosition + this.height;
      for (let i = 0; i < 5; i++) {
        const dustX = this.x + this.width * 0.2 + i * 8 * this.scaleRatio;
        const dustSize = (3 - i * 0.5) * this.scaleRatio;
        this.ctx.beginPath();
        this.ctx.arc(dustX, dustY - dustSize, dustSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }
}
