import { json } from "./db.js";

export function onRequestGet() {
  return json({
    ok: true,
    now: Date.now(),
    iso: new Date().toISOString()
  });
}
