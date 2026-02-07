"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Participant = {
  id: string;
  name: string;
  color: string | null;
  avatarUrl: string | null;
  userId: string | null;
};

export function ParticipantList({
  groupId,
  participants,
  primaryUserId,
  canAdd,
}: {
  groupId: string;
  participants: Participant[];
  primaryUserId: string;
  canAdd: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/groups/${groupId}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, color: newColor || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to add");
      return;
    }
    setAdding(false);
    setNewName("");
    setNewColor("");
    router.refresh();
  }

  async function handleUpdate(participantId: string) {
    const res = await fetch(`/api/groups/${groupId}/participants/${participantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (!res.ok) return;
    setEditingId(null);
    router.refresh();
  }

  async function handleRemove(participantId: string) {
    if (!confirm("Remove this participant? They must have no linked expenses.")) return;
    const res = await fetch(`/api/groups/${groupId}/participants/${participantId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to remove");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-3">
      <ul className="space-y-2">
        {participants.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-mint-100 bg-mint-50/50 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              {p.color && (
                <span
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
              )}
              {editingId === p.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdate(p.id);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input max-w-[180px] py-1 text-sm"
                    autoFocus
                  />
                  <button type="submit" className="text-sm text-mint-600 hover:underline">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingId(null); setEditName(""); }}
                    className="text-sm text-gray-500 hover:underline"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="font-medium">{p.name}</span>
                  {p.userId && (
                    <span className="rounded bg-mint-200 px-1.5 py-0.5 text-xs text-mint-800">
                      You
                    </span>
                  )}
                </>
              )}
            </div>
            {editingId !== p.id && !p.userId && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(p.id);
                    setEditName(p.name);
                  }}
                  className="text-sm text-mint-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {canAdd && (
        <>
          {adding ? (
            <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name"
                className="input max-w-[140px] py-1 text-sm"
                required
              />
              <input
                type="text"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="Color (e.g. #22c55e)"
                className="input max-w-[100px] py-1 text-sm"
              />
              <button type="submit" className="btn-primary text-sm">
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAdding(false); setNewName(""); setNewColor(""); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="text-sm text-mint-600 hover:underline"
            >
              + Add participant
            </button>
          )}
        </>
      )}
    </div>
  );
}
