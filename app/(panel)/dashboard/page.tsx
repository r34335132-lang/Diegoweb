"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, Dumbbell, MessageSquare, Plus, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Empty, Initials, PageHeader } from "@/components/ui";
import { getClients, getProgress, getRoutines, getSessions } from "@/lib/data";
import { supabase } from "@/lib/supabase";

export default function DashboardPage() {
  const { profile } = useAuth();
  const id = profile!.id;
  const clients = useQuery({ queryKey: ["clients", id], queryFn: () => getClients(id) });
  const routines = useQuery({ queryKey: ["routines", id], queryFn: () => getRoutines(id) });
  const sessions = useQuery({ queryKey: ["sessions", id], queryFn: () => getSessions(id) });
  const progress = useQuery({ queryKey: ["progress", id], queryFn: () => getProgress(id) });
  const unread = useQuery({
    queryKey: ["unread", id],
    queryFn: async () => {
      const { count, error } = await supabase.from("mensajes").select("id", { count: "exact", head: true }).eq("receptor_id", id).eq("leido", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = [
    { label: "Clientes activos", value: clients.data?.clients.filter((c) => c.estado !== "inactivo").length ?? 0, icon: Users, color: "#3b82f6" },
    { label: "Invitaciones pendientes", value: clients.data?.invitations.length ?? 0, icon: UserPlus, color: "#f97316" },
    { label: "Rutinas creadas", value: routines.data?.length ?? 0, icon: Dumbbell, color: "#c9f93e" },
    { label: "Mensajes sin leer", value: unread.data ?? 0, icon: MessageSquare, color: "#a855f7" },
  ];

  const quick = [
    { href: "/rutinas?crear=1", label: "Crear rutina", icon: Plus },
    { href: "/clientes?invitar=1", label: "Invitar cliente", icon: UserPlus },
    { href: "/chat", label: "Abrir chat", icon: MessageSquare },
    { href: "/progreso?crear=1", label: "Registrar progreso", icon: BarChart3 },
  ];

  return (
    <>
      <PageHeader title={`Hola, ${profile?.nombre}`} subtitle="Aquí tienes una vista rápida del rendimiento de tus clientes." />
      <div className="grid stats">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div className="card stat-card" key={label} style={{ "--accent": color } as React.CSSProperties}>
            <span className="icon-box"><Icon size={19} /></span><div className="stat-value">{value}</div><div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <section style={{ marginTop: 28 }}>
        <div className="section-head"><h2 className="section-title">Acciones rápidas</h2></div>
        <div className="grid quick-grid">
          {quick.map(({ href, label, icon: Icon }) => <Link href={href} key={label} className="card quick-action"><span className="icon-box"><Icon size={18} /></span><strong>{label}</strong></Link>)}
        </div>
      </section>

      <div className="grid two-col" style={{ marginTop: 28 }}>
        <section className="card">
          <div className="section-head"><h2 className="section-title">Actividad reciente</h2><Link className="muted" href="/sesiones">Ver todo</Link></div>
          {!sessions.data?.length ? <Empty icon={<Activity size={30} />} text="Aún no hay sesiones registradas." /> :
            <div className="list">{sessions.data.slice(0, 5).map((session) => {
              const mins = Math.floor((session.duracion_segundos ?? 0) / 60);
              const pct = session.total_ejercicios ? Math.round((session.ejercicios_completados / session.total_ejercicios) * 100) : 0;
              return <div className="list-row" key={session.id}><div className="person"><Initials name={`${session.perfiles?.nombre} ${session.perfiles?.apellido}`} /><div><strong>{session.perfiles?.nombre} {session.perfiles?.apellido}</strong><div className="dim" style={{ fontSize: 12 }}>{session.rutinas?.nombre} · {mins} min</div></div></div><span className="badge" style={{ "--badge-color": pct === 100 ? "#22c55e" : "#f97316" } as React.CSSProperties}>{pct}%</span></div>;
            })}</div>}
        </section>
        <section className="card">
          <div className="section-head"><h2 className="section-title">Últimos progresos</h2><Link className="muted" href="/progreso">Ver todo</Link></div>
          {!progress.data?.length ? <Empty icon={<BarChart3 size={30} />} text="Aún no hay mediciones registradas." /> :
            <div className="list">{progress.data.slice(-5).reverse().map((entry) => {
              const client = clients.data?.clients.find((item) => item.id === entry.cliente_id);
              return <div className="list-row" key={entry.id}><div><strong>{client ? `${client.nombre} ${client.apellido}` : "Cliente"}</strong><div className="dim" style={{ fontSize: 12 }}>{entry.fecha}</div></div><div style={{ textAlign: "right" }}><strong>{entry.grasa_corporal ?? "—"}%</strong><div className="dim" style={{ fontSize: 11 }}>grasa corporal</div></div></div>;
            })}</div>}
        </section>
      </div>
    </>
  );
}
