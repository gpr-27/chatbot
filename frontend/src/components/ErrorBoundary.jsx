import { Component } from "react";
import { RefreshCw } from "lucide-react";
import BrandSpark from "./BrandSpark";

// Catches render errors (e.g. malformed model markdown) so the whole app
// never white-screens. Offers a one-click recovery.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Render error caught by ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="crash">
          <BrandSpark size={48} glow />
          <h1>Something broke on screen</h1>
          <p>An unexpected error occurred while rendering. Your chats are safe.</p>
          <button className="btn btn--primary" onClick={() => window.location.reload()}>
            <RefreshCw size={16} />
            Reload Groqbot
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
