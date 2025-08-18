import React, { useState, useEffect } from 'react';
import blockchainOptimizationIntegration from '../services/blockchainOptimizationIntegration';
import transactionOptimizationService from '../services/transactionOptimizationService';
import gasOptimizationService from '../services/gasOptimizationService';
import nonceOptimizationService from '../services/nonceOptimizationService';
import './OptimizationDashboard.css';

const OptimizationDashboard = ({ chainId, isVisible = false }) => {
  const [dashboardData, setDashboardData] = useState({
    status: { initialized: false },
    transactionPool: { status: 'not_initialized' },
    gasOptimization: { totalTransactions: 0 },
    nonceManagement: null,
    integratedMetrics: null
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    if (!chainId || !isVisible) return;

    const updateDashboard = () => {
      try {
        const status = blockchainOptimizationIntegration.getOptimizationStatus(chainId);
        const poolStatus = transactionOptimizationService.getPoolStatus(chainId);
        const gasStats = gasOptimizationService.getPerformanceStats(chainId);
        
        // Получаем первый доступный nonce manager для этой сети
        let nonceStatus = null;
        for (const [key, manager] of nonceOptimizationService.nonceManagers.entries()) {
          if (key.startsWith(`${chainId}-`)) {
            nonceStatus = nonceOptimizationService.getNonceStatus(chainId, manager.address);
            break;
          }
        }

        setDashboardData({
          status,
          transactionPool: poolStatus,
          gasOptimization: gasStats,
          nonceManagement: nonceStatus,
          integratedMetrics: status.performance
        });
        
        setLastUpdate(Date.now());
      } catch (error) {
        console.error('Error updating optimization dashboard:', error);
      }
    };

    // Первоначальное обновление
    updateDashboard();

    // Автоматическое обновление
    let interval;
    if (autoRefresh) {
      interval = setInterval(updateDashboard, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [chainId, isVisible, autoRefresh]);

  if (!isVisible || !chainId) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': case 'initialized': case true: return '#4CAF50';
      case 'low': case 'warning': return '#FF9800';
      case 'critical': case 'error': case false: return '#F44336';
      case 'exhausted': return '#9C27B0';
      case 'initializing': return '#2196F3';
      default: return '#757575';
    }
  };

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const renderOverview = () => (
    <div className="dashboard-overview">
      <div className="overview-grid">
        <div className="overview-card">
          <div className="card-header">
            <h3>🚀 System Status</h3>
            <div 
              className="status-indicator"
              style={{ backgroundColor: getStatusColor(dashboardData.status.initialized) }}
            />
          </div>
          <div className="card-content">
            <div className="metric-row">
              <span>Initialized:</span>
              <span className={dashboardData.status.initialized ? 'success' : 'error'}>
                {dashboardData.status.initialized ? 'YES' : 'NO'}
              </span>
            </div>
            {dashboardData.integratedMetrics && (
              <>
                <div className="metric-row">
                  <span>Total Transactions:</span>
                  <span>{dashboardData.integratedMetrics.totalTransactions}</span>
                </div>
                <div className="metric-row">
                  <span>Success Rate:</span>
                  <span style={{ color: getStatusColor(parseFloat(dashboardData.integratedMetrics.successRate) >= 95) }}>
                    {dashboardData.integratedMetrics.successRate}%
                  </span>
                </div>
                <div className="metric-row">
                  <span>Avg Time:</span>
                  <span>{dashboardData.integratedMetrics.averageBlockchainTime}ms</span>
                </div>
                <div className="metric-row">
                  <span>Uptime:</span>
                  <span>{formatUptime(dashboardData.integratedMetrics.uptime)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <h3>🎯 Transaction Pool</h3>
            <div 
              className="status-indicator"
              style={{ backgroundColor: getStatusColor(dashboardData.transactionPool.status) }}
            />
          </div>
          <div className="card-content">
            <div className="metric-row">
              <span>Status:</span>
              <span 
                className="status-text"
                style={{ color: getStatusColor(dashboardData.transactionPool.status) }}
              >
                {dashboardData.transactionPool.status?.toUpperCase()}
              </span>
            </div>
            {dashboardData.transactionPool.utilization !== undefined && (
              <>
                <div className="metric-row">
                  <span>Utilization:</span>
                  <span>{dashboardData.transactionPool.utilization}%</span>
                </div>
                <div className="utilization-bar">
                  <div 
                    className="utilization-fill"
                    style={{ 
                      width: `${dashboardData.transactionPool.utilization}%`,
                      backgroundColor: getStatusColor(dashboardData.transactionPool.status)
                    }}
                  />
                </div>
              </>
            )}
            {dashboardData.transactionPool.refilling && (
              <div className="refill-status">
                <span className="refill-icon">🔄</span>
                <span>Refilling...</span>
              </div>
            )}
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <h3>⛽ Gas Optimization</h3>
            <div 
              className="status-indicator"
              style={{ backgroundColor: getStatusColor(dashboardData.gasOptimization.totalTransactions > 0) }}
            />
          </div>
          <div className="card-content">
            <div className="metric-row">
              <span>Total TX:</span>
              <span>{dashboardData.gasOptimization.totalTransactions}</span>
            </div>
            <div className="metric-row">
              <span>Success Rate:</span>
              <span>{dashboardData.gasOptimization.successRate}%</span>
            </div>
            <div className="metric-row">
              <span>Avg Gas Used:</span>
              <span>{dashboardData.gasOptimization.averageGasUsed}</span>
            </div>
            <div className="metric-row">
              <span>Cache Hit Rate:</span>
              <span>{dashboardData.gasOptimization.cacheHitRate}%</span>
            </div>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-header">
            <h3>🎲 Nonce Management</h3>
            <div 
              className="status-indicator"
              style={{ backgroundColor: getStatusColor(dashboardData.nonceManagement?.initialized) }}
            />
          </div>
          <div className="card-content">
            {dashboardData.nonceManagement ? (
              <>
                <div className="metric-row">
                  <span>Current Nonce:</span>
                  <span>{dashboardData.nonceManagement.currentNonce}</span>
                </div>
                <div className="metric-row">
                  <span>Pending:</span>
                  <span>{dashboardData.nonceManagement.pendingCount}</span>
                </div>
                <div className="metric-row">
                  <span>Reserved:</span>
                  <span>{dashboardData.nonceManagement.reservedCount}</span>
                </div>
                <div className="metric-row">
                  <span>Efficiency:</span>
                  <span>{dashboardData.nonceManagement.efficiency}%</span>
                </div>
                <div className="metric-row">
                  <span>Strategy:</span>
                  <span className="strategy-badge">{dashboardData.nonceManagement.strategy}</span>
                </div>
              </>
            ) : (
              <div className="no-data">No nonce manager active</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactionPool = () => (
    <div className="dashboard-pool">
      <div className="pool-detailed-info">
        <h3>🎯 Pre-signed Transaction Pool Details</h3>
        
        <div className="pool-status-section">
          <div className="status-header">
            <span>Status: </span>
            <span 
              className="status-badge"
              style={{ backgroundColor: getStatusColor(dashboardData.transactionPool.status) }}
            >
              {dashboardData.transactionPool.status?.toUpperCase()}
            </span>
          </div>
          
          <p className="status-message">{dashboardData.transactionPool.message}</p>
        </div>

        {dashboardData.transactionPool.utilization !== undefined && (
          <div className="pool-metrics">
            <div className="metric-large">
              <div className="metric-label">Pool Utilization</div>
              <div className="metric-value-large">{dashboardData.transactionPool.utilization}%</div>
              <div className="utilization-bar-large">
                <div 
                  className="utilization-fill-large"
                  style={{ 
                    width: `${dashboardData.transactionPool.utilization}%`,
                    backgroundColor: getStatusColor(dashboardData.transactionPool.status)
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="pool-actions">
          <button 
            className="action-button"
            onClick={() => {
              const report = transactionOptimizationService.generateOptimizationReport(chainId);
              console.log('🔧 Transaction Pool Report:', report);
              alert('Pool report logged to console');
            }}
          >
            📊 Generate Report
          </button>
          
          <button 
            className="action-button danger"
            onClick={() => {
              if (confirm('Clear transaction pool? This will reset all pre-signed transactions.')) {
                transactionOptimizationService.clearPool(chainId);
                alert('Transaction pool cleared');
              }
            }}
          >
            🗑️ Clear Pool
          </button>
        </div>
      </div>
    </div>
  );

  const renderGasOptimization = () => (
    <div className="dashboard-gas">
      <div className="gas-detailed-info">
        <h3>⛽ Gas Optimization Details</h3>
        
        <div className="gas-metrics-grid">
          <div className="gas-metric-card">
            <div className="metric-label">Total Transactions</div>
            <div className="metric-value">{dashboardData.gasOptimization.totalTransactions}</div>
          </div>
          
          <div className="gas-metric-card">
            <div className="metric-label">Success Rate</div>
            <div className="metric-value" style={{ color: getStatusColor(dashboardData.gasOptimization.successRate >= 95) }}>
              {dashboardData.gasOptimization.successRate}%
            </div>
          </div>
          
          <div className="gas-metric-card">
            <div className="metric-label">Average Gas Used</div>
            <div className="metric-value">{dashboardData.gasOptimization.averageGasUsed}</div>
          </div>
          
          <div className="gas-metric-card">
            <div className="metric-label">Average Time</div>
            <div className="metric-value">{dashboardData.gasOptimization.averageTime}ms</div>
          </div>
          
          <div className="gas-metric-card">
            <div className="metric-label">Cache Hit Rate</div>
            <div className="metric-value">{dashboardData.gasOptimization.cacheHitRate}%</div>
          </div>
        </div>

        <div className="gas-actions">
          <button 
            className="action-button"
            onClick={() => {
              const report = gasOptimizationService.generateDiagnosticReport();
              console.log('🔧 Gas Optimization Report:', report);
              alert('Gas optimization report logged to console');
            }}
          >
            📊 Generate Gas Report
          </button>
        </div>
      </div>
    </div>
  );

  const renderNonceManagement = () => (
    <div className="dashboard-nonce">
      <div className="nonce-detailed-info">
        <h3>🎲 Nonce Management Details</h3>
        
        {dashboardData.nonceManagement ? (
          <>
            <div className="nonce-status-grid">
              <div className="nonce-status-card">
                <div className="status-label">Initialized</div>
                <div className="status-value" style={{ color: getStatusColor(dashboardData.nonceManagement.initialized) }}>
                  {dashboardData.nonceManagement.initialized ? 'YES' : 'NO'}
                </div>
              </div>
              
              <div className="nonce-status-card">
                <div className="status-label">Current Nonce</div>
                <div className="status-value">{dashboardData.nonceManagement.currentNonce}</div>
              </div>
              
              <div className="nonce-status-card">
                <div className="status-label">Pending Nonce</div>
                <div className="status-value">{dashboardData.nonceManagement.pendingNonce}</div>
              </div>
              
              <div className="nonce-status-card">
                <div className="status-label">Reserved Count</div>
                <div className="status-value">{dashboardData.nonceManagement.reservedCount}</div>
              </div>
              
              <div className="nonce-status-card">
                <div className="status-label">Strategy</div>
                <div className="status-value">
                  <span className="strategy-badge">{dashboardData.nonceManagement.strategy}</span>
                </div>
              </div>
              
              <div className="nonce-status-card">
                <div className="status-label">Efficiency</div>
                <div className="status-value" style={{ color: getStatusColor(parseFloat(dashboardData.nonceManagement.efficiency) >= 80) }}>
                  {dashboardData.nonceManagement.efficiency}%
                </div>
              </div>
            </div>

            {dashboardData.nonceManagement.statistics && (
              <div className="nonce-statistics">
                <h4>📊 Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span>Total Allocations:</span>
                    <span>{dashboardData.nonceManagement.statistics.totalAllocations}</span>
                  </div>
                  <div className="stat-item">
                    <span>Successful Allocations:</span>
                    <span>{dashboardData.nonceManagement.statistics.successfulAllocations}</span>
                  </div>
                  <div className="stat-item">
                    <span>Success Rate:</span>
                    <span>{dashboardData.nonceManagement.statistics.successRate}%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="nonce-actions">
              <button 
                className="action-button"
                onClick={() => {
                  const report = nonceOptimizationService.generateDiagnosticReport();
                  console.log('🔧 Nonce Management Report:', report);
                  alert('Nonce management report logged to console');
                }}
              >
                📊 Generate Nonce Report
              </button>
            </div>
          </>
        ) : (
          <div className="no-nonce-data">
            <p>No nonce management data available.</p>
            <p>Nonce managers are created when transactions are initialized.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="optimization-dashboard">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>🚀 Blockchain Optimization Dashboard</h2>
          <div className="chain-info">Chain {chainId}</div>
        </div>
        
        <div className="dashboard-controls">
          <button 
            className={`refresh-toggle ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={`Auto-refresh ${autoRefresh ? 'enabled' : 'disabled'}`}
          >
            🔄
          </button>
          
          <div className="last-update">
            Updated {Math.round((Date.now() - lastUpdate) / 1000)}s ago
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'pool' ? 'active' : ''}`}
          onClick={() => setActiveTab('pool')}
        >
          🎯 Transaction Pool
        </button>
        <button 
          className={`tab-button ${activeTab === 'gas' ? 'active' : ''}`}
          onClick={() => setActiveTab('gas')}
        >
          ⛽ Gas Optimization
        </button>
        <button 
          className={`tab-button ${activeTab === 'nonce' ? 'active' : ''}`}
          onClick={() => setActiveTab('nonce')}
        >
          🎲 Nonce Management
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'pool' && renderTransactionPool()}
        {activeTab === 'gas' && renderGasOptimization()}
        {activeTab === 'nonce' && renderNonceManagement()}
      </div>

      <div className="dashboard-footer">
        <button 
          className="comprehensive-report-button"
          onClick={() => {
            const report = blockchainOptimizationIntegration.generateComprehensiveReport();
            console.log('🔧 Comprehensive Optimization Report:', report);
            alert('Comprehensive report logged to console');
          }}
        >
          📋 Generate Comprehensive Report
        </button>
      </div>
    </div>
  );
};

export default OptimizationDashboard;