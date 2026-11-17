/* RUTA · bot de Telegram (recibe los mensajes) */
import { db, q, tg, send, esc, parseTask, localToUtc, today, ymd, humanDay, pad, parts, URG, HABITS, daySummary,
  hasClaude, claude, textOf, lifeContext, nowLine, VOZ } from "../lib/ruta.mjs";

export const config = { path: "/api/telegram" };

const HELP =
`<b>Así funciono</b>

📌 <b>Tareas</b> — con hora o con + adelante:
<code>mañana 10:00 reunión con Seba</code>
<code>+ pagar la luz el viernes !</code>
<i>! = importante · !! o "urgente" = urgente</i>

✍️ <b>Diario</b> — empieza con "nota":
<code>nota: hoy el paseo con Otto estuvo increíble</code>

💬 <b>O escríbeme normal</b> — con Claude conectado entiendo cosas como
<code>muéveme lo de Seba al jueves a las 4</code>
<code>gasté 12 lucas en bencina</code>
<code>hoy saqué a Otto y fui al gym</code>

<b>Comandos</b>
/hoy — tu día
/pregunta — una pregunta para tu diario
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
    if (cmd === "pregunta") return hasClaude() ? agent(chat, me, "Hazme una pregunta para mi diario de hoy, solo la pregunta. Cuando te responda, guárdalo en el diario con la pregunta incluida.") : send(chat, "Para esto falta conectar Claude.");
    const hb = HABITS.find(h => h.k === cmd.normalize("NFD").replace(/[̀-ͯ]/g, ""));
    if (hb) return toggleHabit(chat, uid, hb);
    return send(chat, "No conozco ese comando. Escribe /ayuda.");
  }

  if (text.startsWith("+")) return addTask(chat, uid, text.slice(1));
  const note = text.match(/^(nota|diario)\s*[:,\-]?\s*([\s\S]+)$/i);
  if (note) return addJournal(chat, uid, note[2]);

  if (hasClaude()) {
    try { return await agent(chat, me, text); }
    catch (e) { console.error("claude", e); }
  }

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


/* ═════════ Claude: lenguaje natural con acciones ═════════ */
const TOOLS = [
  { name: "crear_tarea", description: "Agenda una tarea o evento.",
    input_schema: { type: "object", properties: {
      titulo: { type: "string" }, fecha: { type: "string", description: "YYYY-MM-DD" },
      hora: { type: "string", description: "HH:MM en 24 h. Omitir si no tiene hora." },
      urgencia: { type: "integer", minimum: 0, maximum: 3, description: "0 tranqui, 1 normal, 2 importante, 3 urgente" } },
      required: ["titulo", "fecha"] } },
  { name: "mover_tarea", description: "Cambia fecha y/o hora de una tarea existente (usa el id del contexto).",
    input_schema: { type: "object", properties: { id: { type: "string" }, fecha: { type: "string" }, hora: { type: "string", description: "HH:MM, o vacío para todo el día" } }, required: ["id", "fecha"] } },
  { name: "completar_tarea", description: "Marca una tarea como hecha (o la reabre).",
    input_schema: { type: "object", properties: { id: { type: "string" }, hecha: { type: "boolean" } }, required: ["id"] } },
  { name: "borrar_tarea", description: "Borra una tarea. Solo si lo pide claramente.",
    input_schema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "anotar_diario", description: "Guarda una entrada en el diario, con sus palabras (puedes ordenar un poco, no inventes).",
    input_schema: { type: "object", properties: { texto: { type: "string" } }, required: ["texto"] } },
  { name: "marcar_habito", description: "Marca o desmarca un hábito de hoy.",
    input_schema: { type: "object", properties: { habito: { type: "string", enum: HABITS.map(h => h.k) }, hecho: { type: "boolean" } }, required: ["habito", "hecho"] } },
  { name: "registrar_plata", description: "Anota un ahorro, ingreso o gasto. 'lucas' = miles de pesos.",
    input_schema: { type: "object", properties: {
      tipo: { type: "string", enum: ["ahorro", "ingreso", "gasto"] }, monto: { type: "number" },
      moneda: { type: "string", enum: ["CLP", "USD"] }, nota: { type: "string" } }, required: ["tipo", "monto"] } }
];

const okDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
const okTime = s => /^\d{1,2}:\d{2}$/.test(s || "");
const isId = s => /^[0-9a-f-]{36}$/i.test(s || "");

async function runTool(uid, name, x) {
  if (name === "crear_tarea") {
    if (!x.titulo || !okDate(x.fecha)) return "error: falta título o fecha válida";
    const [y, m, d] = x.fecha.split("-").map(Number), tm = okTime(x.hora) ? x.hora.split(":").map(Number) : null;
    const at = localToUtc(y, m, d, tm ? tm[0] : 12, tm ? tm[1] : 0);
    const r = await db("tasks", { method: "POST", prefer: "return=representation", body: {
      user_id: uid, title: x.titulo, starts_at: at.toISOString(), all_day: !tm, urgency: Math.max(0, Math.min(3, x.urgencia ?? 1)), source: "telegram" } });
    return `ok, tarea creada id ${r[0].id}`;
  }
  if (name === "mover_tarea") {
    if (!isId(x.id) || !okDate(x.fecha)) return "error: id o fecha inválidos";
    const [y, m, d] = x.fecha.split("-").map(Number), tm = okTime(x.hora) ? x.hora.split(":").map(Number) : null;
    const body = { starts_at: localToUtc(y, m, d, tm ? tm[0] : 12, tm ? tm[1] : 0).toISOString(), all_day: !tm, reminded: false };
    const path = `tasks?id=eq.${x.id}&user_id=eq.${uid}`;
    let r;
    try { r = await db(path, { method: "PATCH", prefer: "return=representation", body }); }
    catch (e) { delete body.reminded; r = await db(path, { method: "PATCH", prefer: "return=representation", body }); }
    return r.length ? "ok, movida" : "error: no encontré esa tarea";
  }
  if (name === "completar_tarea") {
    if (!isId(x.id)) return "error: id inválido";
    const r = await db(`tasks?id=eq.${x.id}&user_id=eq.${uid}`, { method: "PATCH", prefer: "return=representation", body: { done: x.hecha !== false } });
    return r.length ? "ok" : "error: no encontré esa tarea";
  }
  if (name === "borrar_tarea") {
    if (!isId(x.id)) return "error: id inválido";
    const r = await db(`tasks?id=eq.${x.id}&user_id=eq.${uid}`, { method: "DELETE", prefer: "return=representation" });
    return r.length ? "ok, borrada" : "error: no encontré esa tarea";
  }
  if (name === "anotar_diario") {
    if (!x.texto) return "error: texto vacío";
    await db("journal", { method: "POST", body: { user_id: uid, day: ymd(today()), body: String(x.texto).trim(), source: "telegram" } });
    return "ok, anotado";
  }
  if (name === "marcar_habito") {
    const hb = HABITS.find(h => h.k === x.habito); if (!hb) return "error: hábito desconocido";
    const day = ymd(today());
    const r = await db(`days?select=habits,kind,note&user_id=eq.${uid}&day=eq.${day}`);
    const row = r[0] || { habits: {}, kind: "normal", note: "" };
    const habits = Object.assign({}, row.habits); habits[hb.k] = x.hecho !== false;
    await db("days?on_conflict=user_id,day", { method: "POST", prefer: "resolution=merge-duplicates",
      body: { user_id: uid, day, habits, kind: row.kind, note: row.note, updated_at: new Date().toISOString() } });
    return "ok";
  }
  if (name === "registrar_plata") {
    const n = Math.abs(+x.monto); if (!(n > 0)) return "error: monto inválido";
    await db("money", { method: "POST", body: { user_id: uid, kind: x.tipo, amount: n, currency: x.moneda === "USD" ? "USD" : "CLP", day: ymd(today()), note: x.nota || "" } });
    return "ok, anotado";
  }
  return "error: herramienta desconocida";
}

async function agent(chat, me, text) {
  const uid = me.user_id;
  tg("sendChatAction", { chat_id: chat, action: "typing" }).catch(() => {});
  const hist = Array.isArray(me.prefs && me.prefs.tg_hist) ? me.prefs.tg_hist : [];
  const fresh = hist.filter(h => Date.now() - h.at < 6 * 3600e3).slice(-8);
  const ctx = await lifeContext(uid, { journal: 4 });
  const system = `${VOZ}

