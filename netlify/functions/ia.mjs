/* RUTA · Claude para la app: el diario que pregunta y la lectura de la semana */
import { authUser, json, hasClaude, claude, textOf, lifeContext, nowLine, AREAS, VOZ } from "../lib/ruta.mjs";

export const config = { path: "/api/ia" };


export default async (req) => {
  if (req.method !== "POST") return json({ error: "método" }, 405);
  if (!hasClaude()) return json({ error: "Claude todavía no está conectado (falta la llave en Netlify)." }, 503);
  const u = await authUser(req);
  if (!u) return json({ error: "sesión" }, 401);
  let b; try { b = await req.json(); } catch { b = {}; }
  try {
    const ctx = await lifeContext(u.id, { journal: b.action === "semana" ? 14 : 10 });
    if (b.action === "pregunta") {
      const r = await claude({
        max_tokens: 200,
        system: `${VOZ}\n\nTu tarea: hacerle UNA sola pregunta para su diario de hoy. Que sea específica a lo que está viviendo (usa sus tareas, hábitos, áreas y lo último que escribió), que invite a escribir algo honesto en 2 o 3 líneas. Máximo 25 palabras. Responde solo con la pregunta, sin comillas ni preámbulo.${b.prev ? "\nNo repitas esta pregunta anterior: " + String(b.prev).slice(0, 200) : ""}`,
        messages: [{ role: "user", content: `${nowLine()}\n\n${ctx}` }]
      });
      return json({ q: textOf(r).replace(/^["«“]|["»”]$/g, "") });
    }
    if (b.action === "semana") {
      const tool = {
        name: "lectura_semana",
        description: "Entrega la lectura de la semana y una propuesta de puntaje para cada área.",
        input_schema: {
          type: "object",
          properties: {
            lectura: { type: "string", description: "3 a 5 frases: qué se movió esta semana, qué quedó quieto y una cosa concreta para la próxima. Sin listas." },
            areas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: { type: "string", enum: Object.keys(AREAS) },
                  score: { type: "integer", minimum: 0, maximum: 10 },
                  por_que: { type: "string", description: "Máximo 12 palabras, basado en datos." }
                },
                required: ["key", "score", "por_que"]
              }
            }
          },
          required: ["lectura", "areas"]
        }
      };
      const r = await claude({
        max_tokens: 1200,
        system: `${VOZ}\n\nTu tarea: leer su última semana y proponer cómo está cada una de sus 8 áreas de 0 a 10. Parte del puntaje actual y muévelo solo si los datos lo justifican (hábitos cumplidos, tareas hechas o atrasadas, lo que escribió en el diario). Si un área no tiene datos, deja su puntaje igual y dilo. Usa la herramienta lectura_semana.`,
        messages: [{ role: "user", content: `${nowLine()}\n\n${ctx}` }],
        tools: [tool], tool_choice: { type: "tool", name: "lectura_semana" }
      });
      const t = (r.content || []).find(x => x.type === "tool_use");
      if (!t) return json({ error: "sin respuesta" }, 502);
      const areas = (t.input.areas || []).filter(a => AREAS[a.key]).map(a => ({ key: a.key, score: Math.max(0, Math.min(10, Math.round(+a.score || 0))), por_que: String(a.por_que || "") }));
      return json({ lectura: String(t.input.lectura || ""), areas });
    }
    return json({ error: "acción" }, 400);
  } catch (e) {
    console.error("ia", e);
    return json({ error: "Claude no respondió. Intenta de nuevo en un rato." }, 502);
  }
};
