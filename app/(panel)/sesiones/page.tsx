"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty, Initials, PageHeader } from "@/components/ui";
import { getClients, getRoutines, getSessions } from "@/lib/data";

export default function SessionsPage() {
  const { profile } = useAuth();
  const id = profile!.id;
  const [search, setSearch] = useState("");
  const [routineId, setRoutineId] = useState("");
  const [date, setDate] = useState("");
  const sessions = useQuery({ queryKey: ["sessions", id], queryFn: () => getSessions(id) });
  const routines = useQuery({ queryKey: ["routines", id], queryFn: () => getRoutines(id) });
  useQuery({ queryKey: ["clients", id], queryFn: () => getClients(id) });
  const filtered = useMemo(() => (sessions.data ?? []).filter((session) => {
    const name = `${session.perfiles?.nombre ?? ""} ${session.perfiles?.apellido ?? ""}`.toLowerCase();
    return name.includes(search.toLowerCase()) && (!routineId || session.rutina_id === routineId) && (!date || session.created_at?.startsWith(date));
  }), [sessions.data, search, routineId, date]);
  const average = filtered.length ? Math.round(filtered.reduce((total, session) => total + (session.total_ejercicios ? session.ejercicios_completados / session.total_ejercicios * 100 : 0), 0) / filtered.length) : 0;

  return <>
    <PageHeader title="Sesiones" subtitle="Historial de actividad y cumplimiento de entrenamientos." />
    <div className="grid stats" style={{ marginBottom: 24 }}>
      <div className="card stat-card"><span className="icon-box"><Activity size={18} /></span><div className="stat-value">{filtered.length}</div><div className="stat-label">Sesiones encontradas</div></div>
      <div className="card stat-card" style={{ "--accent": "#22c55e" } as React.CSSProperties}><span className="icon-box"><Activity size={18} /></span><div className="stat-value">{average}%</div><div className="stat-label">Cumplimiento promedio</div></div>
    </div>
    <div className="page-head" style={{ marginBottom: 18 }}>
      <div className="search"><Search size={17} /><input className="input" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="actions"><select className="select" style={{ width: 190 }} value={routineId} onChange={(e) => setRoutineId(e.target.value)}><option value="">Todas las rutinas</option>{routines.data?.map((routine) => <option value={routine.id} key={routine.id}>{routine.nombre}</option>)}</select><input className="input" type="date" style={{ width: 170 }} value={date} onChange={(e) => setDate(e.target.value)} /></div>
    </div>
    {!filtered.length ? <div className="card"><Empty icon={<Activity size={34} />} text="No hay sesiones para estos filtros." /></div> :
      <div className="table-wrap"><table className="table"><thead><tr><th>Cliente</th><th>Rutina</th><th>Duración</th><th>Ejercicios</th><th>Cumplimiento</th><th>Fecha</th></tr></thead><tbody>{filtered.map((session) => {
        const name = `${session.perfiles?.nombre ?? ""} ${session.perfiles?.apellido ?? ""}`;
        const pct = session.total_ejercicios ? Math.round(session.ejercicios_completados / session.total_ejercicios * 100) : 0;
        return <tr key={session.id}><td><div className="person"><Initials name={name} /><strong>{name}</strong></div></td><td>{session.rutinas?.nombre}<div className="dim" style={{ fontSize: 11 }}>{session.rutinas?.nivel}</div></td><td>{Math.floor((session.duracion_segundos ?? 0) / 60)} min</td><td>{session.ejercicios_completados}/{session.total_ejercicios}</td><td><span className="badge" style={{ "--badge-color": pct === 100 ? "#22c55e" : "#f97316" } as React.CSSProperties}>{pct}%</span></td><td className="muted">{new Date(session.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}</td></tr>;
      })}</tbody></table></div>}
  </>;
}
