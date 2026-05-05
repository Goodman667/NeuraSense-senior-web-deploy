import { Component, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
}

/**
 * Error Boundary for catching lazy-load / dynamic import failures.
 * When a chunk fails to load (e.g. rapid tab switching), this catches
 * the error and shows a retry button instead of white-screening.
 */
class LazyErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false };

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        // Only log non-chunk errors; chunk failures are expected during rapid navigation
        if (!error.message?.includes('dynamically imported module') &&
            !error.message?.includes('Loading chunk')) {
            console.error('LazyErrorBoundary caught:', error);
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-warm-100 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-warm-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </div>
                    <p className="text-warm-500 mb-4">页面加载失败</p>
                    <button
                        onClick={this.handleRetry}
                        className="px-6 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors"
                    >
                        重新加载
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default LazyErrorBoundary;
