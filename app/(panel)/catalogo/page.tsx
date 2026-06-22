"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ImageIcon, Plus, Save, Search, Trash2, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty, Modal, PageHeader } from "@/components/ui";
import { getCatalog } from "@/lib/data";
import { supabase, getMediaUrl } from "@/lib/supabase"; // <-- MODIFICACIÓN 1: Importamos getMediaUrl

const categories = ["Todas", "Pierna", "Pecho", "Espalda", "Brazo", "Hombro", "Core", "Cardio", "Full Body", "General"];
const emptyForm = { nombre: "", categoria: "General", descripcion: "", imagen_url: "", video_url: "" };

export default function CatalogPage() {
  const { profile } = useAuth();
  const id = profile!.id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["catalog", id],
    queryFn: () => getCatalog(id),
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("catalogo_ejercicios").insert({
        entrenador_id: id,
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        descripcion: form.descripcion.trim() || null,
        imagen_url: form.imagen_url.trim() || null,
        video_url: form.video_url.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["catalog", id] });
      setOpen(false);
      setForm(emptyForm);
      setError("");
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "No se pudo crear el ejercicio."),
  });

  const remove = useMutation({
    mutationFn: async (exerciseId: string) => {
      if (!confirm("¿Eliminar este ejercicio del catálogo?")) return;
      const { error } = await supabase.from("catalogo_ejercicios").delete().eq("id", exerciseId).eq("entrenador_id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog", id] }),
  });

  const filtered = useMemo(
    () => (query.data ?? []).filter((item) =>
      (category === "Todas" || item.categoria === category) &&
      item.nombre.toLowerCase().includes(search.toLowerCase())
    ),
    [query.data, category, search],
  );

  return (
    <>
      <PageHeader title="Catálogo" subtitle="Tu biblioteca reutilizable de ejercicios.">
        <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={17} /> Nuevo ejercicio</button>
      </PageHeader>
      <div className="page-head" style={{ marginBottom: 18 }}>
        <div className="search"><Search size={17} /><input className="input" placeholder="Buscar ejercicio..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <select className="select" style={{ width: 190 }} value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {!filtered.length ? (
        <div className="card"><Empty icon={<BookOpen size={34} />} text="No hay ejercicios en esta categoría." /></div>
      ) : (
        <div className="grid routine-grid">
          {filtered.map((item) => (
            <article className="card routine-card" key={item.id}>
              <div className="section-head">
                <span className="badge">{item.categoria}</span>
                <button className="btn btn-danger btn-icon" onClick={() => remove.mutate(item.id)} aria-label={`Eliminar ${item.nombre}`}><Trash2 size={16} /></button>
              </div>
              <h3>{item.nombre}</h3>
              <p className="muted">{item.descripcion || "Sin descripción"}</p>
              
              {/* MODIFICACIÓN 2: Usamos getMediaUrl para convertir el path en URL */}
              {item.imagen_url ? <img className="media-preview" src={getMediaUrl(item.imagen_url)} alt={item.nombre} /> : null}
              {/* Si quieres mostrar video en el catálogo, puedes agregarlo así: */}
              {item.video_url ? <video className="media-preview" src={getMediaUrl(item.video_url)} controls /> : null}

            </article>
          ))}
        </div>
      )}
      <Modal open={open} title="Nuevo ejercicio de catálogo" onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
          {error ? <div className="error full">{error}</div> : null}
          <div className="field full"><label>Nombre</label><input className="input" value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} required /></div>
          <div className="field full"><label>Categoría</label><select className="select" value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value })}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="field full"><label>Descripción</label><textarea className="textarea" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /></div>
          
          {/* MODIFICACIÓN 3: Cambiamos type="url" por type="text" */}
          <div className="field full"><label><ImageIcon size={13} /> URL o Path de imagen</label><input className="input" type="text" value={form.imagen_url} onChange={(event) => setForm({ ...form, imagen_url: event.target.value })} /></div>
          <div className="field full"><label><Video size={13} /> URL o Path de video</label><input className="input" type="text" value={form.video_url} onChange={(event) => setForm({ ...form, video_url: event.target.value })} /></div>
          
          <div className="actions full" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" disabled={create.isPending}><Save size={16} /> {create.isPending ? "Guardando..." : "Guardar ejercicio"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
