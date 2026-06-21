import type { Cosmetic, CosmeticCategory, Difficulty, GameId, OfflineClears } from '@puzzlehub/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface Me {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
}

export interface StartResponse {
  token: string;
  game: GameId;
  difficulty: Difficulty;
  puzzle: unknown;
}

export interface SubmitResponse {
  accepted: boolean;
  valid?: boolean;
  status?: string;
  timeMs?: number;
  reason?: string;
  xpGained?: number;
  xp?: number;
  level?: number;
}

export interface Progress {
  xp: number;
  level: number;
}

function readCookie(name: string): string | undefined {
  for (const part of document.cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

/** En-tête CSRF double-submit lu depuis le cookie `csrf` (non-httpOnly). */
function csrfHeader(): Record<string, string> {
  const t = readCookie('csrf');
  return t ? { 'x-csrf-token': t } : {};
}

async function call(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, { credentials: 'include', ...init });
}

/** URL de connexion Google (redirection top-level vers l'API). */
export function loginUrl(): string {
  return `${API_URL}/auth/google/start`;
}

export async function getMe(): Promise<Me | null> {
  try {
    const res = await call('/auth/me');
    return res.status === 200 ? ((await res.json()) as Me) : null;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  await call('/auth/logout', { method: 'POST', headers: csrfHeader() });
}

export async function startPlay(game: GameId, difficulty: Difficulty): Promise<StartResponse> {
  const res = await call('/play/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...csrfHeader() },
    body: JSON.stringify({ game, difficulty }),
  });
  if (!res.ok) throw new Error(`start_failed_${res.status}`);
  return (await res.json()) as StartResponse;
}

export async function submitPlay(token: string, board: unknown): Promise<SubmitResponse> {
  const res = await call('/play/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...csrfHeader() },
    body: JSON.stringify({ token, board }),
  });
  if (!res.ok) throw new Error(`submit_failed_${res.status}`);
  return (await res.json()) as SubmitResponse;
}

export async function getProgress(): Promise<Progress | null> {
  try {
    const res = await call('/me/progress');
    return res.status === 200 ? ((await res.json()) as Progress) : null;
  } catch {
    return null;
  }
}

export interface OfflineClearResponse {
  credited: boolean;
  xp: number;
  level: number;
}

/** Enregistre un clear hors-ligne (serveur idempotent). `null` si échec réseau/auth. */
export async function clearOffline(
  game: GameId,
  difficulty: Difficulty,
  index: number,
): Promise<OfflineClearResponse | null> {
  try {
    const res = await call('/me/offline/clear', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...csrfHeader() },
      body: JSON.stringify({ game, difficulty, index }),
    });
    return res.ok ? ((await res.json()) as OfflineClearResponse) : null;
  } catch {
    return null;
  }
}

export interface OfflineSyncResponse {
  clears: OfflineClears;
  xp: number;
  level: number;
}

/** Fusionne (OR) les clears locaux dans le compte serveur au login (idempotent). */
export async function syncOffline(clears: OfflineClears): Promise<OfflineSyncResponse | null> {
  try {
    const res = await call('/me/offline/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...csrfHeader() },
      body: JSON.stringify({ clears }),
    });
    return res.ok ? ((await res.json()) as OfflineSyncResponse) : null;
  } catch {
    return null;
  }
}

export interface CosmeticsState {
  catalog: Cosmetic[];
  level: number;
  unlocked: string[];
  equipped: Record<CosmeticCategory, string>;
}

export async function getCosmetics(): Promise<CosmeticsState | null> {
  try {
    const res = await call('/me/cosmetics');
    return res.status === 200 ? ((await res.json()) as CosmeticsState) : null;
  } catch {
    return null;
  }
}

/** Équipe un cosmétique. Lève `'locked'` si le serveur refuse (403). */
export async function selectCosmetic(id: string): Promise<Record<CosmeticCategory, string>> {
  const res = await call('/me/cosmetics/select', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...csrfHeader() },
    body: JSON.stringify({ id }),
  });
  if (res.status === 403) throw new Error('locked');
  if (!res.ok) throw new Error(`select_failed_${res.status}`);
  return ((await res.json()) as { equipped: Record<CosmeticCategory, string> }).equipped;
}

/** Démarre le défi quotidien (409 si déjà joué aujourd'hui). */
export async function startDaily(game: GameId): Promise<StartResponse> {
  const res = await call('/play/daily', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...csrfHeader() },
    body: JSON.stringify({ game }),
  });
  if (res.status === 409) throw new Error('daily_already_played');
  if (!res.ok) throw new Error(`daily_failed_${res.status}`);
  return (await res.json()) as StartResponse;
}
