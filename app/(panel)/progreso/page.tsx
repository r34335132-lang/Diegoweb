"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/components/auth-provider";
import { Empty, Modal, PageHeader } from "@/components/ui";
import { getClients, getProgress } from "@/lib/data";
import { supabase } from "@/lib/supabase";

const emptyForm = { fecha: new Date().toISOString().slice(0, 10), genero: "mujer", grasa_corporal: "", masa_muscular: "", cintura: "", brazo: "", cadera: "", muslo: "", notas: "", foto_url: "" };

export default function ProgressPage() {
  const { profile } = useAuth();
  const params = useSearchParams();
  const trainerId = profile!.id;
  const qc = useQueryClient();
  const clients = useQuery({ queryKey: ["clients", trainerId], queryFn: () => getClients(trainerId) });
  const [clientId, setClientId] = useState("");
  const selectedId = clientId || clients.data?.clients[0]?.id || "";
  const progress = useQuery({ queryKey: ["progress", trainerId, selectedId], queryFn: () => getProgress(trainerId, selectedId), enabled: !!selectedId });
  const [open, setOpen] = useState(params.get("crear") === "1");
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error("Selecciona un cliente.");
      const numberOrNull = (value: string) => value ? Number(value) : null;
      const { error } = await supabase.from("progreso").insert({
        cliente_id: selectedId, entrenador_id: trainerId, fecha: form.fecha, genero: form.genero,
        grasa_corporal: numberOrNull(form.grasa_corporal), masa_muscular: numberOrNull(form.masa_muscular),
        cintura: numberOrNull(form.cintura), brazo: form.genero === "hombre" ? numberOrNull(form.brazo) : null,
        cadera: form.genero === "mujer" ? numberOrNull(form.cadera) : null, muslo: form.genero === "mujer" ? numberOrNull(form.muslo) : null,
        notas: form.notas || null, foto_url: form.foto_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["progress", trainerId, selectedId] }); setOpen(false); setForm(emptyForm); setError(""); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "No se pudo guardar."),
  });
  const remove = useMutation({
    mutationFn: async (entryId: string) => {
      if (!confirm("¿Eliminar este registro de progreso?")) return;
      const { error } = await supabase.from("progreso").delete().eq("id", entryId).eq("entrenador_id", trainerId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress", trainerId, selectedId] }),
  });

  return <>
    <PageHeader title="Progreso" subtitle="Métricas, evolución y fotografías de tus clientes."><button className="btn btn-primary" disabled={!selectedId} onClick={() => setOpen(true)}><Plus size={17} /> Nuevo registro</button></PageHeader>
    <div className="field" style={{ maxWidth: 350, marginBottom: 22 }}><label>Cliente</label><select className="select" value={selectedId} onChange={(e) => setClientId(e.target.value)}><option value="">Selecciona un cliente</option>{clients.data?.clients.map((client) => <option value={client.id} key={client.id}>{client.nombre} {client.apellido}</option>)}</select></div>
    {!selectedId ? <div className="card"><Empty icon={<BarChart3 size={34} />} text="Agrega o selecciona un cliente para consultar su progreso." /></div> :
      <>
        <div className="card" style={{ height: 350 }}>
          <div className="section-head"><h2 className="section-title">Evolución</h2></div>
          <ResponsiveContainer width="100%" height="88%">
            <LineChart data={progress.data ?? []}><CartesianGrid stroke="#27272a" strokeDasharray="3 3" /><XAxis dataKey="fecha" stroke="#71717a" fontSize={11} /><YAxis stroke="#71717a" fontSize={11} /><Tooltip contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 10 }} /><Legend /><Line type="monotone" dataKey="grasa_corporal" name="Grasa %" stroke="#f97316" strokeWidth={2} /><Line type="monotone" dataKey="masa_muscular" name="Músculo %" stroke="#c9f93e" strokeWidth={2} /><Line type="monotone" dataKey="cintura" name="Cintura cm" stroke="#3b82f6" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </div>
        <section style={{ marginTop: 25 }}><div className="section-head"><h2 className="section-title">Historial</h2></div>
          {!progress.data?.length ? <div className="card"><Empty icon={<BarChart3 size={34} />} text="Este cliente aún no tiene registros." /></div> :
            <div className="grid routine-grid">{[...progress.data].reverse().map((entry) => <article className="card" key={entry.id}>
              <div className="section-head"><div><strong>{entry.fecha}</strong><div className="dim" style={{ fontSize: 12, marginTop: 3 }}>{entry.genero}</div></div><button className="btn btn-danger btn-icon" onClick={() => remove.mutate(entry.id)}><Trash2 size={16} /></button></div>
              <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                <Metric label="Grasa" value={entry.grasa_corporal} suffix="%" /><Metric label="Músculo" value={entry.masa_muscular} suffix="%" /><Metric label="Cintura" value={entry.cintura} suffix=" cm" />
              </div>
              {entry.notas ? <p className="muted">{entry.notas}</p> : null}{entry.foto_url ? <img className="media-preview" src={entry.foto_url} alt={`Progreso del ${entry.fecha}`} /> : null}
            </article>)}</div>}
        </section>
      </>}
    <Modal open={open} title="Nuevo registro de progreso" onClose={() => setOpen(false)}>
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        {error ? <div className="error full">{error}</div> : null}
        <div className="field"><label>Fecha</label><input className="input" type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
        <div className="field"><label>Género</label><select className="select" value={form.genero} onChange={(e) => setForm({ ...form, genero: e.target.value })}><option value="mujer">Mujer</option><option value="hombre">Hombre</option></select></div>
        <NumberField label="Grasa corporal (%)" value={form.grasa_corporal} onChange={(value) => setForm({ ...form, grasa_corporal: value })} />
        <NumberField label="Masa muscular (%)" value={form.masa_muscular} onChange={(value) => setForm({ ...form, masa_muscular: value })} />
        <NumberField label="Cintura (cm)" value={form.cintura} onChange={(value) => setForm({ ...form, cintura: value })} />
        {form.genero === "hombre" ? <NumberField label="Brazo (cm)" value={form.brazo} onChange={(value) => setForm({ ...form, brazo: value })} /> : <><NumberField label="Cadera (cm)" value={form.cadera} onChange={(value) => setForm({ ...form, cadera: value })} /><NumberField label="Muslo (cm)" value={form.muslo} onChange={(value) => setForm({ ...form, muslo: value })} /></>}
        <div className="field full"><label>Notas</label><textarea className="textarea" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
        <div className="field full"><label>URL de fotografía</label><input className="input" type="url" value={form.foto_url} onChange={(e) => setForm({ ...form, foto_url: e.target.value })} /></div>
        <div className="actions full" style={{ justifyContent: "flex-end" }}><button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-primary" disabled={create.isPending}>Guardar registro</button></div>
      </form>
    </Modal>
  </>;
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="field"><label>{label}</label><input className="input" type="number" step="0.1" value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
function Metric({ label, value, suffix }: { label: string; value?: number | null; suffix: string }) {
  return <div><strong style={{ fontSize: 20 }}>{value ?? "—"}{value != null ? suffix : ""}</strong><div className="dim" style={{ fontSize: 11 }}>{label}</div></div>;
}
