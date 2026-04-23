import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline, Heading1, Heading2, Heading3,
  List, ListOrdered, Link, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface VariableDef {
  key: string;         // e.g. "{{client_name}}"
  label: string;       // e.g. "Nom client"
  description?: string; // e.g. "Sera remplacé par le prénom et nom du client"
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  variables?: VariableDef[];
}

export interface RichTextEditorHandle {
  insertVariable: (varKey: string) => void;
}

// ─── Chip helpers ──────────────────────────────────────────────────────────────

const CHIP_STYLE =
  "display:inline-flex;align-items:center;background:#dbeafe;color:#1d4ed8;" +
  "border:1px solid #bfdbfe;border-radius:4px;padding:1px 7px;font-size:11px;" +
  "font-weight:600;margin:0 2px;cursor:default;line-height:1.6;white-space:nowrap;";

function createChip(v: VariableDef): HTMLSpanElement {
  const span = document.createElement("span");
  span.contentEditable = "false";
  span.dataset.var = v.key;
  span.textContent = v.label;
  span.style.cssText = CHIP_STYLE;
  if (v.description) span.title = `${v.label} — ${v.description}`;
  return span;
}

/** Replace {{var}} placeholders with chip spans for display in the editor */
export function toDisplay(html: string, variables: VariableDef[]): string {
  let result = html;
  for (const v of variables) {
    const title = v.description ? ` title="${v.label} — ${v.description}"` : "";
    const chipHtml =
      `<span contenteditable="false" data-var="${v.key}" style="${CHIP_STYLE}"${title}>${v.label}</span>`;
    result = result.split(v.key).join(chipHtml);
  }
  return result;
}

/** Replace chip spans back to {{var}} placeholders for storage */
function toStorage(html: string): string {
  return html.replace(
    /<span[^>]*data-var="(\{\{[^"]+\}\})"[^>]*>(?:[^<]*)<\/span>/g,
    "$1",
  );
}

// ─── Toolbar button ────────────────────────────────────────────────────────────

function ToolBtn({ icon: Icon, label, onAction }: { icon: any; label: string; onAction: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      title={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onAction();
      }}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
function RichTextEditor({ value, onChange, className, variables = [] }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  // Sync external value → editor (convert {{var}} to chips)
  useEffect(() => {
    if (!editorRef.current || isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const displayed = toDisplay(value, variables);
    if (editorRef.current.innerHTML !== displayed) {
      editorRef.current.innerHTML = displayed;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(toStorage(editorRef.current.innerHTML));
    }
  }, [onChange]);

  const handleInput = useCallback(() => emit(), [emit]);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    emit();
  }, [emit]);

  const insertLink = useCallback(() => {
    const url = prompt("URL du lien :");
    if (url) exec("createLink", url);
  }, [exec]);

  // Expose insertVariable — inserts an uneditable chip at the cursor
  useImperativeHandle(ref, () => ({
    insertVariable: (varKey: string) => {
      const v = variables.find(v => v.key === varKey);
      if (!v) return;

      editorRef.current?.focus();
      const chip = createChip(v);

      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(chip);
        // Place cursor right after the chip
        range.setStartAfter(chip);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editorRef.current?.appendChild(chip);
      }

      emit();
    },
  }), [variables, emit]);

  return (
    <div className={cn("rounded-xl border border-input bg-background overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/50 px-2 py-1">
        <ToolBtn icon={Bold}        label="Gras"             onAction={() => exec("bold")} />
        <ToolBtn icon={Italic}      label="Italique"         onAction={() => exec("italic")} />
        <ToolBtn icon={Underline}   label="Souligné"         onAction={() => exec("underline")} />
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolBtn icon={Heading1}    label="Titre 1"          onAction={() => exec("formatBlock", "h1")} />
        <ToolBtn icon={Heading2}    label="Titre 2"          onAction={() => exec("formatBlock", "h2")} />
        <ToolBtn icon={Heading3}    label="Titre 3"          onAction={() => exec("formatBlock", "h3")} />
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolBtn icon={List}        label="Liste à puces"    onAction={() => exec("insertUnorderedList")} />
        <ToolBtn icon={ListOrdered} label="Liste numérotée"  onAction={() => exec("insertOrderedList")} />
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolBtn icon={Link}        label="Lien"             onAction={insertLink} />
        <ToolBtn icon={Minus}       label="Séparateur"       onAction={() => exec("insertHorizontalRule")} />
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[300px] p-4 text-sm prose max-w-none focus:outline-none"
        onInput={handleInput}
        suppressContentEditableWarning
      />
    </div>
  );
});

export default RichTextEditor;
