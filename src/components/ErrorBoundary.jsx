import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          background: '#1a1a2e',
          color: '#fff',
          border: '1px solid #ef5435',
          borderRadius: '5px',
          fontFamily: 'monospace'
        }}>
          <h2>🚨 Game Error</h2>
          <p>Something went wrong with the game:</p>
          <pre style={{ color: '#ef5435', fontSize: '12px' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: '#7FBC7F',
              color: '#000',
              border: 'none',
              padding: '10px',
              marginTop: '10px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;