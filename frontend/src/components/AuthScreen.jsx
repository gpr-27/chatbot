import { useState } from "react";
import { ArrowRight, Gauge, Shield, UserRound, Zap } from "lucide-react";
import { SignInButton, SignUpButton } from "@clerk/react";
import { useAppAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import BrandSpark from "./BrandSpark";
import ThemeToggle from "./ThemeToggle";
import "./AuthScreen.css";

const FEATURES = [
  { icon: Zap, title: "LPU-fast streaming", text: "Replies stream in token-by-token, instantly." },
  { icon: Gauge, title: "Multiple models", text: "Switch between configured models on the fly." },
  { icon: Shield, title: "Private & secure", text: "Your chats stay yours." },
];

export default function AuthScreen() {
  const { continueAsGuest } = useAppAuth();
  const { error: toastError } = useToast();
  const [guestLoading, setGuestLoading] = useState(false);

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await continueAsGuest();
    } catch {
      toastError("Couldn't start a guest session. Please try again.");
      setGuestLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__mesh" aria-hidden="true">
        <span className="blob blob--1" />
        <span className="blob blob--2" />
        <span className="blob blob--3" />
      </div>

      <div className="auth__toggle-theme">
        <ThemeToggle />
      </div>

      {/* Brand / marketing panel */}
      <aside className="auth__brand">
        <div className="auth__brand-top">
          <BrandSpark size={40} glow />
          <span className="auth__brand-name">
            Groq<span className="grad-text">bot</span>
          </span>
        </div>

        <div className="auth__brand-hero">
          <div className="auth__pill">
            <Zap size={13} /> The world's fastest inference
          </div>
          <h1>
            Chat at the speed of <span className="grad-text">thought.</span>
          </h1>
          <p>
            A premium AI assistant running on Groq's LPU engine. Ask anything and
            watch answers arrive the instant you hit enter.
          </p>
        </div>

        <ul className="auth__features">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <span className="auth__feat-icon">
                <f.icon size={17} />
              </span>
              <span>
                <strong>{f.title}</strong>
                {f.text}
              </span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Form panel */}
      <main className="auth__panel">
        <div className="auth__card">
          <div className="auth__card-mark">
            <BrandSpark size={34} glow />
          </div>
          <h2 className="auth__card-title">Welcome back</h2>
          <p className="auth__card-sub">Log in, or jump straight in as a guest.</p>

          <div className="auth__form">
            <SignInButton mode="modal">
              <button className="auth__submit" disabled={guestLoading}>
                Log in <ArrowRight size={17} />
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button type="button" className="auth__switch" disabled={guestLoading}>
                Create an account
              </button>
            </SignUpButton>

            <div className="auth__divider" aria-hidden="true">
              <span>or</span>
            </div>

            <button
              type="button"
              className="auth__guest"
              onClick={handleGuest}
              disabled={guestLoading}
            >
              {guestLoading ? (
                <span className="spinner spinner--ghost" />
              ) : (
                <>
                  <UserRound size={17} /> Continue as guest
                </>
              )}
            </button>
            <p className="auth__guest-note">
              No account needed — your chats are saved, and you can create an
              account later to keep them permanently.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
