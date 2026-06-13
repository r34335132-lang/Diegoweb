import { supabase } from "@/lib/supabase";
import type { CatalogExercise, ClientProfile, Exercise, Message, ProgressEntry, Routine } from "@/lib/types";

export async function getClients(trainerId: string) {
  const [{ data: clients, error }, { data: invitations, error: invitationError }] = await Promise.all([
    supabase.from("perfiles").select("*").eq("rol", "cliente").eq("entrenador_id", trainerId).order("nombre"),
    supabase.from("invitaciones").select("*").eq("entrenador_id", trainerId).eq("estado", "pendiente"),
  ]);
  if (error) throw error;
  if (invitationError) throw invitationError;
  return {
    clients: (clients ?? []) as ClientProfile[],
    invitations: invitations ?? [],
  };
}

export async function getRoutines(trainerId: string) {
  const { data, error } = await supabase
    .from("rutinas")
    .select("*, rutina_clientes(cliente_id, perfiles:cliente_id(nombre, apellido))")
    .eq("entrenador_id", trainerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Routine[];
}

export async function getCatalog(trainerId: string) {
  const { data, error } = await supabase
    .from("catalogo_ejercicios")
    .select("*")
    .eq("entrenador_id", trainerId)
    .order("categoria")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as CatalogExercise[];
}

export async function getRoutine(id: string, trainerId: string) {
  const [{ data: routine, error }, { data: assignments }, { data: exercises, error: exerciseError }] = await Promise.all([
    supabase.from("rutinas").select("*").eq("id", id).eq("entrenador_id", trainerId).single(),
    supabase.from("rutina_clientes").select("cliente_id, perfiles:cliente_id(nombre, apellido)").eq("rutina_id", id),
    supabase.from("ejercicios").select("*").eq("rutina_id", id).order("orden"),
  ]);
  if (error) throw error;
  if (exerciseError) throw exerciseError;
  return { routine: routine as Routine, assignments: assignments ?? [], exercises: (exercises ?? []) as Exercise[] };
}

export async function getProgress(trainerId: string, clientId?: string) {
  let query = supabase.from("progreso").select("*").eq("entrenador_id", trainerId).order("fecha", { ascending: true });
  if (clientId) query = query.eq("cliente_id", clientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProgressEntry[];
}

export async function getSessions(trainerId: string) {
  const { data: routines, error: routineError } = await supabase.from("rutinas").select("id").eq("entrenador_id", trainerId);
  if (routineError) throw routineError;
  const ids = (routines ?? []).map((routine) => routine.id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("sesiones_entrenamiento")
    .select("*, perfiles:cliente_id(nombre, apellido), rutinas:rutina_id(nombre, nivel)")
    .in("rutina_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMessages(userId: string, otherId: string) {
  await supabase.from("mensajes").update({ leido: true }).eq("emisor_id", otherId).eq("receptor_id", userId).eq("leido", false);
  const { data, error } = await supabase
    .from("mensajes").select("*")
    .or(`and(emisor_id.eq.${userId},receptor_id.eq.${otherId}),and(emisor_id.eq.${otherId},receptor_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}
