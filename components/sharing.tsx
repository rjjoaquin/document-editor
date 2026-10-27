"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { request, type User } from "@/lib/client";
export function Sharing({
  id,
  ownerId,
  close,
}: {
  id: string;
  ownerId: string;
  close: () => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [shares, setShares] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      request<{ users: User[] }>("/api/users"),
      request<User[]>(`/api/documents/${id}/shares`),
    ])
      .then(([u, s]) => {
        setUsers(u.users);
        setShares(s);
      })
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);
  async function toggle(userId: string, has: boolean) {
    setBusy(true);
    setError("");
    try {
      await request(`/api/documents/${id}/shares${has ? `/${userId}` : ""}`, {
        method: has ? "DELETE" : "POST",
        ...(!has ? { body: JSON.stringify({ userId }) } : {}),
      });
      setShares(await request(`/api/documents/${id}/shares`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          aria-label="Close sharing"
          onClick={close}
          autoFocus
        >
          <X size={19} />
        </button>
        <h2 id="share-title">Share document</h2>
        <p>Invite someone to read and edit this document.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {users
          .filter((u) => u.id !== ownerId)
          .map((u) => {
            const has = shares.some((s) => s.id === u.id);
            return (
              <div className="share-user" key={u.id}>
                <span className="avatar">{u.name[0]}</span>
                <div>
                  <strong>{u.name}</strong>
                  <small>
                    {u.email} · {has ? "Can edit" : "No access"}
                  </small>
                </div>
                <button disabled={busy} onClick={() => toggle(u.id, has)}>
                  {has ? "Revoke access" : "Grant access"}
                </button>
              </div>
            );
          })}
        <small>
          Shared editors can edit content. Only you can rename, delete, or
          manage access.
        </small>
      </section>
    </div>
  );
}
