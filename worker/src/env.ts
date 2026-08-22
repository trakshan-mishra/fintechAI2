export interface Env {
  DB: D1Database;
  AI: Ai;
  GEMINI_API_KEYS?: string;   // comma-separated keys for general AI
  GEMINI_SCANNER_KEY?: string; // dedicated key for scanner
  GEMINI_API_KEY?: string;     // legacy single key (still works)
  FIREBASE_PROJECT_ID: string;
  CORS_ORIGINS: string;
}

export interface AuthUser {
  id: string; email: string; name: string; photo_url: string; auth_method: string;
}

export type AppEnv = { Bindings: Env; Variables: { user: AuthUser } };
