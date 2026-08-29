import { Component } from 'react';

// Class component: React only supports error boundaries as classes.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="placeholder-page">
          <h1>Something went wrong</h1>
          <p>An unexpected error occurred. Try refreshing the page.</p>
          <button type="button" className="error-refresh" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
