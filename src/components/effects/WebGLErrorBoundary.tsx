import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

export class WebGLErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("WebGL SceneCanvas encountered an error and degraded gracefully:", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div className="fixed inset-0 bg-[#101210] pointer-events-none z-0" />;
    }
    return this.props.children;
  }
}
