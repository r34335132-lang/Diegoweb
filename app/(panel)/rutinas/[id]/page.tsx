"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Dumbbell, ImageIcon, Pencil, Plus, Save, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty, Modal, PageHeader } from "@/components/ui";
import { getClients, getRoutine } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import type { Exercise } from "@/lib/types";

const emptyExercise = {
  nombre: "", descripcion: "", series: "3", repeticiones: "10", peso: "", descanso: "60s",
  imagen_url: "", video_url: "", tipo: "individual", saveCatalog: false, categoria: "General",
};
const categories = ["Pierna", "Pecho", "Espalda", "Brazo", "Hombro", "Core", "Cardio", "Full Body", "General"];

export default function RoutineDetailPage() {
  const params = useParams<{ id: string }>();
  const routineId = params.id;
  const { profile } = useAuth();
  const trainerId = profile!.id;
  const qc = useQueryClient();
  const [exerciseOpen, setExerciseOpen] = useState(false);
  const [editExercise, setEditExercise] = useState<Exercise | null>(null);
  const [form, setForm] = useState(emptyExercise);
  const [error, setError] = useState("");
  const detail = useQuery({ queryKey: ["routine", routineId, trainerId], queryFn: () => getRoutine(routineId, trainerId) });
  const clients = useQuery({ queryKey: ["clients", trainerId], queryFn: () => getClients(trainerId) });

  const saveRoutine = useMutation({
    mutationFn: async (payload: { nombre: string; descripcion: string; nivel: string; clientIds: string[] }) => {
      const { error } = await supabase.from("rutinas").update({ nombre: payload.nombre, descripcion: payload.descripcion || null, nivel: payload.nivel }).eq("id", routineId).eq("entrenador_id", trainerId);
      if (error) throw error;
      await supabase.from("rutina_clientes").delete().eq("rutina_id", routineId);
      if (payload.clientIds.length) {
        const { error: assignmentError } = await supabase.from("rutina_clientes").insert(payload.clientIds.map((cliente_id) => ({ rutina_id: routineId, cliente_id })));
        if (assignmentError) throw assignmentError;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["routine", routineId] }); qc.invalidateQueries({ queryKey: ["routines", trainerId] }); },
  });

  const saveExercise = useMutation({
    mutationFn: async () => {
      const payload = {
        rutina_id: routineId, nombre: form.nombre.trim(), descripcion: form.descripcion.trim() || null,
        series: Number(form.series) || 3, repeticiones: form.repeticiones, peso: form.peso || null,
        descanso: form.descanso, imagen_url: form.imagen_url || null, video_url: form.video_url || null,
        orden: editExercise?.orden ?? detail.data?.exercises.length ?? 0,
      };
      if (editExercise) {
        const { error } = await supabase.from("ejercicios").update(payload).eq("id", editExercise.id);
        if (error) throw error;
      } else {
        const amount = form.tipo === "triserie" ? 3 : form.tipo === "biserie" ? 2 : 1;
        const group = amount > 1 ? `G${Date.now()}` : null;
        const rows = Array.from({ length: amount }, (_, index) => ({ ...payload, nombre: index ? `${payload.nombre} ${index + 1}` : payload.nombre, grupo_serie: group, orden: payload.orden + index }));
        const { error } = await supabase.from("ejercicios").insert(rows);
        if (error) throw error;
      }
      if (form.saveCatalog) {
        const { error } = await supabase.from("catalogo_ejercicios").insert({
          entrenador_id: trainerId, nombre: form.nombre.trim(), categoria: form.categoria,
          descripcion: form.descripcion.trim() || null, imagen_url: form.imagen_url || null, video_url: form.video_url || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routine", routineId] });
      qc.invalidateQueries({ queryKey: ["catalog", trainerId] });
      setExerciseOpen(false); setEditExercise(null); setForm(emptyExercise); setError("");
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "No se pudo guardar."),
  });

  const removeExercise = useMutation({
    mutationFn: async (id: string) => {
      if (!confirm("¿Eliminar este ejercicio?")) return;
      const { error } = await supabase.from("ejercicios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routine", routineId] }),
  });

  if (detail.isLoading) return <div className="loading-screen" style={{ minHeight: 400 }}><div className="spinner" /></div>;
  if (!detail.data) return <div className="error">No se pudo cargar esta rutina o no te pertenece.</div>;
  const { routine, assignments, exercises } = detail.data;

  return (
    <>
      <Link href="/rutinas" className="muted" style={{ display: "inline-flex", gap: 7, alignItems: "center", marginBottom: 18 }}><ArrowLeft size={16} /> Volver a rutinas</Link>
      <PageHeader title={routine.nombre} subtitle={`${exercises.length} ejercicios · Nivel ${routine.nivel}`}>
        <button className="btn btn-primary" onClick={() => { setForm(emptyExercise); setEditExercise(null); setExerciseOpen(true); }}><Plus size={17} /> Agregar ejercicio</button>
      </PageHeader>
      <RoutineSettings routine={routine} assignments={assignments} clients={clients.data?.clients ?? []} onSave={(payload) => saveRoutine.mutate(payload)} pending={saveRoutine.isPending} />
      <section style={{ marginTop: 25 }}>
        <div className="section-head"><h2 className="section-title">Editor de ejercicios</h2></div>
        {!exercises.length ? <div className="card"><Empty icon={<Dumbbell size={34} />} text="Esta rutina aún no tiene ejercicios." /></div> :
          <div className="grid">{exercises.map((exercise, index) =>
            <article className="card exercise-card" key={exercise.id}>
              <span className="exercise-number">{index + 1}</span>
              <div>
                <div className="actions"><h3 style={{ margin: 0 }}>{exercise.nombre}</h3>{exercise.grupo_serie ? <span className="badge" style={{ "--badge-color": "#f97316" } as React.CSSProperties}>{exercise.grupo_serie}</span> : null}</div>
                {exercise.descripcion ? <p className="muted">{exercise.descripcion}</p> : null}
                <div className="exercise-meta"><span>{exercise.series} series</span><span>{exercise.repeticiones} reps</span>{exercise.peso ? <span>{exercise.peso}</span> : null}<span>{exercise.descanso}</span></div>
                {exercise.imagen_url ? <img className="media-preview" src={exercise.imagen_url} alt={exercise.nombre} /> : null}
                {exercise.video_url ? <video className="media-preview" src={exercise.video_url} controls /> : null}
              </div>
              <div className="actions"><button className="btn btn-secondary btn-icon" onClick={() => { setEditExercise(exercise); setForm({ ...emptyExercise, nombre: exercise.nombre, descripcion: exercise.descripcion ?? "", series: String(exercise.series), repeticiones: exercise.repeticiones, peso: exercise.peso ?? "", descanso: exercise.descanso ?? "60s", imagen_url: exercise.imagen_url ?? "", video_url: exercise.video_url ?? "" }); setExerciseOpen(true); }}><Pencil size={16} /></button><button className="btn btn-danger btn-icon" onClick={() => removeExercise.mutate(exercise.id)}><Trash2 size={16} /></button></div>
            </article>
          )}</div>}
      </section>
      <Modal open={exerciseOpen} title={editExercise ? "Editar ejercicio" : "Agregar ejercicio"} onClose={() => setExerciseOpen(false)}>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); saveExercise.mutate(); }}>
          {error ? <div className="error full">{error}</div> : null}
          {!editExercise ? <div className="field full"><label>Tipo de bloque</label><select className="select" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="individual">Individual</option><option value="biserie">Biserie</option><option value="triserie">Triserie</option></select></div> : null}
          <div className="field full"><label>Nombre</label><input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
          <div className="field full"><label>Descripción</label><textarea className="textarea" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
          <div className="field"><label>Series</label><input className="input" type="number" value={form.series} onChange={(e) => setForm({ ...form, series: e.target.value })} /></div>
          <div className="field"><label>Repeticiones</label><input className="input" value={form.repeticiones} onChange={(e) => setForm({ ...form, repeticiones: e.target.value })} /></div>
          <div className="field"><label>Peso</label><input className="input" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} /></div>
          <div className="field"><label>Descanso</label><input className="input" value={form.descanso} onChange={(e) => setForm({ ...form, descanso: e.target.value })} /></div>
          <div className="field full"><label><ImageIcon size={13} /> URL de imagen</label><input className="input" type="url" value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} /></div>
          <div className="field full"><label><Video size={13} /> URL de video</label><input className="input" type="url" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} /></div>
          <label className="full actions"><input type="checkbox" checked={form.saveCatalog} onChange={(e) => setForm({ ...form, saveCatalog: e.target.checked })} /> Guardar también en el catálogo</label>
          {form.saveCatalog ? <div className="field full"><label>Categoría</label><select className="select" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></div> : null}
          <div className="actions full" style={{ justifyContent: "flex-end" }}><button type="button" className="btn btn-secondary" onClick={() => setExerciseOpen(false)}>Cancelar</button><button className="btn btn-primary" disabled={saveExercise.isPending}><Save size={16} /> Guardar</button></div>
        </form>
      </Modal>
    </>
  );
}

