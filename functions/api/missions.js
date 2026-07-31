import { requireDB, json } from "./_lib/db.js";

export async function onRequestGet({ request, env }) {
  try {
    const db = requireDB(env);
    const url = new URL(request.url);
    const node = String(url.searchParams.get("node") || "");
    if (!node) {
      return json({ ok: false, error: "node가 필요합니다." }, { status: 400 });
    }

    const result = await db.prepare(
      "SELECT id, title, spec, rule_idx, options_json FROM ai_missions WHERE node = ? ORDER BY created_at DESC LIMIT 20"
    ).bind(node).all();

    const missions = (result.results || []).map((row) => {
      try {
        return { id: row.id, title: row.title, spec: row.spec, rule: row.rule_idx, options: JSON.parse(row.options_json), aiGenerated: true };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return json({ ok: true, missions });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
