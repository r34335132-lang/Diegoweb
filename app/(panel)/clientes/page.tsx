"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Search, UserPlus, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty, Initials, Modal, PageHeader } from "@/components/ui";
import { getClients } from "@/lib/data";
import { supabase } from "@/lib/supabase";

export default function ClientsPage() {
  const { profile } = useAuth();
  const params = useSearchParams();
  const qc = useQueryClient();
  const id = profile!.id;
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(params.get("invitar") === "1");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["clients", id], queryFn: () => getClients(id) });

  const invite = useMutation({
    mutationFn: async () => {
      const normalized = email.trim().toLowerCase();
      const { data: existing } = await supabase.from("perfiles").select("id, entrenador_id, rol").eq("email", normalized).maybeSingle();
      if (existing?.rol === "cliente") {
        if (existing.entrenador_id && existing.entrenador_id !== id) throw new Error("Este cliente ya está vinculado con otro entrenador.");
        const { error } = await supabase.from("perfiles").update({ entrenador_id: id, estado: "activo" }).eq("id", existing.id);
        if (error) throw error;
        return;
      }
      const { data: pending } = await supabase.from("invitaciones").select("id").eq("email", normalized).eq("entrenador_id", id).eq("estado", "pendiente").maybeSingle();
      if (pending) throw new Error("Ya existe una invitación pendiente para este correo.");
      const { error } = await supabase.from("invitaciones").insert({ email: normalized, entrenador_id: id, estado: "pendiente" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["clients", id] });
      setEmail(""); setError(""); setInviteOpen(false);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "No se pudo invitar al cliente."),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ clientId, next }: { clientId: string; next: string }) => {
      const { error } = await supabase.from("perfiles").update({ estado: next }).eq("id", clientId).eq("entrenador_id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients", id] }),
  });

  const filtered = useMemo(() => (query.data?.clients ?? []).filter((client) =>
    `${client.nombre} ${client.apellido} ${client.email}`.toLowerCase().includes(search.toLowerCase())
  ), [query.data, search]);

  return (
    <>
      <PageHeader title="Clientes" subtitle={`${query.data?.clients.length ?? 0} clientes vinculados y ${query.data?.invitations.length ?? 0} invitaciones pendientes.`}>
        <button className="btn btn-primary" onClick={() => setInviteOpen(true)}><UserPlus size={17} /> Invitar cliente</button>
      </PageHeader>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div className="search"><Search size={17} /><input className="input" placeholder="Buscar por nombre o correo..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </div>
      {!filtered.length && !query.isLoading ? <div className="card"><Empty icon={<Users size={34} />} text="No hay clientes que coincidan con la búsqueda." /></div> :
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Cliente</th><th>Correo</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map((client) => {
                const active = client.estado !== "inactivo";
                return <tr key={client.id}><td><div className="person"><Initials name={`${client.nombre} ${client.apellido}`} image={client.avatar_url} /><strong>{client.nombre} {client.apellido}</strong></div></td><td className="muted">{client.email}</td><td><span className="badge" style={{ "--badge-color": active ? "#22c55e" : "#71717a" } as React.CSSProperties}>{active ? "Activo" : "Inactivo"}</span></td><td><div className="actions"><button className="btn btn-secondary" onClick={() => toggleStatus.mutate({ clientId: client.id, next: active ? "inactivo" : "activo" })}>{active ? "Desactivar" : "Activar"}</button><a className="btn btn-secondary" href={`/chat?cliente=${client.id}`}>Chat</a></div></td></tr>;
              })}
              {(query.data?.invitations ?? []).filter((item) => item.email?.toLowerCase().includes(search.toLowerCase())).map((invitation) =>
                <tr key={invitation.id}><td><div className="person"><span className="avatar"><Mail size={15} /></span><strong>Invitación pendiente</strong></div></td><td className="muted">{invitation.email}</td><td><span className="badge" style={{ "--badge-color": "#f97316" } as React.CSSProperties}>Pendiente</span></td><td>—</td></tr>
              )}
            </tbody>
          </table>
        </div>}
      <Modal open={inviteOpen} title="Invitar cliente" onClose={() => setInviteOpen(false)}>
        <form className="grid" onSubmit={(event) => { event.preventDefault(); invite.mutate(); }}>
          <p className="muted" style={{ marginTop: 0 }}>Si el correo ya pertenece a un cliente sin entrenador, se vinculará directamente. En otro caso se guardará una invitación.</p>
          {error ? <div className="error">{error}</div> : null}
          <div className="field"><label>Correo electrónico</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="actions" style={{ justifyContent: "flex-end" }}><button type="button" className="btn btn-secondary" onClick={() => setInviteOpen(false)}>Cancelar</button><button className="btn btn-primary" disabled={invite.isPending}>{invite.isPending ? "Enviando..." : "Crear invitación"}</button></div>
        </form>
      </Modal>
    </>
  );
}
