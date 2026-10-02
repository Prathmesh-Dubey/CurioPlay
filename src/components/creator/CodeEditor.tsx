import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { AlertCircle, FileCode2 } from 'lucide-react';
import { Kbd } from '@/components/ui/Overlay';
import { cn } from '@/lib/utils';

/** Must match the textarea's line-height and padding exactly so the gutter stays aligned. */
const LINE_H = 20;
const PAD_Y = 16;
const INDENT = '  ';

function countLines(text: string) {
  let n = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function caretOf(text: string, pos: number) {
  let line = 1;
  let lastNl = -1;
  for (let i = 0; i < pos; i++) {
    if (text.charCodeAt(i) === 10) {
      line++;
      lastNl = i;
    }
  }
  return { line, col: pos - lastNl };
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  fileName: string;
  /** Small status chip next to the file name. */
  status?: ReactNode;
  /** Right side of the toolbar (template menu…). */
  toolbarEnd?: ReactNode;
  /** Rendered over the empty editor (pointer-events pass through except on its buttons). */
  emptyState?: ReactNode;
  error?: string;
  className?: string;
}

/**
 * Dependency-free code editor: a plain textarea on a night surface with a line-number gutter and
 * current-line band that follow the textarea's scroll via direct transforms (no re-render per
 * scroll). Tab / Shift+Tab indent and outdent (multi-line aware), Enter keeps indentation, and
 * Esc then Tab leaves the editor so keyboard users are never trapped. Edits go through
 * `execCommand('insertText')` where available so the browser's undo stack keeps working.
 */
export const CodeEditor = forwardRef<HTMLTextAreaElement, CodeEditorProps>(function CodeEditor(
  { value, onChange, fileName, status, toolbarEnd, emptyState, error, className },
  ref,
) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const escapeTab = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [caret, setCaret] = useState({ line: 1, col: 1 });
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => taRef.current as HTMLTextAreaElement);

  const lineCount = useMemo(() => countLines(value), [value]);
  const numbers = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1).join('\n'), [lineCount]);
  const gutterCh = Math.max(2, String(lineCount).length) + 3;

  const syncScroll = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const t = `translate3d(0, ${-ta.scrollTop}px, 0)`;
    if (gutterRef.current) gutterRef.current.style.transform = t;
    if (bandRef.current) bandRef.current.style.transform = t;
  }, []);

  const updateCaret = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const next = caretOf(ta.value, ta.selectionStart);
    setCaret((c) => (c.line === next.line && c.col === next.col ? c : next));
  }, []);

  // Programmatic value swaps (templates, loading an item) can move scroll without a scroll event.
  useLayoutEffect(() => {
    syncScroll();
    updateCaret();
  }, [value, syncScroll, updateCaret]);

  /** Replace the current selection with `text`, preserving native undo when possible. */
  const insertText = (ta: HTMLTextAreaElement, text: string) => {
    let ok = false;
    try {
      ok =typeof document.execCommand === 'function' && document.execCommand('insertText', false, text);
    } catch {
      ok = false;
    }
    if (!ok) {
      const { selectionStart: s, selectionEnd: e, value: v } = ta;
      onChangeRef.current(v.slice(0, s) + text + v.slice(e));
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = s + text.length;
      });
    }
  };

  const indentLines = (ta: HTMLTextAreaElement, outdent: boolean) => {
    const { selectionStart: s, selectionEnd: e, value: v } = ta;
    const multi = v.slice(s, e).includes('\n');
    if (!outdent && !multi) {
      insertText(ta, INDENT);
      return;
    }
    const lineStart = v.lastIndexOf('\n', s - 1) + 1;
    const endAdj = e > s && v[e - 1] === '\n' ? e - 1 : e;
    let lineEnd = v.indexOf('\n', endAdj);
    if (lineEnd === -1) lineEnd = v.length;
    const block = v.slice(lineStart, lineEnd);
    let firstDelta = 0;
    const replaced = block
      .split('\n')
      .map((ln, i) => {
        if (outdent) {
          const cut = /^( {1,2}|\t)/.exec(ln)?.[0].length ?? 0;
          if (i === 0) firstDelta = -cut;
          return ln.slice(cut);
        }
        if (i === 0) firstDelta = INDENT.length;
        return INDENT + ln;
      })
      .join('\n');
    if (replaced === block) return;
    ta.setSelectionRange(lineStart, lineEnd);
    insertText(ta, replaced);
    requestAnimationFrame(() => {
      if (multi) ta.setSelectionRange(lineStart, lineStart + replaced.length);
      else ta.selectionStart = ta.selectionEnd = Math.max(lineStart, s + firstDelta);
      updateCaret();
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    const ta = e.currentTarget;
    if (e.key === 'Escape') {
      escapeTab.current = true;
      return;
    }
    if (e.key === 'Tab') {
      if (escapeTab.current || e.metaKey || e.ctrlKey || e.altKey) {
        escapeTab.current = false;
        return; // let focus move on
      }
      e.preventDefault();
      indentLines(ta, e.shiftKey);
      return;
    }
    escapeTab.current = false;
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      const { selectionStart: s, value: v } = ta;
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const lead = /^[ \t]*/.exec(v.slice(lineStart, s))?.[0] ?? '';
      const prev = v[s - 1];
      const extra = prev === '{' || prev === '(' || prev === '[' ? INDENT : '';
      if (lead || extra) {
        e.preventDefault();
        insertText(ta, `\n${lead}${extra}`);
      }
    }
  };

  const errorId = 'creator-code-error';

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-[24px] border bg-navy text-white shadow-card transition-[border-color,box-shadow] duration-300',
        error ? 'border-red-500/70' : focused ? 'border-night-sage/40 shadow-float' : 'border-white/10',
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-white/10 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex shrink-0 gap-1" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-night-gold/70" />
          </span>
          <FileCode2 className="ml-1 size-4 shrink-0 text-night-sage" aria-hidden="true" />
          <span className="truncate font-mono text-[13px] text-white/85">{fileName}</span>
          {status}
        </div>
        {toolbarEnd}
      </div>

      {/* Code area */}
      <div className="relative flex min-h-0 flex-1 font-mono text-[13px]">
        <div
          aria-hidden="true"
          className="relative shrink-0 select-none overflow-hidden border-r border-white/10 bg-white/[0.03] text-right text-white/30"
          style={{ width: `${gutterCh}ch` }}
        >
          <div ref={gutterRef} className="relative will-change-transform">
            <span
              className="absolute inset-x-0 pr-3 text-night-sage"
              style={{ top: PAD_Y + (caret.line - 1) * LINE_H, height: LINE_H, lineHeight: `${LINE_H}px` }}
            >
              {focused ? caret.line : ''}
            </span>
            <pre className="m-0 font-mono" style={{ padding: `${PAD_Y}px 12px ${PAD_Y + 24}px 0`, lineHeight: `${LINE_H}px` }}>
              {numbers}
            </pre>
          </div>
        </div>

        <div className="relative min-w-0 flex-1">
          {/* current-line band, behind the transparent textarea */}
          <div ref={bandRef} aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 will-change-transform">
            {focused && (
              <div className="absolute inset-x-0 bg-white/[0.045]" style={{ top: PAD_Y + (caret.line - 1) * LINE_H, height: LINE_H }} />
            )}
          </div>

          <textarea
            ref={taRef}
            aria-label="Component source code"
            aria-invalid={!!error || undefined}
            aria-describedby={error ? errorId : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={onKeyDown}
            onSelect={updateCaret}
            onFocus={() => {
              setFocused(true);
              updateCaret();
            }}
            onBlur={() => {
              setFocused(false);
              escapeTab.current = false;
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            wrap="off"
            placeholder="// Paste your React TSX component code here..."
            className="absolute inset-0 size-full resize-none whitespace-pre bg-transparent px-4 text-white/90 caret-night-sage outline-none placeholder:text-white/30 focus-visible:shadow-none"
            style={{ lineHeight: `${LINE_H}px`, paddingTop: PAD_Y, paddingBottom: PAD_Y, tabSize: 2 }}
          />

          {!value && emptyState && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
              <div className="[&_a]:pointer-events-auto [&_button]:pointer-events-auto">{emptyState}</div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p id={errorId} role="alert" className="flex items-center gap-2 border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300">
          <AlertCircle className="size-3.5 shrink-0" /> {error}
        </p>
      )}

      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/10 px-4 py-2 font-mono text-[11px] text-white/50">
        <span className="flex items-center gap-3 tabular-nums" aria-live="off">
          <span>
            Ln {caret.line}, Col {caret.col}
          </span>
          <span className="h-3 w-px bg-white/15" aria-hidden="true" />
          <span>
            {lineCount.toLocaleString()} {lineCount === 1 ? 'line' : 'lines'}
          </span>
          <span className="h-3 w-px bg-white/15" aria-hidden="true" />
          <span>{value.length.toLocaleString()} chars</span>
        </span>
        <span className="hidden items-center gap-1.5 md:flex">
          <Kbd className="border-white/15 bg-white/10 text-white/70">Tab</Kbd> indent
          <span className="mx-1.5 text-white/20">·</span>
          <Kbd className="border-white/15 bg-white/10 text-white/70">Esc</Kbd>
          <Kbd className="border-white/15 bg-white/10 text-white/70">Tab</Kbd> leave editor
        </span>
      </div>
    </div>
  );
});
