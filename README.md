# DiegoApp Coach Web

Panel web Next.js para entrenadores, conectado al mismo proyecto Supabase de la app Expo.

## Desarrollo

1. Copia `.env.example` como `.env.local`.
2. Configura `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Ejecuta `npm install` y `npm run dev` dentro de `web/`.

## Vercel

Importa el repositorio y configura `web` como **Root Directory**. Agrega las dos variables de entorno anteriores en Project Settings y despliega.

Las políticas RLS de Supabase siguen siendo la capa de seguridad principal. Las consultas del panel también filtran por `entrenador_id` cuando la tabla lo incluye.
