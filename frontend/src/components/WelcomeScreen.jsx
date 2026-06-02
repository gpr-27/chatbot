import { Code2, Lightbulb, PenLine, Sparkles, Zap } from "lucide-react";
import BrandSpark from "./BrandSpark";

const SUGGESTIONS = [
  {
    icon: Code2,
    title: "Write code",
    prompt: "Write a Python function that returns the nth Fibonacci number, with memoization.",
  },
  {
    icon: Lightbulb,
    title: "Explain a concept",
    prompt: "Explain how transformer attention works, like I'm a curious beginner.",
  },
  {
    icon: PenLine,
    title: "Draft something",
    prompt: "Draft a friendly but concise out-of-office email for a one-week vacation.",
  },
  {
    icon: Sparkles,
    title: "Brainstorm ideas",
    prompt: "Give me 5 creative weekend project ideas for a full-stack developer.",
  },
];

export default function WelcomeScreen({ userName, onPick, modelName }) {
  const firstName = (userName || "").trim().split(/\s+/)[0] || "there";

  return (
    <div className="welcome">
      <div className="welcome__halo" aria-hidden="true" />
      <div className="welcome__inner">
        <div className="welcome__mark">
          <BrandSpark size={56} glow />
        </div>

        <div className="welcome__badge">
          <Zap size={13} />
          Powered by Groq{modelName ? ` · ${modelName}` : ""}
        </div>

        <h1 className="welcome__title">
          Hey {firstName}, what should we <span className="grad-text">build</span> today?
        </h1>
        <p className="welcome__sub">
          Ask anything — answers stream in at LPU speed. Pick a starter or just start typing.
        </p>

        <div className="welcome__grid">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.title}
              className="suggestion"
              onClick={() => onPick(s.prompt)}
              style={{ animationDelay: `${SUGGESTIONS.indexOf(s) * 60 + 120}ms` }}
            >
              <span className="suggestion__icon">
                <s.icon size={18} />
              </span>
              <span className="suggestion__text">
                <span className="suggestion__title">{s.title}</span>
                <span className="suggestion__prompt">{s.prompt}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
