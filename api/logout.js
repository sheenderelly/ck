export default function handler(req, res) {
  res.setHeader("Set-Cookie", "ck_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return res.status(200).json({ ok: true });
}
