import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="error-banner" style={{ margin: 24, padding: 24 }}>
            <strong>Something went wrong</strong>
            <p style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}>
              {this.state.error?.message}
            </p>
            <button
              className="btn btn-sm"
              style={{ marginTop: 12 }}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try Again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
