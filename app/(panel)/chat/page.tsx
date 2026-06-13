"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, MessageSquare, Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Empty, Initials, PageHeader } from "@/components/ui";
import { getClients, getMessages } from "@/lib/data";
import { supabase } from "@/lib/supabase";

export default function ChatPage() {
  const { profile } = useAuth();
  const params = useSearchParams();
  const userId = profile!.id;
  const qc = useQueryClient();
  const clients = useQuery({ queryKey: ["clients", userId], queryFn: () => getClients(userId) });
  const [selected, setSelected] = useState(params.get("cliente") ?? "");
  const selectedId = selected || clients.data?.clients[0]?.id || "";
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messages = useQuery({ queryKey: ["messages", userId, selectedId], queryFn: () => getMessages(userId, selectedId), enabled: !!selectedId });
  const current = clients.data?.clients.find((client) => client.id === selectedId);

  const send = useMutation({
    mutationFn: async (payload: { texto?: string; media_url?: string; tipo?: string }) => {
      const { error } = await supabase.from("mensajes").insert({ emisor_id: userId, receptor_id: selectedId, texto: payload.texto || null, tipo: payload.tipo || "texto", media_url: payload.media_url || null });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["messages", userId, selectedId] }); },
  });

  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase.channel(`coach-chat-${userId}-${selectedId}`).on("postgres_changes", { event: "*", schema: "public", table: "mensajes" }, (payload) => {
      const row = (payload.new || payload.old) as { emisor_id?: string; receptor_id?: string };
      if ((row.emisor_id === userId && row.receptor_id === selectedId) || (row.emisor_id === selectedId && row.receptor_id === userId)) {
        qc.invalidateQueries({ queryKey: ["messages", userId, selectedId] });
        if (row.emisor_id === selectedId) void supabase.from("mensajes").update({ leido: true }).eq("receptor_id", userId).eq("emisor_id", selectedId);
      }
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, selectedId, qc]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.data]);

  return <>
    <PageHeader title="Chat" subtitle="Conversaciones en tiempo real con tus clientes." />
    <div className="chat-layout">
      <aside className="conversation-list">
        {clients.data?.clients.map((client) => {
          const name = `${client.nombre} ${client.apellido}`;
          return <button key={client.id} className={`conversation ${selectedId === client.id ? "active" : ""}`} style={{ width: "100%", color: "inherit", textAlign: "left", borderTop: 0, borderLeft: 0, borderRight: 0 }} onClick={() => setSelected(client.id)}><Initials name={name} image={client.avatar_url} /><div><strong>{name}</strong><div className="dim" style={{ fontSize: 12, marginTop: 3 }}>{client.email}</div></div></button>;
        })}
      </aside>
      <section className="chat-window">
        {!current ? <div style={{ gridRow: "1/-1", alignSelf: "center" }}><Empty icon={<MessageSquare size={36} />} text="Selecciona un cliente para conversar." /></div> :
          <>
            <header className="chat-header"><div className="person"><Initials name={`${current.nombre} ${current.apellido}`} image={current.avatar_url} /><div>{current.nombre} {current.apellido}<div className="dim" style={{ fontSize: 11 }}>Cliente</div></div></div></header>
            <div className="messages">
              {!messages.data?.length ? <Empty icon={<MessageSquare size={30} />} text="Inicia la conversación." /> : messages.data.map((message) => <div className={`message ${message.emisor_id === userId ? "me" : ""}`} key={message.id}>
                {message.media_url && message.tipo === "imagen" ? <img src={message.media_url} alt="" style={{ maxWidth: "100%", borderRadius: 10 }} /> : null}
                {message.media_url && message.tipo === "video" ? <video src={message.media_url} controls style={{ maxWidth: "100%", borderRadius: 10 }} /> : null}
                {message.texto}<time>{new Date(message.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</time>
              </div>)}<div ref={bottomRef} />
            </div>
            <form className="chat-input" onSubmit={(event) => { event.preventDefault(); if (text.trim()) send.mutate({ texto: text.trim() }); }}>
              <button type="button" className="btn btn-secondary btn-icon" title="Enviar media por URL" onClick={() => { const url = prompt("URL de imagen o video"); if (url) send.mutate({ media_url: url, tipo: /\.(mp4|mov|webm)$/i.test(url) ? "video" : "imagen" }); }}><ImageIcon size={17} /></button>
              <input className="input" placeholder="Escribe un mensaje..." value={text} onChange={(e) => setText(e.target.value)} />
              <button className="btn btn-primary btn-icon" disabled={!text.trim() || send.isPending}><Send size={17} /></button>
            </form>
          </>}
      </section>
    </div>
  </>;
}
