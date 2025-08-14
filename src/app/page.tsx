// src/app/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";

type Service = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  setupPrice: number;           // dólares
  monthlyPrice?: number | null; // dólares
};

type PlanServiceItem = {
  id: string;
  serviceId: string;
  setupPrice?: number | null;
  monthlyPrice?: number | null;
  service: Service;
};

type Plan = {
  id: string;
  name: string;
  baseMonthly?: number | null;
  services: PlanServiceItem[];
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<"servicios" | "planes">("servicios");

  // ----- Constructor -----
  const [services, setServices] = useState<Service[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [planName, setPlanName] = useState("");

  // Modo edición: si es null, estás creando; si tiene ID, estás editando ese plan
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlanOriginalName, setEditingPlanOriginalName] = useState<string>("");

  // ----- Planes guardados -----
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // carga servicios
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/services");
      const data: Service[] = await res.json();
      setServices(data.map((s) => ({ ...s, category: s.category ?? "General" })));
    })();
  }, []);

  // carga planes
  const loadPlans = async () => {
    const res = await fetch("/api/plans");
    const data: Plan[] = await res.json();
    setPlans(data);
  };
  useEffect(() => {
    loadPlans();
  }, []);

  // ----------- Constructor: filtrado y totales -----------
  const filteredServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      const text = `${s.name} ${s.description ?? ""} ${s.category ?? ""}`.toLowerCase();
      return !q || text.includes(q);
    });
  }, [services, query]);

  const { totalSetup, totalMonthly, selectedIds, selectedItems } = useMemo(() => {
    let setup = 0;
    let monthly = 0;
    const ids: string[] = [];
    const items: Service[] = [];
    for (const s of services) {
      if (selected[s.id]) {
        setup += s.setupPrice ?? 0;
        monthly += s.monthlyPrice ?? 0;
        ids.push(s.id);
        items.push(s);
      }
    }
    return {
      totalSetup: Math.round(setup * 100) / 100,
      totalMonthly: Math.round(monthly * 100) / 100,
      selectedIds: ids,
      selectedItems: items,
    };
  }, [services, selected]);

  const toggleService = (id: string) =>
    setSelected((p) => ({ ...p, [id]: !p[id] }));
  const removeService = (id: string) =>
    setSelected((p) => ({ ...p, [id]: false }));
  const addService = (id: string) =>
    setSelected((p) => ({ ...p, [id]: true }));
  const clearAll = () => setSelected({});

  // Guardar (crea) o Actualizar (edita)
  const saveOrUpdatePlan = async () => {
    if (!planName.trim()) return alert("Ponle un nombre al plan :)");
    if (selectedIds.length === 0) return alert("Selecciona al menos un servicio");

    if (editingPlanId) {
      // ACTUALIZAR (PATCH)
      const res = await fetch(`/api/plans/${editingPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: planName.trim(), serviceIds: selectedIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return alert("No se pudo actualizar: " + (err.error ?? res.statusText));
      }
      await loadPlans();
      alert("Plan actualizado.");
      // seguir en modo edición o salir: aquí lo dejamos en modo edición “terminada”
      setEditingPlanId(null);
      setEditingPlanOriginalName("");
      setPlanName("");
      setSelected({});
      setActiveTab("planes");
      return;
    }

    // CREAR (POST)
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: planName.trim(), serviceIds: selectedIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert("No se pudo guardar: " + (err.error ?? res.statusText));
    }
    await loadPlans();
    alert("Plan guardado.");
    // limpiar constructor tras crear
    setPlanName("");
    setSelected({});
  };

  // ----------- Planes: selección y acciones -----------
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  // EDITAR plan (como "usar como base" pero para actualizar el mismo plan)
  const startEditPlan = (plan: Plan) => {
    const map: Record<string, boolean> = {};
    for (const ps of plan.services) map[ps.serviceId] = true;
    setSelected(map);
    setPlanName(plan.name); // mismo nombre por defecto
    setEditingPlanId(plan.id);
    setEditingPlanOriginalName(plan.name);
    setActiveTab("servicios");
    window?.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  // USAR COMO BASE (borrador para crear otro)
  const loadPlanIntoBuilderAsDraft = (plan: Plan) => {
    const map: Record<string, boolean> = {};
    for (const ps of plan.services) map[ps.serviceId] = true;
    setSelected(map);
    setPlanName(`${plan.name} (borrador)`);
    setEditingPlanId(null);               // <- clave: modo crear
    setEditingPlanOriginalName("");
    setActiveTab("servicios");
    window?.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  // Editar SOLO nombre (por si lo quieres mantener también)
  const editPlanNameOnly = async (planId: string, currentName: string) => {
    const newName = prompt("Nuevo nombre del plan:", currentName);
    if (!newName || !newName.trim()) return;
    const res = await fetch(`/api/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert("No se pudo editar: " + (err.error ?? res.statusText));
    }
    await loadPlans();
    alert("Nombre actualizado.");
  };

  // Borrar plan
  const deletePlan = async (planId: string) => {
    if (!confirm("¿Seguro que deseas borrar este plan? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) {
      try {
        const err = await res.json();
        alert("No se pudo borrar: " + (err.error ?? res.statusText));
      } catch {
        alert("No se pudo borrar.");
      }
      return;
    }
    await loadPlans();
    if (selectedPlanId === planId) setSelectedPlanId(null);
    alert("Plan borrado.");
  };

  // ----------- DRAG & DROP (HTML5 nativo) -----------
  const DT_SERVICE = "service-id";
  const DT_SELECTED_SERVICE = "selected-service-id";

  const onDragStartService = (e: React.DragEvent, serviceId: string) => {
    e.dataTransfer.setData(DT_SERVICE, serviceId);
    e.dataTransfer.effectAllowed = "copy";
  };
  const allowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDropAdd = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(DT_SERVICE);
    if (id) addService(id);
  };
  const allowDropRemove = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDropRemove = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(DT_SELECTED_SERVICE);
    if (id) removeService(id);
  };
  const onDragStartSelected = (e: React.DragEvent, serviceId: string) => {
    e.dataTransfer.setData(DT_SELECTED_SERVICE, serviceId);
    e.dataTransfer.effectAllowed = "move";
  };

  // Pequeño banner si estás editando un plan
  const editingBanner = editingPlanId ? (
    <div className="rounded border px-3 py-2 bg-yellow-50 text-sm">
      Editando plan: <strong>{editingPlanOriginalName}</strong> — los cambios se guardarán en este plan.
      <button
        className="ml-3 underline"
        onClick={() => {
          // salir de edición, volver a modo crear
          setEditingPlanId(null);
          setEditingPlanOriginalName("");
          setPlanName("");
          setSelected({});
        }}
      >
        Cancelar edición
      </button>
    </div>
  ) : null;

  return (
    <div className="min-h-screen grid grid-cols-12">
      {/* Sidebar */}
      <aside className="col-span-12 md:col-span-4 lg:col-span-3 border-r p-4 space-y-4">
        <div className="flex gap-2">
          <button
            className={`flex-1 px-3 py-2 rounded border ${activeTab === "servicios" ? "bg-black text-white" : ""}`}
            onClick={() => setActiveTab("servicios")}
          >
            Servicios
          </button>
          <button
            className={`flex-1 px-3 py-2 rounded border ${activeTab === "planes" ? "bg-black text-white" : ""}`}
            onClick={() => setActiveTab("planes")}
          >
            Planes guardados
          </button>
        </div>

        {activeTab === "servicios" ? (
          <>
            {/* Zona de descarte para quitar servicios seleccionados */}
            <div
              onDragOver={allowDropRemove}
              onDrop={onDropRemove}
              className="border-2 border-dashed rounded p-3 text-sm text-gray-600"
              aria-label="Zona para soltar y quitar servicios del plan"
              title="Arrastra aquí servicios seleccionados para quitarlos"
            >
              Soltar aquí para <span className="font-semibold">quitar</span> del plan
            </div>

            <div className="flex gap-2">
              <input
                className="border rounded px-3 py-2 w-full"
                placeholder="Buscar servicios…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="border rounded px-3" onClick={() => setQuery("")}>✕</button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-auto pr-1">
              {filteredServices.map((s) => {
                const checked = !!selected[s.id];
                return (
                  <div
                    key={s.id}
                    className={`border rounded-lg p-3 ${checked ? "ring-1 ring-black" : ""}`}
                    draggable
                    onDragStart={(e) => onDragStartService(e, s.id)}
                    aria-grabbed="true"
                    role="button"
                    title="Arrastra al plan para agregar"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{s.name}</div>
                      <button
                        className={`text-sm px-2 py-1 rounded border ${checked ? "bg-black text-white" : ""}`}
                        onClick={() => toggleService(s.id)}
                      >
                        {checked ? "Quitar" : "Agregar"}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500">{s.category ?? "General"}</div>
                    {s.description ? <div className="text-sm text-gray-600 mt-1">{s.description}</div> : null}
                    <div className="text-sm mt-2">
                      Setup: ${s.setupPrice?.toFixed(2) ?? "0.00"}{" "}
                      {s.monthlyPrice != null && <>| Mensual: ${s.monthlyPrice.toFixed(2)}</>}
                    </div>
                  </div>
                );
              })}
              {filteredServices.length === 0 && (
                <div className="text-gray-500 text-sm">No hay resultados.</div>
              )}
            </div>
          </>
        ) : (
          // LISTA DE PLANES
          <div className="space-y-2 max-h-[75vh] overflow-auto pr-1">
            {plans.map((p) => (
              <button
                key={p.id}
                className={`w-full text-left border rounded-lg p-3 ${selectedPlanId === p.id ? "ring-1 ring-black" : "hover:bg-gray-50"}`}
                onClick={() => { setSelectedPlanId(p.id); }}
              >
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-gray-500">
                  {p.services.length} módulo(s) — Mensual base: ${p.baseMonthly?.toFixed(2) ?? "0.00"}
                </div>
              </button>
            ))}
            {plans.length === 0 && (
              <div className="text-gray-500 text-sm">No hay planes guardados.</div>
            )}
          </div>
        )}
      </aside>

      {/* Panel derecho */}
      <main
        className="col-span-12 md:col-span-8 lg:col-span-9 p-6 space-y-4"
        onDragOver={allowDrop}
        onDrop={onDropAdd}
        aria-label="Zona para soltar servicios y agregarlos al plan"
      >
        {activeTab === "servicios" ? (
          <>
            {editingBanner}

            <header className="flex flex-col sm:flex-row gap-3 items-start sm:items-end justify-between">
              <div>
                <h1 className="text-2xl font-bold">Constructor de Plan — The Hublab</h1>
                <p className="text-sm text-gray-500">
                  {editingPlanId
                    ? "Edita los módulos y nombre del plan. Guarda para actualizar el mismo plan."
                    : "Arrastra servicios desde la izquierda o pulsa “Agregar”. Luego guarda como un plan nuevo."}
                </p>
              </div>
              <div className="text-right">
                <div>Setup total: <strong>${totalSetup.toFixed(2)}</strong></div>
                <div>Mensual total: <strong>${totalMonthly.toFixed(2)}</strong></div>
              </div>
            </header>

            <section className="grid sm:grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className="text-sm text-gray-600 block mb-1">
                  {editingPlanId ? "Nombre del plan (editando)" : "Nombre del plan"}
                </label>
                <input
                  className="border rounded p-2 w-full"
                  placeholder="Ej. Plan Starter Hublab"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </div>
              <div className="col-span-1 flex items-end justify-end gap-2">
                <button
                  className="border rounded px-3 py-2"
                  onClick={() => {
                    if (editingPlanId) {
                      // cancelar edición y limpiar
                      setEditingPlanId(null);
                      setEditingPlanOriginalName("");
                      setPlanName("");
                      setSelected({});
                    } else {
                      clearAll();
                      setPlanName("");
                    }
                  }}
                >
                  {editingPlanId ? "Cancelar edición" : "Limpiar"}
                </button>
                <button
                  className="bg-black text-white rounded px-4 py-2"
                  onClick={saveOrUpdatePlan}
                >
                  {editingPlanId ? "Actualizar plan" : "Guardar plan"}
                </button>
              </div>
            </section>

            <section className="border rounded-xl p-4">
              <div className="font-semibold mb-2">
                Servicios {editingPlanId ? "del plan (editables)" : "seleccionados"} ({selectedIds.length})
                — arrástralos a la izquierda para quitarlos.
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedItems.map((s) => (
                  <div
                    key={s.id}
                    className="border rounded-lg p-3"
                    draggable
                    onDragStart={(e) => onDragStartSelected(e, s.id)}
                    aria-grabbed="true"
                    role="button"
                    title="Arrastra a la zona de descarte para quitar"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{s.name}</div>
                      <button className="text-xs underline" onClick={() => removeService(s.id)}>Quitar</button>
                    </div>
                    <div className="text-xs text-gray-500">{s.category ?? "General"}</div>
                    <div className="text-sm mt-1">
                      Setup: ${s.setupPrice?.toFixed(2) ?? "0.00"}{" "}
                      {s.monthlyPrice != null && <>| Mensual: ${s.monthlyPrice.toFixed(2)}</>}
                    </div>
                  </div>
                ))}
                {selectedItems.length === 0 && (
                  <div className="text-gray-500 text-sm">Aún no seleccionas servicios.</div>
                )}
              </div>
            </section>
          </>
        ) : (
          // DETALLE DEL PLAN (con Editar plan y Usar como base)
          <>
            {!selectedPlan ? (
              <div className="text-gray-500">Elige un plan a la izquierda para ver su detalle.</div>
            ) : (
              <>
                <header className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold">{selectedPlan.name}</h1>
                    <div className="text-sm text-gray-500">
                      {selectedPlan.services.length} módulo(s) — Mensual base: ${selectedPlan.baseMonthly?.toFixed(2) ?? "0.00"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="border rounded px-3 py-2"
                      onClick={() => startEditPlan(selectedPlan)}
                    >
                      Editar plan
                    </button>
                    <button
                      className="bg-red-600 text-white rounded px-3 py-2"
                      onClick={() => deletePlan(selectedPlan.id)}
                    >
                      Borrar plan
                    </button>
                    <button
                      className="bg-black text-white rounded px-3 py-2"
                      onClick={() => loadPlanIntoBuilderAsDraft(selectedPlan)}
                    >
                      Usar como base
                    </button>
                  </div>
                </header>

                <section className="border rounded-xl p-4 mt-4">
                  <div className="font-semibold mb-2">Módulos del plan</div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedPlan.services.map((ps) => {
                      const s = ps.service;
                      return (
                        <div key={ps.id} className="border rounded-lg p-3">
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-xs text-gray-500">{s.category ?? "General"}</div>
                          <div className="text-sm mt-1">
                            Setup: ${(ps.setupPrice ?? s.setupPrice ?? 0).toFixed(2)}{" "}
                            {(ps.monthlyPrice ?? s.monthlyPrice) != null && (
                              <>| Mensual: {((ps.monthlyPrice ?? s.monthlyPrice) as number).toFixed(2)}</>
                            )}
                          </div>
                          {s.description ? <div className="text-sm text-gray-600 mt-1">{s.description}</div> : null}
                        </div>
                      );
                    })}
                    {selectedPlan.services.length === 0 && (
                      <div className="text-gray-500 text-sm">Este plan no tiene módulos.</div>
                    )}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
