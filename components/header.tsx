"use client";
import { FileText } from "lucide-react";
import { request, type User } from "@/lib/client";
export function Header({ user, users }: { user: User; users: User[] }) {
  return (
    <header className="header">
      <a className="brand" href="/dashboard">
        <FileText size={24} /> Papertrail <span>WORKSPACE</span>
      </a>
      <div className="account">
        <span className="demo-label">Demo account</span>
        <select
          aria-label="Active demo user"
          value={user.id}
          onChange={async (e) => {
            try {
              await request("/api/demo-session", {
                method: "POST",
                body: JSON.stringify({ userId: e.target.value }),
              });
              window.location.reload();
            } catch (e) {
              alert((e as Error).message);
            }
          }}
        >
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} · {u.email}
            </option>
          ))}
        </select>
        <span className="avatar">{user.name[0]}</span>
      </div>
    </header>
  );
}
