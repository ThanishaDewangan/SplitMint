"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export function GroupActions({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(groupName);
  const [deleting, setDeleting] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete group "${groupName}" and all its expenses? This cannot be undone.`))
      return;
    setDeleting(true);
    const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    }
    setDeleting(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleUpdate} className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input max-w-[200px]"
          autoFocus
        />
        <button type="submit" className="btn-primary text-sm">
          Save
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setName(groupName); }}
          className="btn-secondary text-sm"
        >
          Cancel
        </button>
      </form>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="btn-secondary text-sm"
      >
        Edit name
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="btn-danger text-sm"
      >
        {deleting ? "Deleting…" : "Delete group"}
      </button>
      <Link href="/dashboard" className="btn-secondary text-sm">
        Back to dashboard
      </Link>
    </div>
  );
}
