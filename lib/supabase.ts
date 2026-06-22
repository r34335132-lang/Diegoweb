import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Función auxiliar para obtener la URL pública de un archivo multimedia
export const getMediaUrl = (path: string | null | undefined) => {
  if (!path) return "";
  
  // Mantiene compatibilidad con las URLs viejas completas que ya tenías guardadas
  if (path.startsWith("http")) return path; 
  
  // Convierte el path (ej. "images/123.jpg") en una URL pública válida
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
};
