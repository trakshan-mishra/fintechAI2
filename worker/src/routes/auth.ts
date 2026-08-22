import { Hono } from 'hono';
import type { AppEnv, AuthUser } from '../env';
import { requireAuth, verifyFirebaseToken } from '../auth';

const authRoutes = new Hono<AppEnv>();

// ── Google auth: sync Firebase user to D1 ─────────────────────────────────────
authRoutes.post('/sync', requireAuth, async (c) => {
  const user = c.get('user');
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, photo_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email, name = excluded.name,
       photo_url = excluded.photo_url, updated_at = excluded.updated_at`,
  ).bind(user.id, user.email, user.name, user.photo_url, now, now).run();
  return c.json({ user });
});

authRoutes.get('/me', requireAuth, async (c) => {
  return c.json(c.get('user'));
});

// ── OTP signup: phone or email ────────────────────────────────────────────────
authRoutes.post('/signup/phone', async (c) => {
  const { phone, name } = await c.req.json();
  if (!phone) return c.json({ detail: 'Phone required' }, 400);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const userId = `otp_${phone.replace(/[^0-9]/g, '')}`;
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO otp_codes (user_id, phone, name, code, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET code = excluded.code, created_at = excluded.created_at, expires_at = excluded.expires_at`,
  ).bind(userId, phone, name || 'User', otp, now, now + 5 * 60 * 1000).run();
  return c.json({ demo_otp: otp, message: 'OTP sent (demo mode)' });
});

authRoutes.post('/signup/email', async (c) => {
  const { email, name } = await c.req.json();
  if (!email) return c.json({ detail: 'Email required' }, 400);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const userId = `otp_${email.replace(/[^a-zA-Z0-9]/g, '')}`;
  const now = Date.now();
  await c.env.DB.prepare(
    `INSERT INTO otp_codes (user_id, email, name, code, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET code = excluded.code, created_at = excluded.created_at, expires_at = excluded.expires_at`,
  ).bind(userId, email, name || 'User', otp, now, now + 5 * 60 * 1000).run();
  return c.json({ demo_otp: otp, message: 'OTP sent (demo mode)' });
});

// ── OTP verify: check code, create user, return session token ─────────────────
authRoutes.post('/verify/otp', async (c) => {
  const { phone_or_email, otp } = await c.req.json();
  if (!phone_or_email || !otp) return c.json({ detail: 'Phone/email and OTP required' }, 400);

  const row = await c.env.DB.prepare(
    `SELECT user_id, phone, email, name, code, expires_at FROM otp_codes
     WHERE phone = ? OR email = ? ORDER BY created_at DESC LIMIT 1`,
  ).bind(phone_or_email, phone_or_email).first();

  if (!row) return c.json({ detail: 'No OTP found. Please request a new one.' }, 404);
  if (Date.now() > (row.expires_at as number)) return c.json({ detail: 'OTP expired. Please request a new one.' }, 410);
  if (String(row.code) !== String(otp)) return c.json({ detail: 'Invalid OTP' }, 400);

  // Create user in D1
  const userId = row.user_id as string;
  const email = (row.email as string) || '';
  const phone = (row.phone as string) || '';
  const name = (row.name as string) || 'User';
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, photo_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`,
  ).bind(userId, email, `${name}||${phone}`, null, now, now).run();

  // Generate session token
  const sessionToken = `sess_${crypto.randomUUID().replace(/-/g, '')}`;
  await c.env.DB.prepare(
    `INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)`,
  ).bind(sessionToken, userId, now).run();

  // Clean up OTP
  await c.env.DB.prepare('DELETE FROM otp_codes WHERE user_id = ?').bind(userId).run();

  const user: AuthUser = { id: userId, email, name, photo_url: '', auth_method: 'otp' };
  return c.json({ session_token: sessionToken, user });
});

// ── Google auth (legacy compat): exchange Firebase ID token ──────────────────
authRoutes.post('/google', async (c) => {
  const { id_token } = await c.req.json();
  if (!id_token) return c.json({ detail: 'id_token required' }, 400);
  try {
    const user = await verifyFirebaseToken(id_token, c.env.FIREBASE_PROJECT_ID);
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, name, photo_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email, name = excluded.name,
         photo_url = excluded.photo_url, updated_at = excluded.updated_at`,
    ).bind(user.id, user.email, user.name, user.photo_url, now, now).run();

    const sessionToken = `sess_${crypto.randomUUID().replace(/-/g, '')}`;
    await c.env.DB.prepare(
      `INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)`,
    ).bind(sessionToken, user.id, now).run();

    return c.json({ session_token: sessionToken, user });
  } catch {
    return c.json({ detail: 'Invalid Firebase token' }, 401);
  }
});

export default authRoutes;
