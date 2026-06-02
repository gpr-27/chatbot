import { useAppAuth } from "./context/AuthContext";
import AuthScreen from "./components/AuthScreen";
import ChatApp from "./components/ChatApp";
import BrandSpark from "./components/BrandSpark";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const { ready, isAuthed } = useAppAuth();

  if (!ready) {
    return (
      <div className="boot-screen">
        <div className="boot-mark">
          <BrandSpark size={52} />
        </div>
        <div className="boot-bar">
          <span />
        </div>
        <p className="boot-text">Warming up the LPU…</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>{isAuthed ? <ChatApp /> : <AuthScreen />}</ErrorBoundary>
  );
}
