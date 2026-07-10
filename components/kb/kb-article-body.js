import { cn } from "@/lib/utils";

/**
 * Renders markdown-ish or rich-text HTML article bodies.
 * @param {{ bodyMd: string; className?: string }} props
 */
export function KbArticleBody({ bodyMd, className }) {
  if (!bodyMd?.trim()) {
    return <p className="font-sans text-[13px] text-fg-muted">Ingen brødtekst endnu.</p>;
  }

  if (looksLikeHtml(bodyMd)) {
    return (
      <div
        className={cn("kb-article-content task-comment-body font-sans text-[14px] leading-relaxed text-fg-muted", className)}
        dangerouslySetInnerHTML={{ __html: bodyMd }}
      />
    );
  }

  const blocks = parseKbMarkdown(bodyMd);

  return (
    <div className={cn("font-sans text-[13px] leading-relaxed text-fg-muted", className)}>
      {blocks.map((b, i) => {
        if (b.type === "h2") {
          return (
            <h2
              key={i}
              className="mt-8 border-b border-border-soft pb-2 font-sans text-[15px] font-semibold tracking-tight text-fg first:mt-0"
            >
              {renderInline(b.text)}
            </h2>
          );
        }
        if (b.type === "h3") {
          return (
            <h3 key={i} className="mt-5 font-sans text-[13px] font-semibold text-fg">
              {renderInline(b.text)}
            </h3>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="my-3 list-disc space-y-1.5 pl-5 text-[13px] text-fg-muted">
              {b.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="my-3 text-[13px] leading-relaxed text-fg-muted">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

/** @param {string} text */
function looksLikeHtml(text) {
  return /<(?:p|div|h[1-6]|ul|ol|li|br|strong|em|b|i|u)\b/i.test(text);
}

/** @param {string} text */
function renderInline(text) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="rounded border border-border-soft bg-surface-muted px-1 py-0.5 text-[11px] text-fg"
        >
          {inner}
        </code>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

/** @param {string} md */
function parseKbMarkdown(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  /** @type {{ type: 'h2'|'h3'|'p'|'ul'; text?: string; items?: string[] }[]} */
  const blocks = [];
  /** @type {string[]} */
  let para = [];
  /** @type {string[]} */
  let listItems = [];

  const flushPara = () => {
    const t = para.join("\n").trim();
    if (t) blocks.push({ type: "p", text: t });
    para = [];
  };
  const flushList = () => {
    if (listItems.length) blocks.push({ type: "ul", items: [...listItems] });
    listItems = [];
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushList();
      flushPara();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      flushPara();
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      continue;
    }
    if (/^-\s+/.test(line)) {
      flushPara();
      listItems.push(line.replace(/^-\s+/, "").trim());
      continue;
    }
    if (line.trim() === "") {
      flushList();
      flushPara();
      continue;
    }
    flushList();
    para.push(line);
  }
  flushList();
  flushPara();
  return blocks;
}
