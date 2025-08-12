import Player from "./Player.js";
import Ground from "./Ground.js";
import CarrotController from "./CarrotController.js";
import Score from "./Score.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const GAME_SPEED_START = 1; // 1.0
const GAME_SPEED_INCREMENT = 0.00001;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 200;
const PLAYER_WIDTH = 88 / 1.5; //58
const PLAYER_HEIGHT = 94 / 1.5; //62
const MAX_JUMP_HEIGHT = GAME_HEIGHT;
const MIN_JUMP_HEIGHT = 150;
const GROUND_WIDTH = 2400;
const GROUND_HEIGHT = 24;
const GROUND_AND_CARROT_SPEED = 0.5;

const CARROT_CONFIG = [
  { width: 48 / 1.5, height: 100 / 1.5, image: "images/carrot_1.png" },
  { width: 98 / 1.5, height: 100 / 1.5, image: "images/carrot_2.png" },
  { width: 68 / 1.5, height: 70 / 1.5, image: "images/carrot_3.png" },
];

//Game Objects
let player = null;
let ground = null;
let carrotController = null;
let score = null;

let scaleRatio = null;
let previousTime = null;
let gameSpeed = GAME_SPEED_START;
let gameOver = false;
let hasAddedEventListenersForRestart = false;
let waitingToStart = true;

function createSprites() {
  const playerWidthInGame = PLAYER_WIDTH * scaleRatio;
  const playerHeightInGame = PLAYER_HEIGHT * scaleRatio;
  const minJumpHeightInGame = MIN_JUMP_HEIGHT * scaleRatio;
  const maxJumpHeightInGame = MAX_JUMP_HEIGHT * scaleRatio;

  const groundWidthInGame = GROUND_WIDTH * scaleRatio;
  const groundHeightInGame = GROUND_HEIGHT * scaleRatio;

  player = new Player(
    ctx,
    playerWidthInGame,
    playerHeightInGame,
    minJumpHeightInGame,
    maxJumpHeightInGame,
    scaleRatio
  );

  ground = new Ground(
    ctx,
    groundWidthInGame,
    groundHeightInGame,
    GROUND_AND_CARROT_SPEED,
    scaleRatio
  );

  const carrotImages = CARROT_CONFIG.map((carrot) => {
    const image = new Image();
    image.src = carrot.image;
    return {
      image: image,
      width: carrot.width * scaleRatio,
      height: carrot.height * scaleRatio,
    };
  });

  carrotController = new CarrotController(
    ctx,
    carrotImages,
    scaleRatio,
    GROUND_AND_CARROT_SPEED
  );

  score = new Score(ctx, scaleRatio);
}

function setScreen() {
  scaleRatio = getScaleRatio();
  canvas.width = GAME_WIDTH * scaleRatio;
  canvas.height = GAME_HEIGHT * scaleRatio;
  createSprites();
}

setScreen();
//Use setTimeout on Safari mobile rotation otherwise works fine on desktop
window.addEventListener("resize", () => setTimeout(setScreen, 500));

if (screen.orientation) {
  screen.orientation.addEventListener("change", setScreen);
}

function getScaleRatio() {
  const screenHeight = Math.min(
    window.innerHeight,
    document.documentElement.clientHeight
  );

  const screenWidth = Math.min(
    window.innerWidth,
    document.documentElement.clientWidth
  );

  //window is wider than the game width
  if (screenWidth / screenHeight < GAME_WIDTH / GAME_HEIGHT) {
    return screenWidth / GAME_WIDTH;
  } else {
    return screenHeight / GAME_HEIGHT;
  }
}

function showGameOver() {
  showGameOverWithWallet();
}

function setupGameReset() {
  if (!hasAddedEventListenersForRestart) {
    hasAddedEventListenersForRestart = true;

    setTimeout(() => {
      window.addEventListener("keyup", reset, { once: true });
      window.addEventListener("touchstart", reset, { once: true });
    }, 1000);
  }
}

function reset() {
  hasAddedEventListenersForRestart = false;
  gameOver = false;
  waitingToStart = false;
  ground.reset();
  carrotController.reset();
  score.reset();
  gameSpeed = GAME_SPEED_START;
}

function showStartGameText() {
  showStartGameTextWithWallet();
}

function updateGameSpeed(frameTimeDelta) {
  gameSpeed += frameTimeDelta * GAME_SPEED_INCREMENT;
}