Estás en su bot de Telegram. Entiende lo que escribe y actúa con las herramientas: agendar, mover, completar o borrar tareas, anotar en el diario, marcar hábitos y anotar plata. Puedes usar varias herramientas en un mismo mensaje.
- Si escribe algo que pasó o que siente, va al diario. Si menciona que hizo un hábito (paseo largo con los perros = paseo, bloque de trabajo en su canal/proyecto = bloque, curso/estudio = formacion, gimnasio/deporte = ejercicio), márcalo también.
- Si la fecha u hora es ambigua y equivocarse importa, pregunta antes en una línea.
- Para mover/completar/borrar usa el id exacto de la lista de tareas. Si hay dos que calzan, pregunta cuál.
- Después de actuar, confirma en 1 o 2 líneas cortas qué hiciste (con fecha y hora en formato humano: "jueves 20 · 16:00"). Si solo conversa o pregunta algo de su agenda, responde breve con sus datos.
- Texto plano, sin markdown.

${nowLine()}

${ctx}`;
  const messages = [];
  fresh.forEach(h => messages.push({ role: h.r, content: h.t }));
  if (messages.length && messages[0].role !== "user") messages.shift();
  messages.push({ role: "user", content: text });
  let reply = "", acted = false;
  for (let i = 0; i < 5; i++) {
    const r = await claude({ system, messages, tools: TOOLS, max_tokens: 700 });
    messages.push({ role: "assistant", content: r.content });
    const uses = r.content.filter(b => b.type === "tool_use");
    if (!uses.length || r.stop_reason !== "tool_use") { reply = textOf(r); break; }
    const results = [];
    for (const u of uses) {
      let out; try { out = await runTool(uid, u.name, u.input || {}); } catch (e) { console.error("tool", u.name, e); out = "error: " + String(e.message || e).slice(0, 120); }
      if (out.startsWith("ok")) acted = true;
      results.push({ type: "tool_result", tool_use_id: u.id, content: out });
    }
    messages.push({ role: "user", content: results });
  }
  if (!reply) reply = acted ? "Listo ✓" : "No supe qué hacer con eso. ¿Me lo dices de otra forma?";
  const nh = fresh.concat([{ r: "user", t: text.slice(0, 600), at: Date.now() }, { r: "assistant", t: reply.slice(0, 600), at: Date.now() }]).slice(-10);
  const fresh2 = (await db(`settings?select=prefs&user_id=eq.${uid}`))[0];
  const prefs = Object.assign({}, (fresh2 && fresh2.prefs) || {}, { tg_hist: nh });
  await db(`settings?user_id=eq.${uid}`, { method: "PATCH", body: { prefs } });
  return send(chat, esc(reply));
}
