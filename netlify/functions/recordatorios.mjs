/* RUTA · recordatorios: cada 15 min avisa por Telegram las tareas con hora que vienen en la próxima hora */
import { db, q, send, esc, parts, pad, URG } from "../lib/ruta.mjs";

export const config = { schedule: "*/15 * * * *" };

export default async () => {
  const now = Date.now();
  const from = new Date(now - 5 * 60e3).toISOString(), to = new Date(now + 60 * 60e3).toISOString();
  let rows;
  try {
    rows = await db(`tasks?select=id,user_id,title,starts_at,urgency&done=is.false&all_day=is.false&reminded=is.false` +
                    `&starts_at=gte.${q(from)}&starts_at=lte.${q(to)}&limit=50`);
  } catch (e) { console.error("recordatorios", e); return new Response("sin columna reminded"); }
  if (!rows.length) return new Response("nada");
  const users = [...new Set(rows.map(r => r.user_id))];
  const sets = await db(`settings?select=user_id,telegram_chat_id,prefs&user_id=in.(${users.join(",")})&telegram_chat_id=not.is.null`);
  const chat = {}; sets.forEach(s => { if (!(s.prefs && s.prefs.recordatorios === false)) chat[s.user_id] = s.telegram_chat_id; });
  for (const r of rows) {
    if (!chat[r.user_id]) continue;
    const at = new Date(r.starts_at), p = parts(at), min = Math.max(0, Math.round((at - now) / 60e3));
    const cuando = min <= 2 ? "ahora" : `en ${min} min`;
    try {
      await send(chat[r.user_id], `⏰ <b>${esc(r.title)}</b>\n${cuando} · ${pad(p.h)}:${pad(p.mi)}${r.urgency >= 2 ? " · " + URG[r.urgency] : ""}`);
      await db(`tasks?id=eq.${r.id}`, { method: "PATCH", body: { reminded: true } });
    } catch (e) { console.error("recordatorio", r.id, e); }
  }
  return new Response("ok");
};
