/* RUTA · aviso de la mañana: a las 8:00 de Santiago manda tu día por Telegram */
import { db, send, today, daySummary } from "../lib/ruta.mjs";

export const config = { schedule: "@hourly" };

const SALUDO = ["Buen día ☀️", "Arriba ☀️", "Un día más de ruta ☀️"];

export default async () => {
  const t = today();
  if (t.h !== 8) return new Response("fuera de hora");
  const users = await db("settings?select=user_id,telegram_chat_id,prefs&telegram_chat_id=not.is.null");
  for (const u of users) {
    if (u.prefs && u.prefs.aviso_manana === false) continue;
    try {
      const body = await daySummary(u.user_id);
      await send(u.telegram_chat_id, `${SALUDO[t.d % SALUDO.length]}\n\n${body}`);
    } catch (e) { console.error("aviso", u.user_id, e); }
  }
  return new Response("ok");
};
