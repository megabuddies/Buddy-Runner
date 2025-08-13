import React, { useRef, useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import Player from '../game/Player.js';
import Ground from '../game/Ground.js';
import CarrotController from '../game/CarrotController.js';
import Score from '../game/Score.js';
import blockchainService from '../services/blockchainService.js';
import { useOptimizedBlockchain } from '../hooks/useOptimizedBlockchain.js';

const GameComponent = ({ selectedNetwork }) => {
  const canvasRef = useRef(null);
  const gameRef = useRef({});
  const { user, authenticated } = usePrivy();
  const { wallets } = useWallets();
  
  // Интеграция оптимизированной blockchain системы
  const {
    initializeSystem,
    sendPlayerAction,
    isSystemReady,
    realtimeStats,
    contractState
  } = useOptimizedBlockchain();
  
  const [blockchainStatus, setBlockchainStatus] = useState({
    initialized: false,
    networkName: selectedNetwork?.name || 'Unknown',
    contractAvailable: false,
    pendingTransactions: 0,
    totalMovements: 0,
    onChainScore: 0,
    optimizedSystemReady: false,
    lastTransactionTime: null
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
    { width: 48 / 1.5, height: 100 / 1.5, imageSrc: "assets/carrot_1.png" },
    { width: 98 / 1.5, height: 100 / 1.5, imageSrc: "assets/carrot_2.png" },
    { width: 68 / 1.5, height: 70 / 1.5, imageSrc: "assets/carrot_3.png" },
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
      
      // Определяем ключ сети для оптимизированной системы
      let networkKey = 'local'; // по умолчанию
      if (selectedNetwork.id === 6342) networkKey = 'megaeth';
      else if (selectedNetwork.id === 84532) networkKey = 'base';
      
      console.log(`🚀 Инициализация оптимизированной blockchain системы для ${selectedNetwork.name}...`);
      
      // Инициализируем оптимизированную систему
      const optimizedSuccess = await initializeSystem(networkKey, 30); // 30 предподписанных транзакций для игры
      
      setBlockchainStatus({
        initialized: success,
        networkName: selectedNetwork.name,
        contractAvailable: blockchainService.isContractAvailable(),
        pendingTransactions: 0,
        totalMovements: 0,
        onChainScore: contractState.currentNumber || 0,
        optimizedSystemReady: optimizedSuccess,
        lastTransactionTime: null
      });
      
      if (optimizedSuccess) {
        console.log(`✅ Оптимизированная система готова! Каждый прыжок будет отправлен в блокчейн за ~1-10ms!`);
      } else {
        console.log(`⚠️ Используем fallback систему`);
      }

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

  // Handle on-chain movement with optimized blockchain system
  const handleOnChainMovement = async () => {
    if (!isSystemReady) {
      console.log('🎮 Optimized blockchain system not ready yet');
      return;
    }

    try {
      const actionStartTime = performance.now();
      
      // Отправляем действие через оптимизированную систему
      const result = await sendPlayerAction();
      
      if (result.success) {
        setBlockchainStatus(prev => ({
          ...prev,
          totalMovements: prev.totalMovements + 1,
          lastTransactionTime: result.executionTime,
          onChainScore: contractState.currentNumber || prev.onChainScore
        }));
        
        console.log(`🚀 Прыжок отправлен в блокчейн за ${result.executionTime.toFixed(2)}ms!`);
      } else {
        console.error('❌ Ошибка отправки прыжка:', result.error);
      }
    } catch (error) {
      console.error('❌ Критическая ошибка при отправке прыжка:', error);
    }
  };

  // Fallback для старой системы (если новая не готова)
  const handleOnChainMovementFallback = async () => {
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
        game.scaleRatio,
        selectedNetwork && !selectedNetwork.isWeb2 ? handleOnChainMovement : null
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
      return game.carrotController.collideWith(game.player);
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

        // Blockchain движения обрабатываются в Player.js при прыжках
        // Здесь мы не вызываем handleOnChainMovement автоматически
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
        {/* Blockchain Status Display */}
        {selectedNetwork && !selectedNetwork.isWeb2 && (
          <div className="blockchain-status">
            <div className="status-header">
              <span className={`status-indicator ${isSystemReady ? 'ready' : 'not-ready'}`}>
                {isSystemReady ? '🚀' : '⏳'}
              </span>
              <span className="network-name">{blockchainStatus.networkName}</span>
            </div>
            
            {isSystemReady && (
              <div className="blockchain-stats">
                <div className="stat-item">
                  <span className="stat-label">Прыжков:</span>
                  <span className="stat-value">{blockchainStatus.totalMovements}</span>
                </div>
                
                {blockchainStatus.lastTransactionTime && (
                  <div className="stat-item">
                    <span className="stat-label">Последний прыжок:</span>
                    <span className="stat-value">{blockchainStatus.lastTransactionTime.toFixed(2)}ms</span>
                  </div>
                )}
                
                {realtimeStats.averageTimeThisSession > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">Среднее время:</span>
                    <span className="stat-value">{realtimeStats.averageTimeThisSession.toFixed(2)}ms</span>
                  </div>
                )}
                
                <div className="stat-item">
                  <span className="stat-label">Счетчик контракта:</span>
                  <span className="stat-value">{contractState.currentNumber || 0}</span>
                </div>
              </div>
            )}
            
            {!isSystemReady && (
              <div className="status-message">
                Инициализация blockchain системы...
              </div>
            )}
          </div>
        )}
      </div>
      
      <style jsx>{`
        .game-canvas-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .game-ui-overlay {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 10;
        }
        
        .blockchain-status {
          background: rgba(0, 0, 0, 0.8);
          border: 2px solid #1391ff;
          border-radius: 8px;
          padding: 12px;
          min-width: 200px;
          font-family: 'Courier New', monospace;
          color: white;
          font-size: 12px;
        }
        
        .status-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-weight: bold;
        }
        
        .status-indicator.ready {
          color: #4ade80;
        }
        
        .status-indicator.not-ready {
          color: #fbbf24;
        }
        
        .network-name {
          color: #1391ff;
        }
        
        .blockchain-stats {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .stat-label {
          color: #929397;
        }
        
        .stat-value {
          color: #4ade80;
          font-weight: bold;
        }
        
        .status-message {
          color: #fbbf24;
          font-style: italic;
          text-align: center;
        }
        
        @media (max-width: 768px) {
          .game-ui-overlay {
            top: 10px;
            right: 10px;
          }
          
          .blockchain-status {
            font-size: 10px;
            padding: 8px;
            min-width: 150px;
          }
        }
      `}</style>
    </div>
  );
};

export default GameComponent;