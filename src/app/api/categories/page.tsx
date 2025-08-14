"use client";
import { useEffect, useState } from "react";

type Category = { id: string; name: string; description?: string | null };

export default function CategoriesAdmin() {
  const [cats, setCats] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => {
    const res = await fetch("/api/categories");
    setCats(await res.json());
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, description: form.description || null }),
    });
    if (!res.ok) return alert("No se pudo crear");
    setForm({ name: "", description: "" });
    load();
  };

  const rename = async (c: Category) => {
    const name = prompt("Nuevo nombre", c.name);
    if (!name) return;
    const res = await fetch(`/api/categories/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return alert("No se pudo editar");
    load();
  };

  const remove = async (c: Category) => {
    if (!confirm(`¿Borrar categoría "${c.name}"?`)) return;
    const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      return alert(err.error ?? "No se pudo borrar");
    }
    load();
  };

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Categorías — The Hublab</h1>

      <form onSubmit={create} className="grid gap-2 border rounded p-3">
        <input className="border p-2 rounded" placeholder="Nombre"
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="border p-2 rounded" placeholder="Descripción (opcional)"
          value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <button className="bg-black text-white rounded p-2">Agregar categoría</button>
      </form>

      <ul className="space-y-2">
        {cats.map(c => (
          <li key={c.id} className="border rounded p-3 flex items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{c.name}</div>
              {c.description ? <div className="text-sm text-gray-600">{c.description}</div> : null}
            </div>
            <div className="flex gap-2">
              <button className="border rounded px-3 py-1" onClick={() => rename(c)}>Editar</button>
              <button className="bg-red-600 text-white rounded px-3 py-1" onClick={() => remove(c)}>Eliminar</button>
            </div>
          </li>
        ))}
        {cats.length === 0 && <div className="text-gray-500">No hay categorías.</div>}
      </ul>
    </main>
  );
}
