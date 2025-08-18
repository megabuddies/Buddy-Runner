import React, { useState, useEffect } from 'react';
import transactionOptimizationService from '../services/transactionOptimizationService';
import './TransactionPerformanceMonitor.css';

const TransactionPerformanceMonitor = ({ chainId, isVisible = true }) => {
  const [performanceStats, setPerformanceStats] = useState({
    averageBlockchainTime: 0,
    successRate: 0,
    totalTransactions: 0,
    performanceGrade: '🚀 INSTANT',
    poolStatus: { status: 'not_initialized', message: 'Pool not initialized' }
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    if (!chainId || !isVisible) return;

    const updateStats = () => {
      try {
        const stats = transactionOptimizationService.getPerformanceStats(chainId);
        const poolStatus = transactionOptimizationService.getPoolStatus(chainId);
        
        setPerformanceStats({
          ...stats,
          poolStatus
        });
        setLastUpdate(Date.now());
      } catch (error) {
        console.error('Error updating performance stats:', error);
      }
    };

    // Обновляем каждые 2 секунды
    const interval = setInterval(updateStats, 2000);
    
    // Первоначальное обновление
    updateStats();

    return () => clearInterval(interval);
  }, [chainId, isVisible]);

  if (!isVisible || !chainId) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return '#4CAF50';
      case 'low': return '#FF9800';
      case 'critical': return '#F44336';
      case 'exhausted': return '#9C27B0';
      case 'initializing': return '#2196F3';
      default: return '#757575';
    }
  };

  const getPerformanceColor = (grade) => {
    if (grade.includes('INSTANT')) return '#4CAF50';
    if (grade.includes('FAST')) return '#8BC34A';
    if (grade.includes('GOOD')) return '#FF9800';
    return '#F44336';
  };

  return (
    <div className={`performance-monitor ${isExpanded ? 'expanded' : 'compact'}`}>
      <div 
        className="performance-header" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="performance-title">
          <span className="performance-icon">📊</span>
          <span>TX Performance</span>
          <span className="chain-indicator">Chain {chainId}</span>
        </div>
        
        <div className="performance-summary">
          <div className="metric-compact">
            <span 
              className="performance-grade"
              style={{ color: getPerformanceColor(performanceStats.performanceGrade) }}
            >
              {performanceStats.performanceGrade}
            </span>
            <span className="performance-time">
              {performanceStats.averageBlockchainTime}ms
            </span>
          </div>
          
          <div 
            className="pool-status-indicator"
            style={{ backgroundColor: getStatusColor(performanceStats.poolStatus.status) }}
            title={performanceStats.poolStatus.message}
          />
          
          <span className="expand-arrow">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="performance-details">
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Avg Blockchain Time</div>
              <div className="metric-value">
                <span 
                  className="metric-number"
                  style={{ color: getPerformanceColor(performanceStats.performanceGrade) }}
                >
                  {performanceStats.averageBlockchainTime}
                </span>
                <span className="metric-unit">ms</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Success Rate</div>
              <div className="metric-value">
                <span 
                  className="metric-number"
                  style={{ color: performanceStats.successRate >= 95 ? '#4CAF50' : '#F44336' }}
                >
                  {performanceStats.successRate}
                </span>
                <span className="metric-unit">%</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Total Transactions</div>
              <div className="metric-value">
                <span className="metric-number">
                  {performanceStats.totalTransactions}
                </span>
                <span className="metric-unit">tx</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Pool Status</div>
              <div className="metric-value">
                <span 
                  className="pool-status-text"
                  style={{ color: getStatusColor(performanceStats.poolStatus.status) }}
                >
                  {performanceStats.poolStatus.status?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {performanceStats.poolStatus.status !== 'not_initialized' && (
            <div className="pool-details">
              <div className="pool-info">
                <div className="pool-message">
                  {performanceStats.poolStatus.message}
                </div>
                
                {performanceStats.poolStatus.utilization !== undefined && (
                  <div className="pool-utilization">
                    <div className="utilization-label">Pool Utilization</div>
                    <div className="utilization-bar">
                      <div 
                        className="utilization-fill"
                        style={{ 
                          width: `${performanceStats.poolStatus.utilization}%`,
                          backgroundColor: getStatusColor(performanceStats.poolStatus.status)
                        }}
                      />
                    </div>
                    <div className="utilization-text">
                      {performanceStats.poolStatus.utilization}%
                    </div>
                  </div>
                )}

                {performanceStats.poolStatus.refilling && (
                  <div className="refill-indicator">
                    <span className="refill-icon">🔄</span>
                    <span>Refilling pool in background...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="performance-footer">
            <span className="last-update">
              Updated {Math.round((Date.now() - lastUpdate) / 1000)}s ago
            </span>
            
            <button 
              className="debug-button"
              onClick={() => {
                const report = transactionOptimizationService.generateOptimizationReport(chainId);
                console.log('🔧 Optimization Report:', report);
                alert('Optimization report logged to console');
              }}
              title="Generate optimization report"
            >
              🔧 Debug
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionPerformanceMonitor;