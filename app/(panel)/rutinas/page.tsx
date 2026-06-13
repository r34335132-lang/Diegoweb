"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, Plus, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty, Modal, PageHeader } from "@/components/ui";
import { getCatalog, getClients, getRoutines } from "@/lib/data";
import { supabase } from "@/lib/supabase";

const levels = ["principiante", "intermedio", "avanzado"];
const emptyForm = {
  nombre: "",
  descripcion: "",
  nivel: "intermedio",
  clientIds: [] as string[],
  exerciseIds: [] as string[],
};

export default function RoutinesPage() {
  const { profile } = useAuth();
  const params = useSearchParams();
  const qc = useQueryClient();
  const id = profile!.id;
  const [open, setOpen] = useState(params.get("crear") === "1");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const routines = useQuery({ queryKey: ["routines", id], queryFn: () => getRoutines(id) });
  const clients = useQuery({ queryKey: ["clients", id], queryFn: () => getClients(id) });
  const catalog = useQuery({ queryKey: ["catalog", id], queryFn: () => getCatalog(id) });

  const create = useMutation({
    mutationFn: async () => {
      let routineId: string | null = null;
      try {
        const { data, error } = await supabase.from("rutinas").insert({
          entrenador_id: id,
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim() || null,
          nivel: form.nivel,
        }).select().single();
        if (error) throw error;
        routineId = data.id;

        if (form.clientIds.length) {
          const { error: assignmentError } = await supabase.from("rutina_clientes").insert(
            form.clientIds.map((cliente_id) => ({ rutina_id: data.id, cliente_id })),
          );
          if (assignmentError) throw assignmentError;
        }

        const selectedExercises = (catalog.data ?? []).filter((exercise) => form.exerciseIds.includes(exercise.id));
        if (selectedExercises.length) {
          const { error: exerciseError } = await supabase.from("ejercicios").insert(
            selectedExercises.map((exercise, orden) => ({
              rutina_id: data.id,
              nombre: exercise.nombre,
              descripcion: exercise.descripcion ?? null,
              series: 3,
              repeticiones: "10",
              peso: null,
              descanso: "60s",
              imagen_url: exercise.imagen_url ?? null,
              video_url: exercise.video_url ?? null,
              grupo_serie: null,
              orden,
            })),
          );
          if (exerciseError) throw exerciseError;
        }
      } catch (reason) {
        if (routineId) {
          await supabase.from("rutinas").delete().eq("id", routineId).eq("entrenador_id", id);
        }
        throw reason;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["routines", id] });
      setOpen(false);
      setError("");
      setForm(emptyForm);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "No se pudo crear la rutina."),
  });

  const remove = useMutation({
    mutationFn: async (routineId: string) => {
      if (!confirm("¿Eliminar esta rutina y sus ejercicios?")) return;
      const { error } = await supabase.from("rutinas").delete().eq("id", routineId).eq("entrenador_id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines", id] }),
  });

  const filtered = useMemo(
    () => (routines.data ?? []).filter((routine) =>
      (filter === "todos" || routine.nivel?.toLowerCase() === filter) &&
      routine.nombre.toLowerCase().includes(search.toLowerCase())
    ),
    [routines.data, search, filter],
  );

  return (
    <>
      <PageHeader title="Rutinas" subtitle="Crea planes, asígnalos a varios clientes y administra sus ejercicios.">
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={17} /> Nueva rutina</button>
      </PageHeader>
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div className="search"><Search size={17} /><input className="input" placeholder="Buscar rutina..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <select className="select" style={{ width: 190 }} value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="todos">Todos los niveles</option>
          {levels.map((level) => <option key={level}>{level}</option>)}
        </select>
      </div>
      {!filtered.length ? (
        <div className="card"><Empty icon={<Dumbbell size={34} />} text="No hay rutinas que mostrar." /></div>
      ) : (
        <div className="grid routine-grid">
          {filtered.map((routine) => {
            const names = routine.rutina_clientes?.map((item) => `${item.perfiles?.nombre ?? ""} ${item.perfiles?.apellido ?? ""}`.trim()).filter(Boolean) ?? [];
            return (
              <Link href={`/rutinas/${routine.id}`} className="card routine-card" key={routine.id}>
                <div className="section-head">
                  <span className="icon-box"><Dumbbell size={19} /></span>
                  <button className="btn btn-danger btn-icon" onClick={(event) => { event.preventDefault(); remove.mutate(routine.id); }} aria-label={`Eliminar ${routine.nombre}`}><Trash2 size={16} /></button>
                </div>
                <h3>{routine.nombre}</h3>
                <p className="muted" style={{ margin: 0 }}>{routine.descripcion || "Sin descripción"}</p>
                <div className="routine-bottom">
                  <span className="badge">{routine.nivel}</span>
                  <span className="dim" style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 12 }}><Users size={13} /> {names.length ? names.join(", ") : "Sin asignar"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <Modal open={open} title="Nueva rutina" onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          {error ? <div className="error full">{error}</div> : null}
          <div className="field full"><label>Nombre</label><input className="input" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} required /></div>
          <div className="field full"><label>Descripción</label><textarea className="textarea" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /></div>
          <div className="field"><label>Nivel</label><select className="select" value={form.nivel} onChange={(event) => setForm({ ...form, nivel: event.target.value })}>{levels.map((level) => <option key={level}>{level}</option>)}</select></div>
          <div className="field full">
            <label>Asignar a clientes</label>
            <div className="chips">
              {clients.data?.clients.map((client) => {
                const selected = form.clientIds.includes(client.id);
                return <button type="button" className={`chip ${selected ? "selected" : ""}`} key={client.id} onClick={() => setForm({ ...form, clientIds: selected ? form.clientIds.filter((clientId) => clientId !== client.id) : [...form.clientIds, client.id] })}>{client.nombre} {client.apellido}</button>;
              })}
            </div>
          </div>
          <div className="field full">
            <label>Ejercicios del catálogo</label>
            {!catalog.data?.length ? (
              <p className="dim" style={{ margin: 0 }}>Aún no hay ejercicios. Agrégalos primero desde Catálogo.</p>
            ) : (
              <div className="catalog-picker">
                {catalog.data.map((exercise) => {
                  const selected = form.exerciseIds.includes(exercise.id);
                  return (
                    <button type="button" className={`catalog-option ${selected ? "selected" : ""}`} key={exercise.id} onClick={() => setForm({ ...form, exerciseIds: selected ? form.exerciseIds.filter((exerciseId) => exerciseId !== exercise.id) : [...form.exerciseIds, exercise.id] })}>
                      <span><strong>{exercise.nombre}</strong><small>{exercise.categoria}</small></span>
                      <span className="catalog-check">{selected ? "✓" : "+"}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {form.exerciseIds.length ? <span className="dim">{form.exerciseIds.length} ejercicio(s) seleccionado(s)</span> : null}
          </div>
          <div className="actions full" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" disabled={create.isPending}>{create.isPending ? "Creando..." : "Crear rutina"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
