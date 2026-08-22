import { Hono } from 'hono';
import type { AppEnv } from '../env';
import { requireAuth } from '../auth';

const authRoutes = new Hono<AppEnv>();

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

export default authRoutes;
