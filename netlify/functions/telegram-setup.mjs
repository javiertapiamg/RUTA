/* RUTA · activa el bot: revisa las llaves, conecta Telegram con la app y muestra el resultado */
import { db, tg } from "../lib/ruta.mjs";

export const config = { path: "/api/telegram-setup" };

export default async (req) => {
  const origin = new URL(req.url).origin;
  const checks = [];
  const ok = (label, good, extra = "") => checks.push({ label, good, extra });

  const env = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "TELEGRAM_TOKEN", "TELEGRAM_SECRET"];
  const missing = env.filter(k => !process.env[k]);
  ok("Las 4 variables están en Netlify", !missing.length, missing.length ? "Falta: " + missing.join(", ") : "");

  let botName = "";
  if (!missing.length) {
    try { await db("settings?select=user_id&limit=1"); ok("La llave de Supabase funciona", true); }
    catch (e) { ok("La llave de Supabase funciona", false, String(e.message).slice(0, 160)); }

    const me = await tg("getMe", {});
    ok("El token del bot es válido", !!me.ok, me.ok ? "" : me.description || "");
    if (me.ok) botName = me.result.username;

    if (me.ok) {
      const wh = await tg("setWebhook", {
        url: origin + "/api/telegram",
        secret_token: process.env.TELEGRAM_SECRET,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true
      });
      ok("El bot quedó conectado a tu app", !!wh.ok, wh.ok ? origin : wh.description || "");
      await tg("setMyCommands", { commands: [
        { command: "hoy", description: "Tu día: tareas, hábitos y lo que viene" },
        { command: "paseo", description: "Marcar paseo largo" },
        { command: "bloque", description: "Marcar bloque del canal" },
        { command: "formacion", description: "Marcar formación" },
        { command: "ejercicio", description: "Marcar ejercicio" },
        { command: "ayuda", description: "Cómo hablarme" }
      ] });
    }
  }

  const all = checks.every(c => c.good);
  const row = c => `<li class="${c.good ? "y" : "n"}"><b>${c.good ? "✓" : "✗"}</b><span>${c.label}${c.extra ? `<small>${c.extra}</small>` : ""}</span></li>`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>RUTA · bot</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  background:linear-gradient(140deg,#FFE4EF,#DCEBFF 50%,#E2F8EE);color:#14161C;padding:20px;box-sizing:border-box}
main{background:rgba(255,255,255,.7);backdrop-filter:blur(20px);border-radius:26px;padding:28px 26px;max-width:420px;width:100%;
  box-shadow:0 20px 50px -20px rgba(30,40,80,.3)}
h1{font-size:13px;letter-spacing:.3em;margin:0 0 4px}p{color:#596073;margin:0 0 18px;font-size:14px}
ul{list-style:none;padding:0;margin:0 0 18px}li{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.06);font-size:14.5px}
li b{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:12px;flex:none}
li.y b{background:#36C2AE}li.n b{background:#F0867A}small{display:block;color:#8a90a0;font-size:12px;margin-top:2px;word-break:break-word}
a{display:block;text-align:center;background:#14161C;color:#fff;text-decoration:none;border-radius:999px;padding:13px;font-weight:600}
</style></head><body><main>
<h1>RUTA · BOT</h1>
<p>${all ? "Todo listo. Ahora en la app aprieta <b>conectar Telegram</b>." : "Hay algo por arreglar. Revisa lo que está en rojo y vuelve a abrir esta página."}</p>
<ul>${checks.map(row).join("")}</ul>
${botName ? `<a href="https://t.me/${botName}" target="_blank" rel="noopener">Abrir @${botName}</a>` : ""}
</main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
};