function RoutineSettings({ routine, assignments, clients, onSave, pending }: {
  routine: { nombre: string; descripcion?: string | null; nivel: string };
  assignments: Array<{ cliente_id: string }>;
  clients: Array<{ id: string; nombre: string; apellido: string }>;
  onSave: (payload: { nombre: string; descripcion: string; nivel: string; clientIds: string[] }) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState({ nombre: routine.nombre, descripcion: routine.descripcion ?? "", nivel: routine.nivel, clientIds: assignments.map((item) => item.cliente_id) });
  return <form className="card form-grid" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
    <div className="field"><label>Nombre</label><input className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
    <div className="field"><label>Nivel</label><select className="select" value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}><option>principiante</option><option>intermedio</option><option>avanzado</option></select></div>
    <div className="field full"><label>Descripción</label><textarea className="textarea" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
    <div className="field full"><label>Clientes asignados</label><div className="chips">{clients.map((client) => { const selected = form.clientIds.includes(client.id); return <button type="button" key={client.id} className={`chip ${selected ? "selected" : ""}`} onClick={() => setForm({ ...form, clientIds: selected ? form.clientIds.filter((id) => id !== client.id) : [...form.clientIds, client.id] })}>{client.nombre} {client.apellido}</button>; })}</div></div>
    <div className="actions full" style={{ justifyContent: "flex-end" }}><button className="btn btn-primary" disabled={pending}><Save size={16} /> Guardar cambios</button></div>
  </form>;
}
