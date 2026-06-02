import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

// Recursively extract the raw text from a React node tree. rehype-highlight
// turns code into nested <span> elements, so String(children) would yield
// "[object Object]" — this walks the tree to recover the real source.
function nodeText(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (node.props && node.props.children != null) return nodeText(node.props.children);
  return "";
}

function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const lang = /language-(\w+)/.exec(className || "")?.[1] || "text";
  const code = nodeText(children).replace(/\n$/, "");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="code-block">
      <div className="code-block__bar">
        <span className="code-block__lang">{lang}</span>
        <button
          className={`code-block__copy ${copied ? "copied" : ""}`}
          onClick={copy}
          aria-label="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

const components = {
  // react-markdown passes block code through <pre><code>; we intercept <pre>.
  pre({ children }) {
    // children is the <code> element rendered by rehype-highlight
    const codeEl = Array.isArray(children) ? children[0] : children;
    const props = codeEl?.props || {};
    return <CodeBlock className={props.className}>{props.children}</CodeBlock>;
  },
  a({ children, href }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
};

function Markdown({ children }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
