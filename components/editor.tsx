"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  useEditor,
  EditorContent,
  useEditorState,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Save,
  Share2,
  Download,
} from "lucide-react";
import { request, type Doc } from "@/lib/client";
import { Sharing } from "./sharing";
type Draft = { title: string; content: JSONContent };
export function DocumentEditor({
  document,
  owner,
}: {
  document: Doc;
  owner: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(document.title);
  const [status, setStatus] = useState("All changes saved");
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const draft = useRef<Draft>({
    title: document.title,
    content: document.content,
  });
  const version = useRef(document.version);
  const revision = useRef(0);
  const saved = useRef(0);
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blocked = useRef(false);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const changed = useCallback(() => {
    revision.current++;
    setDirty(true);
    setStatus("Unsaved changes");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveRef.current(), 1000);
  }, []);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false }),
    ],
    content: document.content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      draft.current.content = editor.getJSON();
      changed();
    },
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold"),
      italic: editor?.isActive("italic"),
      underline: editor?.isActive("underline"),
      bullet: editor?.isActive("bulletList"),
      ordered: editor?.isActive("orderedList"),
      heading:
        [1, 2, 3].find((level) => editor?.isActive("heading", { level })) ?? 0,
      undo: editor?.can().undo(),
      redo: editor?.can().redo(),
    }),
  });
  const save = useCallback(async () => {
    if (saving.current) {
      await saving.current;
      return saveRef.current();
    }
    if (saved.current === revision.current || blocked.current) return;
    const currentRevision = revision.current;
    const snapshot = structuredClone(draft.current);
    setStatus("Saving…");
    setError("");
    saving.current = (async () => {
      try {
        const result = await request<Doc>(`/api/documents/${document.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...(owner ? { title: snapshot.title } : {}),
            content: snapshot.content,
            version: version.current,
          }),
        });
        version.current = result.version;
        saved.current = currentRevision;
        setDirty(revision.current !== currentRevision);
        setStatus(
          revision.current === currentRevision
            ? "All changes saved"
            : "Unsaved changes",
        );
      } catch (e) {
        const message = (e as Error).message;
        setError(message);
        setStatus("Could not save");
        if (message.includes("Another user") || message.includes("revoked"))
          blocked.current = true;
      } finally {
        saving.current = null;
      }
    })();
    await saving.current;
  }, [document.id, owner]);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (saved.current !== revision.current) {
        e.preventDefault();
      }
    };
    const visibility = () => {
      if (documentGlobal.hidden) void saveRef.current();
    };
    const documentGlobal = window.document;
    const keyboard = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("beforeunload", unload);
    documentGlobal.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", keyboard);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("beforeunload", unload);
      documentGlobal.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("keydown", keyboard);
    };
  }, []);
  function download() {
    const blob = new Blob([JSON.stringify(draft.current, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${title || "document"}-draft.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function back() {
    await save();
    if (
      saved.current !== revision.current &&
      !confirm("Your changes have not been saved. Leave this page?")
    )
      return;
    router.push("/dashboard");
    router.refresh();
  }
  return (
    <main className="editor-workspace">
      <div className="editor-nav">
        <button onClick={back}>
          <ArrowLeft size={17} /> All documents
        </button>
        <div className="actions">
          <span
            role="status"
            className={error ? "save-status failed" : "save-status"}
          >
            {status}
          </span>
          <button onClick={() => void save()} disabled={!dirty}>
            <Save size={16} /> Save
          </button>
          {owner && (
            <button className="primary" onClick={() => setSharing(true)}>
              <Share2 size={16} /> Share
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <div className="actions">
            <button onClick={download}>
              <Download size={15} /> Download draft
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    "Reload the latest document? Download your draft first to preserve unsaved edits.",
                  )
                )
                  window.location.reload();
              }}
            >
              Reload latest
            </button>
          </div>
        </div>
      )}
      <div className="document-meta">
        <span className="badge">
          {owner ? "My document" : `Shared by ${document.owner.name}`}
        </span>
        <span>Changes save automatically</span>
      </div>
      <section className="editor-paper">
        <input
          className="title-input"
          aria-label="Document title"
          value={title}
          maxLength={200}
          readOnly={!owner}
          onChange={(e) => {
            setTitle(e.target.value);
            draft.current.title = e.target.value;
            changed();
          }}
        />
        <div className="toolbar" role="toolbar" aria-label="Text formatting">
          <select
            aria-label="Text style"
            value={active?.heading ?? 0}
            onChange={(e) => {
              const level = Number(e.target.value);
              if (level)
                editor
                  ?.chain()
                  .focus()
                  .setHeading({ level: level as 1 | 2 | 3 })
                  .run();
              else editor?.chain().focus().setParagraph().run();
            }}
          >
            <option value={0}>Normal text</option>
            <option value={1}>Heading 1</option>
            <option value={2}>Heading 2</option>
            <option value={3}>Heading 3</option>
          </select>
          <span className="separator" />
          {[
            {
              label: "Bold",
              Icon: Bold,
              on: active?.bold,
              run: () => editor?.chain().focus().toggleBold().run(),
            },
            {
              label: "Italic",
              Icon: Italic,
              on: active?.italic,
              run: () => editor?.chain().focus().toggleItalic().run(),
            },
            {
              label: "Underline",
              Icon: Underline,
              on: active?.underline,
              run: () => editor?.chain().focus().toggleUnderline().run(),
            },
            {
              label: "Bulleted list",
              Icon: List,
              on: active?.bullet,
              run: () => editor?.chain().focus().toggleBulletList().run(),
            },
            {
              label: "Numbered list",
              Icon: ListOrdered,
              on: active?.ordered,
              run: () => editor?.chain().focus().toggleOrderedList().run(),
            },
          ].map(({ label, Icon, on, run }) => (
            <button
              key={label}
              title={label}
              aria-label={label}
              aria-pressed={!!on}
              className={on ? "active" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onClick={run}
            >
              <Icon size={18} />
            </button>
          ))}
          <span className="separator" />
          <button
            title="Undo"
            aria-label="Undo"
            disabled={!active?.undo}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 size={18} />
          </button>
          <button
            title="Redo"
            aria-label="Redo"
            disabled={!active?.redo}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 size={18} />
          </button>
        </div>
        <EditorContent editor={editor} />
        <div className="paper-footer">
          A place to think, write, and make things happen.
        </div>
      </section>
      {sharing && (
        <Sharing
          id={document.id}
          ownerId={document.ownerId}
          close={() => setSharing(false)}
        />
      )}
    </main>
  );
}
