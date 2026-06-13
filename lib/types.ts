export type TrainerProfile = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: "entrenador" | "cliente";
  avatar_url?: string | null;
};

export type ClientProfile = TrainerProfile & {
  entrenador_id: string;
  estado?: "activo" | "inactivo" | null;
};

export type Routine = {
  id: string;
  entrenador_id: string;
  nombre: string;
  descripcion?: string | null;
  nivel: string;
  created_at: string;
  rutina_clientes?: Array<{
    cliente_id: string;
    perfiles?: { nombre?: string; apellido?: string } | null;
  }>;
};

export type Exercise = {
  id: string;
  rutina_id: string;
  nombre: string;
  descripcion?: string | null;
  series: number;
  repeticiones: string;
  peso?: string | null;
  descanso?: string | null;
  imagen_url?: string | null;
  video_url?: string | null;
  grupo_serie?: string | null;
  orden: number;
};

export type CatalogExercise = {
  id: string;
  entrenador_id: string;
  nombre: string;
  categoria: string;
  descripcion?: string | null;
  imagen_url?: string | null;
  video_url?: string | null;
  created_at?: string;
};

export type ProgressEntry = {
  id: string;
  cliente_id: string;
  entrenador_id: string;
  fecha: string;
  genero?: string | null;
  grasa_corporal?: number | null;
  masa_muscular?: number | null;
  cintura?: number | null;
  brazo?: number | null;
  cadera?: number | null;
  muslo?: number | null;
  notas?: string | null;
  foto_url?: string | null;
};

export type Message = {
  id: string;
  emisor_id: string;
  receptor_id: string;
  texto?: string | null;
  tipo: string;
  media_url?: string | null;
  leido: boolean;
  created_at: string;
};
