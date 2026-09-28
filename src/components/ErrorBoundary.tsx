import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleNavigateHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#EAEAEA] text-[#2B2A28] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFFFF] border border-[#D5D4D4] rounded-2xl p-6 shadow-md text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F4FA] text-[#008DD2] border border-[#59B5E2] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-[#008DD2]" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-[#2B2A28]">
                {this.props.fallbackTitle || "Something went wrong"}
              </h2>
              <p className="text-xs text-[#757573] mt-1">
                {this.props.fallbackMessage ||
                  "An unexpected display issue occurred. You can reload this view or return home."}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[#EAEAEA] rounded-xl text-left font-mono text-[11px] text-[#403F3E] overflow-x-auto max-h-32 border border-[#D5D4D4]">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#008DD2] hover:bg-[#0078B2] active:bg-[#006393] text-[#FFFFFF] flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleNavigateHome}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E6F4FA] hover:bg-[#CCE8F6] text-[#006393] border border-[#59B5E2] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
