/* RUTA · utilidades compartidas por las funciones (bot, activación, avisos) */

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const TG = process.env.TELEGRAM_TOKEN;

/* ───────── base de datos (Supabase REST con la llave secreta) ───────── */
export async function db(path, { method = "GET", body, prefer } = {}) {
  const headers = { apikey: KEY, "Content-Type": "application/json" };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`db ${r.status}: ${txt.slice(0, 300)}`);
  return txt ? JSON.parse(txt) : null;
}
export const q = encodeURIComponent;

/* ───────── Telegram ───────── */
export async function tg(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${TG}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
  });
  return r.json();
}
export const send = (chat_id, text, extra = {}) =>
  tg("sendMessage", { chat_id, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });
export const esc = s => String(s ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/* ───────── hora de Santiago ───────── */
const TZ = "America/Santiago";
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "short"
});
export function parts(ts) {
  const o = {};
  fmt.formatToParts(new Date(ts)).forEach(p => { o[p.type] = p.value; });
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: WD.indexOf(o.weekday) };
}
function offset(ts) {
  const p = parts(ts);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ts / 1000) * 1000;
}
export function localToUtc(y, m, d, h = 0, mi = 0) {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const o = offset(guess);
  let t = guess - o;
  const o2 = offset(t);
  if (o2 !== o) t = guess - o2;
  return new Date(t);
}
export const today = () => parts(Date.now());
export function addDays(o, n) {
  const t = new Date(Date.UTC(o.y, o.m - 1, o.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
}
export const ymd = o => `${o.y}-${String(o.m).padStart(2, "0")}-${String(o.d).padStart(2, "0")}`;
export const pad = n => String(n).padStart(2, "0");

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function humanDay(o) {
  const t = today();
  const diff = Math.round((Date.UTC(o.y, o.m - 1, o.d) - Date.UTC(t.y, t.m - 1, t.d)) / 864e5);
  if (diff === 0) return "hoy";
  if (diff === 1) return "mañana";
  if (diff === 2) return "pasado mañana";
  const wd = new Date(Date.UTC(o.y, o.m - 1, o.d)).getUTCDay();
  return `${DIAS[wd]} ${o.d} ${MES[o.m - 1]}`;
}

/* ───────── lectura de tareas en lenguaje natural ───────── */
const DOW = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, "miércoles": 3, jueves: 4, viernes: 5, sabado: 6, "sábado": 6 };
export function parseTask(raw) {
  let t = " " + raw.trim().replace(/\s+/g, " ") + " ";
  const now = today();
  let day = { y: now.y, m: now.m, d: now.d }, dateSet = false, time = null, urg = 1;
  const take = (re, fn) => { const m = t.match(re); if (m) { fn(m); t = t.replace(re, " "); return true; } return false; };

  take(/\s(pasado\s+ma[ñn]ana)\s/i, () => { day = addDays(now, 2); dateSet = true; }) ||
  take(/\s(ma[ñn]ana)\s/i, () => { day = addDays(now, 1); dateSet = true; }) ||
  take(/\s(hoy)\s/i, () => { dateSet = true; }) ||
  take(/\s(?:el\s+)?(domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado)\s/i, m => {
    const w = DOW[m[1].toLowerCase()];
    day = addDays(now, ((w - now.wd + 7) % 7) || 7); dateSet = true;
  }) ||
  take(/\s(?:el\s+)?(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\s/, m => {
    const d = +m[1], mo = +m[2];
    let y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : now.y;
    if (!m[3] && (mo < now.m || (mo === now.m && d < now.d))) y++;
    day = { y, m: mo, d }; dateSet = true;
  });

  take(/\s(?:a\s+las\s+)?(\d{1,2})[:.](\d{2})\s*(?:h|hrs|hs)?\s/i, m => { time = [+m[1], +m[2]]; }) ||
  take(/\s(?:a\s+las\s+)?(\d{1,2})\s*(am|pm)\s/i, m => { let h = +m[1] % 12; if (m[2].toLowerCase() === "pm") h += 12; time = [h, 0]; }) ||
  take(/\sa\s+las\s+(\d{1,2})\s*(?:h|hrs|hs)?\s/i, m => { time = [+m[1], 0]; }) ||
  take(/\s(\d{1,2})\s*(?:h|hrs|hs)\s/i, m => { time = [+m[1], 0]; });
  if (time && (time[0] > 23 || time[1] > 59)) time = null;

  if (/urgente/i.test(t) || /!{2,}/.test(t)) urg = 3;
  else if (/importante/i.test(t) || /!/.test(t)) urg = 2;
  t = t.replace(/\b(urgente|importante)\b/gi, " ").replace(/!+/g, " ");

  let title = t.replace(/\s+/g, " ").trim().replace(/^[,.:;\-–]+|[,.:;\-–]+$/g, "").trim();
  if (title) title = title[0].toUpperCase() + title.slice(1);
  return { title, day, time, urg, dateSet };
}
export const URG = ["tranqui", "normal", "importante", "urgente"];

/* ───────── resumen del día ───────── */
export const HABITS = [
  { k: "paseo", n: "Paseo largo" },
  { k: "bloque", n: "Bloque canal" },
  { k: "formacion", n: "Formación" },
  { k: "ejercicio", n: "Ejercicio" }
];
export async function daySummary(uid) {
  const t = today(), tm = addDays(t, 1);
  const start = localToUtc(t.y, t.m, t.d).toISOString();
  const end = localToUtc(tm.y, tm.m, tm.d).toISOString();
  const [tasks, days, goals, sets] = await Promise.all([
    db(`tasks?select=title,starts_at,all_day,urgency,done&user_id=eq.${uid}` +
       `&starts_at=lt.${q(end)}&or=${q(`(done.eq.false,starts_at.gte."${start}")`)}` +
       `&order=done.asc,urgency.desc,starts_at.asc&limit=20`),
    db(`days?select=habits,kind&user_id=eq.${uid}&day=eq.${ymd(t)}`),
    db(`goals?select=title,due&user_id=eq.${uid}&kind=eq.macro&done=is.false&due=gte.${ymd(t)}&order=due.asc&limit=1`),
    db(`settings?select=prefs&user_id=eq.${uid}`)
  ]);
  const lines = [];
  if (tasks.length) {
    lines.push("<b>Para hoy</b>");
    tasks.forEach(x => {
      const d = new Date(x.starts_at), late = !x.done && d < new Date(start);
      const p = parts(d);
      const when = late ? "atrasada" : x.all_day ? "" : `${pad(p.h)}:${pad(p.mi)}`;
      const mark = x.done ? "✓" : ["·", "·", "!", "‼"][x.urgency] || "·";
      lines.push(`${mark} ${x.done ? "<s>" : ""}${esc(x.title)}${x.done ? "</s>" : ""}${when ? ` <i>${when}</i>` : ""}`);
    });
  } else lines.push("Nada pendiente para hoy.");
  const h = (days[0] && days[0].habits) || {};
  lines.push("", "<b>Hábitos</b>", HABITS.map(x => `${h[x.k] ? "✅" : "○"} ${x.n}`).join("\n"));
  if (days[0] && days[0].kind === "distinto") lines.push("<i>Marcado como día distinto</i>");
  const prefs = (sets[0] && sets[0].prefs) || {};
  const ym = `${t.y}-${pad(t.m)}`, paid = (prefs.paid && prefs.paid[ym]) || [];
  const dim = new Date(Date.UTC(t.y, t.m, 0)).getUTCDate();
  const due = (prefs.bills || []).filter(b => paid.indexOf(b.id) < 0)
    .map(b => ({ b, n: Math.min(+b.day || 1, dim) - t.d })).filter(x => x.n <= 3).sort((a, b) => a.n - b.n);
  if (due.length) {
    lines.push("", "<b>Fijos del mes</b>");
    due.forEach(x => lines.push(`💳 ${esc(x.b.name)} — ${x.n < 0 ? `atrasado ${-x.n} ${x.n === -1 ? "día" : "días"}` : x.n === 0 ? "vence hoy" : x.n === 1 ? "vence mañana" : `en ${x.n} días`}`));
  }
  if (goals[0]) {
    const g = goals[0], gd = g.due.split("-").map(Number);
    const n = Math.round((Date.UTC(gd[0], gd[1] - 1, gd[2]) - Date.UTC(t.y, t.m - 1, t.d)) / 864e5);
    lines.push("", `⏳ ${n} ${n === 1 ? "día" : "días"} para <b>${esc(g.title)}</b>`);
  }
  return lines.join("\n");
}
