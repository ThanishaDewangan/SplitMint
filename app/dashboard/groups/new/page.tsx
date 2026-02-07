"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to create group");
      return;
    }
    router.push(`/dashboard/groups/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-2xl font-bold text-mint-800">New group</h1>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Group name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. Trip to NYC"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Create
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
