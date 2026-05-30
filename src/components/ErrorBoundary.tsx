import React, { Component, ErrorInfo, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackLabel: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Feature error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          <p className="font-black mb-2">{this.props.fallbackLabel}</p>
          <p className="text-xs text-red-600">An issue occurred while loading this tool. Please refresh or try another workflow.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
