import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { Context, Next } from 'hono';
import type { AppEnv, AuthUser } from './env';

export type { AuthUser };

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

export async function verifyFirebaseToken(token: string, projectId: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  const email = (payload.email as string) || '';
  return {
    id: payload.sub as string,
    email,
    name: (payload.name as string) || (email ? email.split('@')[0] : 'User'),
    photo_url: (payload.picture as string) || '',
    auth_method: 'google',
  };
}

// Supports both Firebase JWT (Google) and session tokens (OTP).
export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const authorization = c.req.header('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return c.json({ detail: 'Not authenticated' }, 401);
  }
  const token = authorization.slice(7);

  // Try Firebase JWT first (Google users)
  try {
    const user = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
    c.set('user', user);
    await next();
    return;
  } catch { /* not a Firebase JWT — try session token */ }

  // Try session token (OTP users)
  if (token.startsWith('sess_')) {
    try {
      const session = await c.env.DB.prepare(
        'SELECT s.user_id, u.email, u.name, u.photo_url FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?',
      ).bind(token).first();
      if (session) {
        c.set('user', {
          id: session.user_id as string,
          email: (session.email as string) || '',
          name: (session.name as string) || 'User',
          photo_url: (session.photo_url as string) || '',
          auth_method: 'otp',
        } satisfies AuthUser);
        await next();
        return;
      }
    } catch (e) {
      console.error('Session token lookup failed', e);
    }
  }

  return c.json({ detail: 'Invalid or expired token' }, 401);
}