function clearScreen() {
  // Create a beautiful sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#87CEEB");  // Sky blue
  gradient.addColorStop(0.7, "#B0E0E6"); // Powder blue
  gradient.addColorStop(1, "#F0F8FF");   // Alice blue
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some simple clouds
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  const cloudY = canvas.height * 0.2;
  const cloudSize = 20 * scaleRatio;
  
  // Cloud 1
  ctx.beginPath();
  ctx.arc(canvas.width * 0.2, cloudY, cloudSize, 0, Math.PI * 2);
  ctx.arc(canvas.width * 0.2 + cloudSize * 0.5, cloudY, cloudSize * 0.8, 0, Math.PI * 2);
  ctx.arc(canvas.width * 0.2 + cloudSize, cloudY, cloudSize * 0.6, 0, Math.PI * 2);
  ctx.fill();
  
  // Cloud 2
  ctx.beginPath();
  ctx.arc(canvas.width * 0.7, cloudY + cloudSize * 0.5, cloudSize * 0.7, 0, Math.PI * 2);
  ctx.arc(canvas.width * 0.7 + cloudSize * 0.4, cloudY + cloudSize * 0.5, cloudSize * 0.9, 0, Math.PI * 2);
  ctx.arc(canvas.width * 0.7 + cloudSize * 0.8, cloudY + cloudSize * 0.5, cloudSize * 0.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Add small flowers in the background
  const flowerSize = 4 * scaleRatio;
  const groundLevel = canvas.height - GROUND_HEIGHT * scaleRatio;
  
  // Flower 1
  ctx.fillStyle = "#FFB6C1";
  ctx.beginPath();
  ctx.arc(canvas.width * 0.15, groundLevel - flowerSize, flowerSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.arc(canvas.width * 0.15, groundLevel - flowerSize, flowerSize * 0.4, 0, Math.PI * 2);
  ctx.fill();
  
  // Flower 2
  ctx.fillStyle = "#DDA0DD";
  ctx.beginPath();
  ctx.arc(canvas.width * 0.85, groundLevel - flowerSize * 0.8, flowerSize * 0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFD700";
  ctx.beginPath();
  ctx.arc(canvas.width * 0.85, groundLevel - flowerSize * 0.8, flowerSize * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function gameLoop(currentTime) {
  if (previousTime === null) {
    previousTime = currentTime;
    requestAnimationFrame(gameLoop);
    return;
  }
  const frameTimeDelta = currentTime - previousTime;
  previousTime = currentTime;

  clearScreen();

  if (!gameOver && !waitingToStart) {
    //Update game objects
    ground.update(gameSpeed, frameTimeDelta);
    carrotController.update(gameSpeed, frameTimeDelta);
    player.update(gameSpeed, frameTimeDelta);
    score.update(frameTimeDelta);
    updateGameSpeed(frameTimeDelta);
  }

  if (!gameOver && carrotController.collideWith(player)) {
    gameOver = true;
    setupGameReset();
    score.setHighScore();
  }

  //Draw game objects
  ground.draw();
  carrotController.draw();
  player.draw();
  score.draw();

  if (gameOver) {
    showGameOver();
  }

  if (waitingToStart) {
    showStartGameText();
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

// Wallet integration functionality
function getWalletInfo() {
  if (window.privyWallet && window.privyWallet.isWalletConnected()) {
    return {
      address: window.privyWallet.getWalletAddress(),
      user: window.privyWallet.getCurrentUser()
    };
  }
  return null;
}

// Enhanced game over screen with wallet info
function showGameOverWithWallet() {
  const fontSize = Math.floor(scaleRatio * 70);
  ctx.font = `${fontSize}px Verdana`;
  ctx.fillStyle = "red";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - fontSize);

  const restartFontSize = Math.floor(scaleRatio * 30);
  ctx.font = `${restartFontSize}px Verdana`;
  ctx.fillStyle = "black";
  ctx.fillText(
    "Press any key or touch to restart",
    canvas.width / 2,
    canvas.height / 2 + restartFontSize
  );

  // Show wallet info if connected
  const walletInfo = getWalletInfo();
  if (walletInfo) {
    const walletFontSize = Math.floor(scaleRatio * 20);
    ctx.font = `${walletFontSize}px monospace`;
    ctx.fillStyle = "#6B8E6B";
    ctx.fillText(
      `Player: ${walletInfo.address.slice(0, 6)}...${walletInfo.address.slice(-4)}`,
      canvas.width / 2,
      canvas.height / 2 + restartFontSize + walletFontSize + 10
    );
  }
}

// Enhanced start screen with wallet connection prompt
function showStartGameTextWithWallet() {
  const fontSize = Math.floor(scaleRatio * 40);
  ctx.font = `${fontSize}px Verdana`;
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.fillText(
    "Press any key or touch to start",
    canvas.width / 2,
    canvas.height / 2
  );

  // Show wallet connection status
  const walletInfo = getWalletInfo();
  const statusFontSize = Math.floor(scaleRatio * 20);
  ctx.font = `${statusFontSize}px Verdana`;
  
  if (walletInfo) {
    ctx.fillStyle = "#6B8E6B";
    ctx.fillText(
      `🔗 Wallet Connected`,
      canvas.width / 2,
      canvas.height / 2 + fontSize + 10
    );
    
    ctx.font = `${Math.floor(scaleRatio * 16)}px monospace`;
    ctx.fillText(
      `${walletInfo.address.slice(0, 8)}...${walletInfo.address.slice(-6)}`,
      canvas.width / 2,
      canvas.height / 2 + fontSize + statusFontSize + 20
    );
  } else {
    ctx.fillStyle = "#8B7355";
    ctx.fillText(
      "💳 Connect wallet in top-right corner",
      canvas.width / 2,
      canvas.height / 2 + fontSize + 10
    );
  }
}

window.addEventListener("keyup", reset, { once: true });
window.addEventListener("touchstart", reset, { once: true });
