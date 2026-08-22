export interface Env {
  DB: D1Database;
  GEMINI_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  CORS_ORIGINS: string;
}

export interface AuthUser {
  id: string; email: string; name: string; photo_url: string; auth_method: string;
}

export type AppEnv = { Bindings: Env; Variables: { user: AuthUser } };
