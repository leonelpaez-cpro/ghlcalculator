
// src/app/admin/services/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Category = { id: string; name: string };
type Service = {
  id: string;
  name: string;
  description?: string | null;
  setupPrice: number;            // USD (backend ya devuelve en dólares)
  monthlyPrice?: number | null;  // USD
  categoryId?: string | null;
  category?: Category | null;
  isActive: boolean;
};

export default function ServicesAdmin() {
  // datos
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // filtros
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState<string | "">("");

  // crear
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    setupPrice: "",
    monthlyPrice: "",
    categoryId: "",
  });

  // editar (panel simple)
  const [editing, setEditing] = useState<Service | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    setupPrice: "",
    monthlyPrice: "",
    categoryId: "",
    isActive: true,
  });

  // cargar categorías
  const loadCategories = async () => {
    const res = await fetch("/api/categories");
    setCategories(await res.json());
  };

  // cargar servicios (con server-side filtering)
  const loadServices = async () => {
    const url = new URL("/api/services", window.location.origin);
    if (q.trim()) url.searchParams.set("q", q.trim());
    if (categoryId) url.searchParams.set("categoryId", categoryId);
    const res = await fetch(url.toString());
    setServices(await res.json());
  };

  useEffect(() => {
    loadCategories();
  }, []);
  useEffect(() => {
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoryId]);

  // listado mostrado (si prefieres client-side filtering, podrías usar este memo)
  const shown = useMemo(() => services, [services]);

  // helpers de precio
  const toNum = (s: string) => (s.trim() === "" ? undefined : Number(s));
  const fmt = (n?: number | null) =>
    n == null ? "-" : `$${n.toFixed(2)}`;

  // --- Crear ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return alert("Nombre requerido");
    if (createForm.setupPrice.trim() === "") return alert("Setup requerido");

    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
        categoryId: createForm.categoryId || null,
        setupPrice: Number(createForm.setupPrice),
        monthlyPrice:
          createForm.monthlyPrice.trim() === ""
            ? null
            : Number(createForm.monthlyPrice),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert(err.error ?? "No se pudo crear");
    }
    setCreateForm({
      name: "",
      description: "",
      setupPrice: "",
      monthlyPrice: "",
      categoryId: "",
    });
    loadServices();
  };

  // --- Clonar ---
  const handleClone = async (s: Service) => {
    const name = prompt("Nombre para la copia:", `${s.name} (copia)`) || undefined;
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cloneFromId: s.id, name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert(err.error ?? "No se pudo clonar");
    }
    loadServices();
  };

  // --- Editar (abrir panel) ---
  const openEdit = (s: Service) => {
    setEditing(s);
    setEditForm({
      name: s.name,
      description: s.description ?? "",
      setupPrice: String(s.setupPrice ?? ""),
      monthlyPrice: s.monthlyPrice == null ? "" : String(s.monthlyPrice),
      categoryId: s.categoryId ?? "",
      isActive: s.isActive,
    });
    window?.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  // --- Guardar edición ---
  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editForm.name.trim()) return alert("Nombre requerido");
    if (editForm.setupPrice.trim() === "") return alert("Setup requerido");

    const res = await fetch(`/api/services/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name.trim(),
        description:
          editForm.description.trim() === "" ? null : editForm.description.trim(),
        categoryId: editForm.categoryId === "" ? null : editForm.categoryId,
        setupPrice: Number(editForm.setupPrice),
        monthlyPrice:
          editForm.monthlyPrice.trim() === ""
            ? null
            : Number(editForm.monthlyPrice),
        isActive: editForm.isActive,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert(err.error ?? "No se pudo editar");
    }
    setEditing(null);
    loadServices();
  };

  // --- Eliminar ---
  const handleDelete = async (s: Service) => {
    if (!confirm(`¿Eliminar servicio "${s.name}"?`)) return;
    const res = await fetch(`/api/services/${s.id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      return alert(err.error ?? "No se pudo eliminar");
    }
    loadServices();
  };

  // --- Limpiar edición ---
  const cancelEdit = () => setEditing(null);

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Servicios — The Hublab</h1>
          <p className="text-sm text-gray-600">
            Crea, edita, elimina, clona y asigna categorías a los servicios.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="border rounded px-3 py-2"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            title="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="border rounded px-3 py-2"
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="border rounded px-3 py-2"
            onClick={() => {
              setQ("");
              setCategoryId("");
            }}
          >
            Limpiar
          </button>
        </div>
      </header>

      {/* Panel de edición arriba (si existe) */}
      {editing && (
        <section className="border rounded-xl p-4 space-y-3 bg-yellow-50">
          <div className="flex items-start justify-between">
            <div className="font-semibold">Editando: {editing.name}</div>
            <div className="flex gap-2">
              <button className="border rounded px-3 py-1" onClick={cancelEdit}>
                Cancelar
              </button>
              <button
                className="bg-black text-white rounded px-3 py-1"
                onClick={(e) => submitEdit(e as any)}
              >
                Guardar cambios
              </button>
            </div>
          </div>

          <form
            onSubmit={submitEdit}
            className="grid md:grid-cols-2 gap-3"
          >
            <input
              className="border p-2 rounded"
              placeholder="Nombre"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, name: e.target.value }))
              }
            />
            <select
              className="border p-2 rounded"
              value={editForm.categoryId}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, categoryId: e.target.value }))
              }
            >
              <option value="">(Sin categoría)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              className="border p-2 rounded md:col-span-2"
              placeholder="Descripción"
              value={editForm.description}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, description: e.target.value }))
              }
            />

            <input
              className="border p-2 rounded"
              placeholder="Setup USD"
              value={editForm.setupPrice}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, setupPrice: e.target.value }))
              }
            />
            <input
              className="border p-2 rounded"
              placeholder="Mensual USD (opcional)"
              value={editForm.monthlyPrice}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, monthlyPrice: e.target.value }))
              }
            />

            <label className="flex items-center gap-2 md:col-span-2">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              <span>Activo</span>
            </label>

            <button className="bg-black text-white rounded px-4 py-2 md:col-span-2">
              Guardar cambios
            </button>
          </form>
        </section>
      )}

      {/* Crear servicio */}
      <section className="border rounded-xl p-4">
        <div className="font-semibold mb-3">Agregar servicio</div>
        <form
          onSubmit={handleCreate}
          className="grid md:grid-cols-2 gap-3"
        >
          <input
            className="border p-2 rounded"
            placeholder="Nombre"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, name: e.target.value }))
            }
          />
          <select
            className="border p-2 rounded"
            value={createForm.categoryId}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, categoryId: e.target.value }))
            }
          >
            <option value="">(Sin categoría)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            className="border p-2 rounded md:col-span-2"
            placeholder="Descripción"
            value={createForm.description}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, description: e.target.value }))
            }
          />

          <input
            className="border p-2 rounded"
            placeholder="Setup USD"
            value={createForm.setupPrice}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, setupPrice: e.target.value }))
            }
          />
          <input
            className="border p-2 rounded"
            placeholder="Mensual USD (opcional)"
            value={createForm.monthlyPrice}
            onChange={(e) =>
              setCreateForm((f) => ({ ...f, monthlyPrice: e.target.value }))
            }
          />

          <button className="bg-black text-white rounded px-4 py-2 md:col-span-2">
            Agregar servicio
          </button>
        </form>
      </section>

      {/* Lista */}
      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {shown.map((s) => (
          <div key={s.id} className="border rounded p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-gray-500">
                  {s.category?.name ?? "(Sin categoría)"} · {s.isActive ? "Activo" : "Inactivo"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="border rounded px-2 py-1 text-sm"
                  onClick={() => openEdit(s)}
                >
                  Editar
                </button>
                <button
                  className="border rounded px-2 py-1 text-sm"
                  onClick={() => handleClone(s)}
                >
                  Clonar
                </button>
                <button
                  className="bg-red-600 text-white rounded px-2 py-1 text-sm"
                  onClick={() => handleDelete(s)}
                >
                  Eliminar
                </button>
              </div>
            </div>

            {s.description ? (
              <div className="text-sm text-gray-600">{s.description}</div>
            ) : null}

            <div className="text-sm">
              Setup: {fmt(s.setupPrice)}{" "}
              {s.monthlyPrice != null && <>| Mensual: {fmt(s.monthlyPrice)}</>}
            </div>
          </div>
        ))}
        {shown.length === 0 && (
          <div className="text-gray-500">No hay servicios.</div>
        )}
      </section>
    </main>
  );
}
