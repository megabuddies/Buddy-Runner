import React, { useEffect, useRef, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import Player from '../game/Player.js';
import Ground from '../game/Ground.js';
import CarrotController from '../game/CarrotController.js';
import Score from '../game/Score.js';
import blockchainService from '../services/blockchainService.js';

const GameComponent = ({ selectedNetwork }) => {
  const canvasRef = useRef(null);
  const gameRef = useRef({});
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [blockchainStatus, setBlockchainStatus] = useState({
    initialized: false,
    networkName: selectedNetwork?.name || 'Unknown',
    contractAvailable: false,
    pendingTransactions: 0,
    totalMovements: 0,
    onChainScore: 0
  });

  // Game constants with pixel art scaling
  const GAME_SPEED_START = 1;
  const GAME_SPEED_INCREMENT = 0.00001;
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 200;
  const PLAYER_WIDTH = 88 / 1.5;
  const PLAYER_HEIGHT = 94 / 1.5;
  const MAX_JUMP_HEIGHT = GAME_HEIGHT;
  const MIN_JUMP_HEIGHT = 150;
  const GROUND_WIDTH = 2400;
  const GROUND_HEIGHT = 24;
  const GROUND_AND_CARROT_SPEED = 0.5;

  const CARROT_CONFIG = [
    { width: 48 / 1.5, height: 100 / 1.5, imageSrc: "images/carrot_1.png" },
    { width: 98 / 1.5, height: 100 / 1.5, imageSrc: "images/carrot_2.png" },
    { width: 68 / 1.5, height: 70 / 1.5, imageSrc: "images/carrot_3.png" },
  ];

  // Initialize blockchain service
  const initializeBlockchain = async () => {
    if (!authenticated || !wallets || wallets.length === 0 || !selectedNetwork) {
      setBlockchainStatus(prev => ({ ...prev, initialized: false }));
      return;
    }

    try {
      const wallet = wallets[0]; // Use first available wallet
      
      // First, ensure the wallet is on the correct network
      try {
        await wallet.switchChain(selectedNetwork.id);
        console.log(`Switched to ${selectedNetwork.name}`);
      } catch (switchError) {
        console.warn(`Failed to switch to ${selectedNetwork.name}:`, switchError);
        // Continue anyway, blockchain service will handle the network mismatch
      }
      
      const success = await blockchainService.initialize(wallet);
      
      setBlockchainStatus({
        initialized: success,
        networkName: selectedNetwork.name,
        contractAvailable: blockchainService.isContractAvailable(),
        pendingTransactions: 0,
        totalMovements: 0,
        onChainScore: 0
      });

      // Start game session on blockchain if contract is available
      if (success && blockchainService.isContractAvailable()) {
        await blockchainService.startGame();
      }
    } catch (error) {
      console.error('Failed to initialize blockchain:', error);
      setBlockchainStatus(prev => ({ 
        ...prev, 
        initialized: false, 
        networkName: selectedNetwork.name 
      }));
    }
  };

  // Handle on-chain movement
  const handleOnChainMovement = async () => {
    if (!blockchainStatus.initialized) return;

    try {
      const result = await blockchainService.makeMovement();
      
      setBlockchainStatus(prev => ({
        ...prev,
        totalMovements: prev.totalMovements + 1,
        pendingTransactions: blockchainService.getPendingTransactions()
      }));

      // Update on-chain score if available
      if (result.success && !result.simulated) {
        const walletAddress = getWalletAddress();
        if (walletAddress) {
          const score = await blockchainService.getPlayerScore(walletAddress);
          setBlockchainStatus(prev => ({ ...prev, onChainScore: score }));
        }
      }
    } catch (error) {
      console.error('On-chain movement failed:', error);
    }
  };

  // Get wallet information for display
  const getWalletInfo = () => {
    // For web2 mode, return special identifier
    if (selectedNetwork && selectedNetwork.isWeb2) {
      return {
        identifier: "CLASSIC PLAYER",
        address: null,
        isWeb2: true
      };
    }
    
    if (!authenticated || !user) return null;
    
    const address = getWalletAddress();
    if (address) {
      return {
        identifier: `${address.slice(0, 6)}...${address.slice(-4)}`,
        address: address
      };
    }
    
    if (user.email) {
      return {
        identifier: user.email.split('@')[0],
        address: null
      };
    }
    
    return null;
  };

  // Get wallet address
  const getWalletAddress = () => {
    if (!authenticated || !wallets || wallets.length === 0) return null;
    return wallets[0]?.address || null;
  };

  useEffect(() => {
    // Skip blockchain initialization for web2 mode
    if (selectedNetwork && selectedNetwork.isWeb2) {
      setBlockchainStatus({
        initialized: false,
        networkName: selectedNetwork.name,
        contractAvailable: false,
        pendingTransactions: 0,
        totalMovements: 0,
        onChainScore: 0
      });
      return;
    }
    
    initializeBlockchain();
  }, [authenticated, user, selectedNetwork]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;
    
    // Disable image smoothing for pixel art effect
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    const game = gameRef.current;
    Object.assign(game, {
      scaleRatio: null,
      previousTime: null,
      gameSpeed: GAME_SPEED_START,
      gameOver: false,
      hasAddedEventListenersForRestart: false,
      waitingToStart: true
    });

    function createSprites() {
      const playerWidthInGame = PLAYER_WIDTH * game.scaleRatio;
      const playerHeightInGame = PLAYER_HEIGHT * game.scaleRatio;
      const minJumpHeightInGame = MIN_JUMP_HEIGHT * game.scaleRatio;
      const maxJumpHeightInGame = MAX_JUMP_HEIGHT * game.scaleRatio;

      const groundWidthInGame = GROUND_WIDTH * game.scaleRatio;
      const groundHeightInGame = GROUND_HEIGHT * game.scaleRatio;

      game.player = new Player(
        ctx,
        playerWidthInGame,
        playerHeightInGame,
        minJumpHeightInGame,
        maxJumpHeightInGame,
        game.scaleRatio
      );

      game.ground = new Ground(
        ctx,
        groundWidthInGame,
        groundHeightInGame,
        GROUND_AND_CARROT_SPEED,
        game.scaleRatio
      );

      const carrotImages = CARROT_CONFIG.map(carrot => {
        const image = new Image();
        image.src = carrot.imageSrc;
        image.onerror = () => console.error(`Failed to load ${carrot.imageSrc}`);
        return {
          image: image,
          width: carrot.width * game.scaleRatio,
          height: carrot.height * game.scaleRatio
        };
      });

      game.carrotController = new CarrotController(
        ctx,
        carrotImages,
        game.scaleRatio,
        GROUND_AND_CARROT_SPEED
      );

      game.score = new Score(ctx, game.scaleRatio);
    }

    function setScreen() {
      game.scaleRatio = getScaleRatio();
      canvas.width = GAME_WIDTH * game.scaleRatio;
      canvas.height = GAME_HEIGHT * game.scaleRatio;
      createSprites();
    }

    function getScaleRatio() {
      const screenHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
      const screenWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);

      if (screenWidth / screenHeight < GAME_WIDTH / GAME_HEIGHT) {
        return screenWidth / GAME_WIDTH;
      } else {
        return screenHeight / GAME_HEIGHT;
      }
    }

    function showGameOverWithWallet() {
      // Create pixelated cyberpunk-style game over screen
      const fontSize = Math.floor(game.scaleRatio * 32);
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = "#ef5435";
      ctx.textAlign = "center";
      
      // Add glow effect
      ctx.shadowColor = "#ef5435";
      ctx.shadowBlur = 10;
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - fontSize);
      ctx.shadowBlur = 0;

      const restartFontSize = Math.floor(game.scaleRatio * 16);
      ctx.font = `${restartFontSize}px monospace`;
      ctx.fillStyle = "#929397";
      ctx.fillText(
        "> PRESS ANY KEY TO RESTART",
        canvas.width / 2,
        canvas.height / 2 + restartFontSize
      );

      // Show blockchain status
      const walletInfo = getWalletInfo();
      if (walletInfo) {
        const walletFontSize = Math.floor(game.scaleRatio * 12);
        ctx.font = `${walletFontSize}px monospace`;
        ctx.fillStyle = "#1391ff";
        ctx.fillText(
          `> PILOT: ${walletInfo.identifier}`,
          canvas.width / 2,
          canvas.height / 2 + restartFontSize + walletFontSize + 20
        );
        
        // Show blockchain stats
        ctx.fillStyle = "#929397";
        ctx.fillText(
          `> NETWORK: ${blockchainStatus.networkName}`,
          canvas.width / 2,
          canvas.height / 2 + restartFontSize + walletFontSize * 2 + 25
        );
        
        if (blockchainStatus.totalMovements > 0) {
          ctx.fillText(
            `> ON-CHAIN MOVES: ${blockchainStatus.totalMovements}`,
            canvas.width / 2,
            canvas.height / 2 + restartFontSize + walletFontSize * 3 + 30
          );
        }
      }
    }

    function showStartGameTextWithWallet() {
      // Create cyberpunk-style start screen
      const fontSize = Math.floor(game.scaleRatio * 24);
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = "#929397";
      ctx.textAlign = "center";
      
      // Add subtle glow effect
      ctx.shadowColor = "#929397";
      ctx.shadowBlur = 5;
      ctx.fillText(
        "> PRESS ANY KEY TO START MISSION",
        canvas.width / 2,
        canvas.height / 2
      );
      ctx.shadowBlur = 0;

      // Show connection status
      const walletInfo = getWalletInfo();
      const statusFontSize = Math.floor(game.scaleRatio * 12);
      ctx.font = `${statusFontSize}px monospace`;
      
      if (walletInfo) {
        ctx.fillStyle = "#1391ff";
        ctx.shadowColor = "#1391ff";
        ctx.shadowBlur = 3;
        ctx.fillText(
          `> PILOT AUTHENTICATED: ${walletInfo.identifier}`,
          canvas.width / 2,
          canvas.height / 2 + fontSize + 20
        );
        ctx.shadowBlur = 0;
        
        // Show network status
        ctx.fillStyle = "#929397";
        ctx.fillText(
          `> TARGET NETWORK: ${blockchainStatus.networkName}`,
          canvas.width / 2,
          canvas.height / 2 + fontSize + statusFontSize + 25
        );
        
        if (blockchainStatus.initialized) {
          ctx.fillStyle = "#28a745";
          ctx.fillText(
            "> BLOCKCHAIN CONNECTION: ACTIVE",
            canvas.width / 2,
            canvas.height / 2 + fontSize + statusFontSize * 2 + 30
          );
        } else {
          ctx.fillStyle = "#ffc107";
          ctx.fillText(
            "> BLOCKCHAIN CONNECTION: SIMULATED MODE",
            canvas.width / 2,
            canvas.height / 2 + fontSize + statusFontSize * 2 + 30
          );
        }
      } else {
        ctx.fillStyle = "#ef5435";
        ctx.fillText(
          "> WARNING: NO PILOT AUTHENTICATED",
          canvas.width / 2,
          canvas.height / 2 + fontSize + 20
        );
      }
    }

    function clearScreen() {
      // Create cyberpunk-style background with grid pattern
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#121218");
      gradient.addColorStop(0.5, "#1a1a2e");
      gradient.addColorStop(1, "#16213e");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add grid overlay
      ctx.strokeStyle = "rgba(146, 147, 151, 0.1)";
      ctx.lineWidth = 1;
      
      const gridSize = 20 * game.scaleRatio;
      
      // Vertical lines
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Add scanning line effect
      const scanLineY = (Date.now() / 20) % canvas.height;
      ctx.strokeStyle = "rgba(19, 145, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scanLineY);
      ctx.lineTo(canvas.width, scanLineY);
      ctx.stroke();
      
      // Add glow effect at top
      const glowGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.3);
      glowGradient.addColorStop(0, "rgba(19, 145, 255, 0.1)");
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.3);
    }

    function setupGameReset() {
      if (!game.hasAddedEventListenersForRestart) {
        game.hasAddedEventListenersForRestart = true;
        setTimeout(() => {
          const resetHandler = () => {
            reset();
            document.removeEventListener("keyup", resetHandler);
            document.removeEventListener("touchstart", resetHandler);
          };
          document.addEventListener("keyup", resetHandler);
          document.addEventListener("touchstart", resetHandler);
        }, 1000);
      }
    }

    function reset() {
      game.hasAddedEventListenersForRestart = false;
      game.gameOver = false;
      game.waitingToStart = false;
      game.ground.reset();
      game.carrotController.reset();
      game.score.reset();
      game.gameSpeed = GAME_SPEED_START;
    }

    function updateGameSpeed(frameTimeDelta) {
      game.gameSpeed += frameTimeDelta * GAME_SPEED_INCREMENT;
    }

    function checkCollision() {
      const carrotBoxes = game.carrotController.collisionBoxes;
      const playerBox = game.player.collisionBox;

      return carrotBoxes.some(carrotBox => collision(carrotBox, playerBox));
    }

    function collision(rect1, rect2) {
      return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
      );
    }

    function gameLoop(currentTime) {
      if (game.previousTime === null) {
        game.previousTime = currentTime;
        animationId = requestAnimationFrame(gameLoop);
        return;
      }

      const frameTimeDelta = currentTime - game.previousTime;
      game.previousTime = currentTime;

      clearScreen();

      if (!game.gameOver && !game.waitingToStart) {
        // Update
        game.ground.update(game.gameSpeed, frameTimeDelta);
        game.carrotController.update(game.gameSpeed, frameTimeDelta);
        game.player.update(game.gameSpeed, frameTimeDelta);
        game.score.update(frameTimeDelta);
        updateGameSpeed(frameTimeDelta);

        // Check collision
        if (checkCollision()) {
          game.gameOver = true;
          setupGameReset();
        }

        // Handle blockchain movement (every few frames to avoid spam)
        if (Math.random() < 0.01) { // ~1% chance per frame
          handleOnChainMovement();
        }
      }

      // Draw
      game.ground.draw();
      game.carrotController.draw();
      game.player.draw();
      game.score.draw();

      if (game.gameOver) {
        showGameOverWithWallet();
      }

      if (game.waitingToStart) {
        showStartGameTextWithWallet();
      }

      animationId = requestAnimationFrame(gameLoop);
    }

    // Initialize game
    setScreen();
    
    // Handle resize
    const handleResize = () => setTimeout(setScreen, 500);
    window.addEventListener("resize", handleResize);
    
    if (screen.orientation) {
      screen.orientation.addEventListener("change", setScreen);
    }

    // Initial input handlers
    const initialKeyHandler = () => {
      reset();
      document.removeEventListener("keyup", initialKeyHandler);
      document.removeEventListener("touchstart", initialKeyHandler);
    };
    
    document.addEventListener("keyup", initialKeyHandler);
    document.addEventListener("touchstart", initialKeyHandler);

    // Start game loop
    animationId = requestAnimationFrame(gameLoop);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      window.removeEventListener("resize", handleResize);
      if (screen.orientation) {
        screen.orientation.removeEventListener("change", setScreen);
      }
      document.removeEventListener("keyup", initialKeyHandler);
      document.removeEventListener("touchstart", initialKeyHandler);
    };
  }, [authenticated, user, selectedNetwork]);

  return (
    <div className="game-canvas-container">
      <canvas 
        ref={canvasRef} 
        id="game"
        className="game-canvas"
      />
      <div className="game-ui-overlay">
      </div>
    </div>
  );
};

export default GameComponent;