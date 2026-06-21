import { z } from 'zod';

/** Variables d'environnement validées au boot (AUTH-D-6). Démarrage refusé si invalide. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  COOKIE_SECRET: z.string().min(32, 'COOKIE_SECRET doit faire ≥ 32 caractères'),
  // Secret HMAC dédié au token de début (F3). Défaut = COOKIE_SECRET si absent.
  PLAY_TOKEN_SECRET: z.string().min(32).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.string().url(),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  // Nombre de proxys de confiance en amont (SEC-M2). 0 = ne pas faire confiance
  // à X-Forwarded-For. Évite le spoof d'IP contournant le rate-limit.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' ; ');
    throw new Error(`Configuration d'environnement invalide — ${detail}`);
  }
  return parsed.data;
}
