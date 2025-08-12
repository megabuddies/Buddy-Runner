import React, { useEffect, useRef, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import Player from '../game/Player.js';
import Ground from '../game/Ground.js';
import CarrotController from '../game/CarrotController.js';
import Score from '../game/Score.js';
import blockchainService from '../services/blockchainService.js';

const GameComponent = () => {
  const canvasRef = useRef(null);
  const gameRef = useRef({});
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [blockchainStatus, setBlockchainStatus] = useState({
    initialized: false,
    networkName: 'Unknown',
    contractAvailable: false,
    pendingTransactions: 0,
    totalMovements: 0,
    onChainScore: 0
  });

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
    { width: 48 / 1.5, height: 100 / 1.5, image: "/images/carrot_1.png" },
    { width: 98 / 1.5, height: 100 / 1.5, image: "/images/carrot_2.png" },
    { width: 68 / 1.5, height: 70 / 1.5, image: "/images/carrot_3.png" },
  ];

  // Initialize blockchain service
  const initializeBlockchain = async () => {
    if (!authenticated || !wallets || wallets.length === 0) {
      setBlockchainStatus(prev => ({ ...prev, initialized: false }));
      return;
    }

    try {
      const wallet = wallets[0]; // Use first available wallet
      const success = await blockchainService.initialize(wallet);
      
      setBlockchainStatus({
        initialized: success,
        networkName: blockchainService.getNetworkName(),
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
      setBlockchainStatus(prev => ({ ...prev, initialized: false }));
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
          const session = await blockchainService.getPlayerSession(walletAddress);
          if (session) {
            setBlockchainStatus(prev => ({
              ...prev,
              onChainScore: parseInt(session.score)
            }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to process on-chain movement:', error);
    }
  };

  const getWalletInfo = () => {
    if (!authenticated || !user) return null;
    
    const getWalletAddress = () => {
      if (user?.wallet?.address) {
        return user.wallet.address;
      }
      if (user?.linkedAccounts) {
        const walletAccount = user.linkedAccounts.find(account => account.type === 'wallet');
        return walletAccount?.address;
      }
      return null;
    };

    const getUserIdentifier = () => {
      if (user?.email?.address) {
        return user.email.address;
      }
      if (user?.phone?.number) {
        return user.phone.number;
      }
      const walletAddress = getWalletAddress();
      if (walletAddress) {
        return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
      }
      return 'Player';
    };

    return {
      address: getWalletAddress(),
      identifier: getUserIdentifier(),
      user: user
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize blockchain when wallet is connected
    if (authenticated && wallets && wallets.length > 0) {
      initializeBlockchain();
    }

    const ctx = canvas.getContext('2d');
    let animationId;

    // Initialize game state
    gameRef.current = {
      scaleRatio: null,
      previousTime: null,
      gameSpeed: GAME_SPEED_START,
      gameOver: false,
      hasAddedEventListenersForRestart: false,
      waitingToStart: true,
      player: null,
      ground: null,
      carrotController: null,
      score: null
    };

    const game = gameRef.current;

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
        game.scaleRatio,
        handleOnChainMovement
      );

      game.ground = new Ground(
        ctx,
        groundWidthInGame,
        groundHeightInGame,
        GROUND_AND_CARROT_SPEED,
        game.scaleRatio
      );

      const carrotImages = CARROT_CONFIG.map((carrot) => {
        const image = new Image();
        image.src = carrot.image;
        return {
          image: image,
          width: carrot.width * game.scaleRatio,
          height: carrot.height * game.scaleRatio,
        };
      });

      game.carrotController = new CarrotController(
        ctx,
        carrotImages,
        game.scaleRatio,
        GROUND_AND_CARROT_SPEED
      );

      game.score = new Score(ctx, game.scaleRatio, blockchainStatus);
    }

    function setScreen() {
      game.scaleRatio = getScaleRatio();
      canvas.width = GAME_WIDTH * game.scaleRatio;
      canvas.height = GAME_HEIGHT * game.scaleRatio;
      createSprites();
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

      if (screenWidth / screenHeight < GAME_WIDTH / GAME_HEIGHT) {
        return screenWidth / GAME_WIDTH;
      } else {
        return screenHeight / GAME_HEIGHT;
      }
    }

    function clearScreen() {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#87CEEB");
      gradient.addColorStop(0.7, "#B0E0E6");
      gradient.addColorStop(1, "#F0F8FF");
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add clouds
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      const cloudY = canvas.height * 0.2;
      const cloudSize = 20 * game.scaleRatio;
      
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
    }

    function showGameOverWithWallet() {
      const fontSize = Math.floor(game.scaleRatio * 70);
      ctx.font = `${fontSize}px Verdana`;
      ctx.fillStyle = "red";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - fontSize);

      const restartFontSize = Math.floor(game.scaleRatio * 30);
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
        const walletFontSize = Math.floor(game.scaleRatio * 20);
        ctx.font = `${walletFontSize}px monospace`;
        ctx.fillStyle = "#6B8E6B";
        ctx.fillText(
          `Player: ${walletInfo.identifier}`,
          canvas.width / 2,
          canvas.height / 2 + restartFontSize + walletFontSize + 10
        );
      }
    }

    function showStartGameTextWithWallet() {
      const fontSize = Math.floor(game.scaleRatio * 40);
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
      const statusFontSize = Math.floor(game.scaleRatio * 20);
      ctx.font = `${statusFontSize}px Verdana`;
      
      if (walletInfo) {
        ctx.fillStyle = "#6B8E6B";
        ctx.fillText(
          `🔗 Connected as ${walletInfo.identifier}`,
          canvas.width / 2,
          canvas.height / 2 + fontSize + 10
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
      game.ground?.reset();
      game.carrotController?.reset();
      game.score?.reset();
      game.gameSpeed = GAME_SPEED_START;
    }

    function updateGameSpeed(frameTimeDelta) {
      game.gameSpeed += frameTimeDelta * GAME_SPEED_INCREMENT;
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
        game.ground?.update(game.gameSpeed, frameTimeDelta);
        game.carrotController?.update(game.gameSpeed, frameTimeDelta);
        game.player?.update(game.gameSpeed, frameTimeDelta);
        game.score?.update(frameTimeDelta);
        updateGameSpeed(frameTimeDelta);
      }

      if (!game.gameOver && game.carrotController?.collideWith(game.player)) {
        game.gameOver = true;
        setupGameReset();
        game.score?.setHighScore();
      }

      // Draw game objects
      game.ground?.draw();
      game.carrotController?.draw();
      game.player?.draw();
      game.score?.draw();

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
  }, [authenticated, user]);

  return (
    <canvas 
      ref={canvasRef} 
      id="game"
      style={{
        border: '3px solid #7FBC7F',
        borderRadius: '20px',
        boxShadow: '0 6px 20px rgba(127, 188, 127, 0.4)'
      }}
    />
  );
};

export default GameComponent;