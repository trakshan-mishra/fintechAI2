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

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const authorization = c.req.header('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return c.json({ detail: 'Not authenticated' }, 401);
  }
  const token = authorization.slice(7);
  try {
    const user = await verifyFirebaseToken(token, c.env.FIREBASE_PROJECT_ID);
    c.set('user', user);
  } catch {
    return c.json({ detail: 'Invalid or expired token' }, 401);
  }
  await next();
}
