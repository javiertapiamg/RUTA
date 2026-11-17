/* RUTA · la app avisa al bot cuando agendas algo o pasa algo importante */
import { db, send, esc, parts, pad, URG, humanDay, authUser, json } from "../lib/ruta.mjs";

export const config = { path: "/api/aviso" };

const fmtMoney = (n, c) => c === "USD" ? "US$" + Number(n).toLocaleString("es-CL", { maximumFractionDigits: 2 }) : "$" + Number(n).toLocaleString("es-CL", { maximumFractionDigits: 0 });

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false }, 405);
  const u = await authUser(req);
  if (!u) return json({ ok: false }, 401);
  let b; try { b = await req.json(); } catch { return json({ ok: false }, 400); }
  const s = (await db(`settings?select=telegram_chat_id,prefs&user_id=eq.${u.id}`))[0];
  if (!s || !s.telegram_chat_id || (s.prefs && s.prefs.avisos_app === false)) return json({ ok: true, sent: false });
  const id = String(b.id || "").replace(/[^0-9a-f-]/gi, "");
  let text = null;
  if (b.kind === "task") {
    const t = (await db(`tasks?select=title,starts_at,all_day,urgency&id=eq.${id}&user_id=eq.${u.id}`))[0];
    if (t) {
      const p = parts(new Date(t.starts_at));
      text = `📌 Agendado: <b>${esc(t.title)}</b>\n${humanDay(p)}${t.all_day ? "" : ` · ${pad(p.h)}:${pad(p.mi)}`} · ${URG[t.urgency]}`;
    }
  } else if (b.kind === "job") {
    const j = (await db(`jobs?select=client,project,amount,currency,status&id=eq.${id}&user_id=eq.${u.id}`))[0];
    if (j && j.status === "pagado") text = `💰 Pagada: <b>${esc(j.client)}</b> — ${esc(j.project)}${+j.amount > 0 ? "\n" + fmtMoney(j.amount, j.currency || "CLP") + " anotado como ingreso" : ""}`;
  } else if (b.kind === "goal") {
    const g = (await db(`goals?select=title,kind,done&id=eq.${id}&user_id=eq.${u.id}`))[0];
    if (g && g.done) text = g.kind === "macro" ? `🏔️ <b>Lograste un sueño:</b> ${esc(g.title)}` : `✨ Paso cumplido: <b>${esc(g.title)}</b>`;
  }
  if (!text) return json({ ok: true, sent: false });
  await send(s.telegram_chat_id, text);
  return json({ ok: true, sent: true });
};
