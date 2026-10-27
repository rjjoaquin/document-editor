"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Upload,
  Trash2,
  ArrowUpRight,
  Users,
  FolderOpen,
} from "lucide-react";
import { type Doc, request } from "@/lib/client";
export function Dashboard({
  documents,
  userId,
}: {
  documents: Doc[];
  userId: string;
}) {
  const router = useRouter();
  const upload = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  async function create(file?: File) {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      if (file) form.append("file", file);
      const doc = await request<Doc>(
        file ? "/api/documents/import" : "/api/documents",
        { method: "POST", body: file ? form : JSON.stringify({}) },
      );
      router.push(`/documents/${doc.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main className="dashboard">
      <div className="eyebrow">YOUR WORKSPACE, IN WORDS</div>
      <div className="page-heading">
        <div>
          <h1>Documents</h1>
          <p>A little space for your next big idea.</p>
        </div>
        <div className="actions">
          <button disabled={busy} onClick={() => upload.current?.click()}>
            <Upload size={17} /> Import document
          </button>
          <button className="primary" disabled={busy} onClick={() => create()}>
            <Plus size={18} /> New document
          </button>
        </div>
      </div>
      <input
        ref={upload}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            if (file.size > 2 * 1024 * 1024)
              setError("Files must be 2 MB or smaller.");
            else void create(file);
          }
          e.target.value = "";
        }}
      />
      <div className="workspace-note">
        <FileText size={19} />
        <span>Good ideas deserve a place to grow.</span>
        <small>Import .txt or .md files · Up to 2 MB</small>
      </div>
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <input
        className="search"
        placeholder="Search your documents…"
        aria-label="Search documents"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {[
        { name: "My Documents", shared: false, icon: FolderOpen },
        { name: "Shared With Me", shared: true, icon: Users },
      ].map((section) => {
        const docs = filtered.filter(
          (d) => (d.ownerId !== userId) === section.shared,
        );
        return (
          <section key={section.name} className="document-section">
            <h2>
              <section.icon size={19} />
              {section.name}
              <span className="count">{docs.length}</span>
            </h2>
            {docs.length ? (
              <div className="cards">
                {docs.map((d) => (
                  <article key={d.id} className="card">
                    <a href={`/documents/${d.id}`}>
                      <div
                        className={`file-icon ${section.shared ? "shared" : ""}`}
                      >
                        <FileText size={25} />
                      </div>
                      <ArrowUpRight className="card-arrow" size={19} />
                      <h3>{d.title}</h3>
                      <p>
                        {section.shared
                          ? `Shared by ${d.owner.name}`
                          : "Owned by you"}
                      </p>
                      <div className="card-footer">
                        <time dateTime={d.updatedAt}>
                          {new Date(d.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "Asia/Manila",
                          })}
                        </time>
                        <span className="badge">
                          {section.shared ? "Shared" : "Private"}
                        </span>
                      </div>
                    </a>
                    {!section.shared && (
                      <button
                        className="delete"
                        aria-label={`Delete ${d.title}`}
                        onClick={async () => {
                          if (
                            !confirm(
                              `Delete “${d.title}”? This cannot be undone.`,
                            )
                          )
                            return;
                          try {
                            await request(`/api/documents/${d.id}`, {
                              method: "DELETE",
                            });
                            router.refresh();
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <section.icon size={27} />
                <h3>
                  {section.shared ? "Better together" : "A fresh page awaits"}
                </h3>
                <p>
                  {section.shared
                    ? "Documents others share with you will appear here."
                    : search
                      ? "No documents match your search."
                      : "Create a document or import your notes to get started."}
                </p>
              </div>
            )}
          </section>
        );
      })}
      <footer>
        Papertrail <span>Make room for what matters.</span>
      </footer>
    </main>
  );
}
