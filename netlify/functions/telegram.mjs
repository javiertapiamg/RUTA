/* RUTA · bot de Telegram (recibe los mensajes) */
import { db, q, tg, send, esc, parseTask, localToUtc, today, ymd, humanDay, pad, URG, HABITS, daySummary } from "../lib/ruta.mjs";

export const config = { path: "/api/telegram" };

const HELP =
`<b>Así funciono</b>

📌 <b>Tareas</b> — con hora o con + adelante:
<code>mañana 10:00 reunión con Seba</code>
<code>+ pagar la luz el viernes !</code>
<i>! = importante · !! o "urgente" = urgente</i>

✍️ <b>Diario</b> — empieza con "nota":
<code>nota: hoy el paseo con Otto estuvo increíble</code>

Si no me queda claro, te pregunto con dos botones.

<b>Comandos</b>
/hoy — tu día
/paseo /bloque /formacion /ejercicio — marcar hábito`;

export default async (req) => {
  if (req.method !== "POST") return new Response("ok");
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_SECRET)
    return new Response("no", { status: 401 });
  let up;
  try { up = await req.json(); } catch { return new Response("ok"); }
  try {
    if (up.callback_query) await onButton(up.callback_query);
    else if (up.message && typeof up.message.text === "string") await onMessage(up.message);
  } catch (e) {
    console.error(e);
    const chat = (up.message && up.message.chat.id) || (up.callback_query && up.callback_query.message.chat.id);
    if (chat) await send(chat, "Algo falló de mi lado. Intenta de nuevo en un rato.");
  }
  return new Response("ok");
};

async function userByChat(chat) {
  const r = await db(`settings?select=user_id,prefs&telegram_chat_id=eq.${chat}&limit=1`);
  return r[0] || null;
}

async function onMessage(msg) {
  const chat = msg.chat.id, text = msg.text.trim();

  const code = (text.match(/^\/start\s+(\d{6})$/) || text.match(/^(\d{6})$/) || [])[1];
  if (code) return link(chat, code);

  const me = await userByChat(chat);
  if (!me) {
    return send(chat, "Hola 👋 Todavía no estás conectado.\n\nEn tu app RUTA aprieta <b>conectar Telegram</b> y mándame el código de 6 números que te aparece.");
  }
  const uid = me.user_id;

  if (text.startsWith("/")) {
    const cmd = text.slice(1).split(/[\s@]/)[0].toLowerCase();
    if (cmd === "start" || cmd === "ayuda" || cmd === "help") return send(chat, HELP);
    if (cmd === "hoy") return send(chat, await daySummary(uid));
    const hb = HABITS.find(h => h.k === cmd.normalize("NFD").replace(/[̀-ͯ]/g, ""));
    if (hb) return toggleHabit(chat, uid, hb);
    return send(chat, "No conozco ese comando. Escribe /ayuda.");
  }

  if (text.startsWith("+")) return addTask(chat, uid, text.slice(1));
  const note = text.match(/^(nota|diario)\s*[:,\-]?\s*([\s\S]+)$/i);
  if (note) return addJournal(chat, uid, note[2]);

  const p = parseTask(text);
  if (p.time && p.title) return addTask(chat, uid, text);

  const prefs = Object.assign({}, me.prefs || {}, { tg_pending: { text, at: Date.now() } });
  await db(`settings?user_id=eq.${uid}`, { method: "PATCH", body: { prefs } });
  return send(chat, "¿Dónde lo guardo?", {
    reply_markup: { inline_keyboard: [[
      { text: "📌 Tarea", callback_data: "t" },
      { text: "✍️ Diario", callback_data: "d" }
    ]] }
  });
}

async function onButton(cb) {
  const chat = cb.message.chat.id;
  const me = await userByChat(chat);
  const pend = me && me.prefs && me.prefs.tg_pending;
  await tg("answerCallbackQuery", { callback_query_id: cb.id });
  if (!me || !pend || Date.now() - pend.at > 30 * 60 * 1000) {
    return tg("editMessageText", { chat_id: chat, message_id: cb.message.message_id, text: "Eso ya expiró. Mándamelo de nuevo." });
  }
  const prefs = Object.assign({}, me.prefs); delete prefs.tg_pending;
  await db(`settings?user_id=eq.${me.user_id}`, { method: "PATCH", body: { prefs } });
  await tg("deleteMessage", { chat_id: chat, message_id: cb.message.message_id });
  return cb.data === "t" ? addTask(chat, me.user_id, pend.text) : addJournal(chat, me.user_id, pend.text);
}

async function link(chat, code) {
  const r = await db(`settings?select=user_id,prefs&prefs->>tg_code=eq.${q(code)}&limit=1`);
  const row = r[0];
  if (!row || !row.prefs.tg_code_exp || row.prefs.tg_code_exp < Date.now()) {
    return send(chat, "Ese código no sirve o ya venció. Pide uno nuevo en la app.");
  }
  const prefs = Object.assign({}, row.prefs); delete prefs.tg_code; delete prefs.tg_code_exp;
  await db(`settings?telegram_chat_id=eq.${chat}`, { method: "PATCH", body: { telegram_chat_id: null } });
  await db(`settings?user_id=eq.${row.user_id}`, { method: "PATCH", body: { telegram_chat_id: chat, prefs } });
  await send(chat, "Conectado ✨ Desde ahora lo que me escribas va a tu RUTA.");
  return send(chat, HELP);
}

async function addTask(chat, uid, raw) {
  const p = parseTask(raw);
  if (!p.title) return send(chat, "No entendí qué hay que hacer. Prueba: <code>mañana 10:00 llamar a Seba</code>");
  const at = p.time ? localToUtc(p.day.y, p.day.m, p.day.d, p.time[0], p.time[1]) : localToUtc(p.day.y, p.day.m, p.day.d, 12, 0);
  await db("tasks", { method: "POST", body: {
    user_id: uid, title: p.title, starts_at: at.toISOString(), all_day: !p.time, urgency: p.urg, source: "telegram"
  } });
  const when = humanDay(p.day) + (p.time ? ` · ${pad(p.time[0])}:${pad(p.time[1])}` : "");
  return send(chat, `📌 <b>${esc(p.title)}</b>\n${when} · ${URG[p.urg]}`);
}

async function addJournal(chat, uid, body) {
  await db("journal", { method: "POST", body: { user_id: uid, day: ymd(today()), body: body.trim(), source: "telegram" } });
  return send(chat, "✍️ Anotado en tu diario.");
}

async function toggleHabit(chat, uid, hb) {
  const day = ymd(today());
  const r = await db(`days?select=habits,kind,note&user_id=eq.${uid}&day=eq.${day}`);
  const row = r[0] || { habits: {}, kind: "normal", note: "" };
  const habits = Object.assign({}, row.habits); habits[hb.k] = !habits[hb.k];
  await db("days?on_conflict=user_id,day", {
    method: "POST", prefer: "resolution=merge-duplicates",
    body: { user_id: uid, day, habits, kind: row.kind, note: row.note, updated_at: new Date().toISOString() }
  });
  return send(chat, habits[hb.k] ? `✅ ${hb.n}, listo` : `↩️ ${hb.n}, desmarcado`);
}
