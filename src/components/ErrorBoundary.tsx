import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error'
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('UI crash captured by ErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-200 p-6 flex items-center justify-center">
          <div className="max-w-xl w-full bg-gray-800 border border-red-500 rounded-lg p-6">
            <h1 className="text-xl font-bold text-red-400 mb-2">The app hit an error.</h1>
            <p className="text-sm text-gray-300 mb-3">Reload the page and try the match again.</p>
            <p className="text-xs text-orange-300 font-mono break-words">{this.state.message}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
