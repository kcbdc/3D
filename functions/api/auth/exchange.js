import { requireDB, json } from "../db.js";

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDB(env);
    const body = await request.json();
    const token = String(body.token || "").trim();

    if (!token) {
      return json({ ok: false, error: "token이 필요합니다." }, { status: 400 });
    }

    const row = await db.prepare(
      "SELECT user_id, expires_at FROM login_tokens WHERE token = ?"
    ).bind(token).first();

    if (!row) {
      return json({ ok: false, error: "유효하지 않거나 이미 사용된 로그인 링크입니다." }, { status: 400 });
    }

    // 1회용이므로 성공/실패와 무관하게 즉시 삭제 (재사용 방지)
    await db.prepare("DELETE FROM login_tokens WHERE token = ?").bind(token).run();

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ ok: false, error: "로그인 링크가 만료되었습니다. 다시 시도해주세요." }, { status: 400 });
    }

    const user = await db.prepare(
      "SELECT id, nickname, email FROM users WHERE id = ?"
    ).bind(row.user_id).first();

    if (!user) {
      return json({ ok: false, error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    return json({ ok: true, user });
  } catch (error) {
    return json({ ok: false, error: String(error.message || error) }, { status: 500 });
  }
}
