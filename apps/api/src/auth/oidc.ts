export const GOOGLE_ISSUER = ['https://accounts.google.com', 'accounts.google.com'];
export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

export interface AuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}

/** Construit l'URL d'autorisation Google (Authorization Code + PKCE, AUTH-D-2). */
export function buildAuthUrl(params: AuthUrlParams): string {
  const u = new URL(GOOGLE_AUTH_ENDPOINT);
  u.searchParams.set('client_id', params.clientId);
  u.searchParams.set('redirect_uri', params.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'openid email profile');
  u.searchParams.set('state', params.state);
  u.searchParams.set('nonce', params.nonce);
  u.searchParams.set('code_challenge', params.codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('access_type', 'online');
  u.searchParams.set('prompt', 'select_account');
  return u.toString();
}

export interface TokenResponse {
  id_token: string;
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface ExchangeDeps {
  fetch: typeof fetch;
  tokenEndpoint?: string;
}

export interface ExchangeParams {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Échange le `code` contre les tokens (back-to-back, AUTH-D-1). `fetch` injectable. */
export async function exchangeCode(
  deps: ExchangeDeps,
  params: ExchangeParams,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    code_verifier: params.codeVerifier,
    client_id: params.clientId,
    client_secret: params.clientSecret,
    redirect_uri: params.redirectUri,
  });
  const res = await deps.fetch(deps.tokenEndpoint ?? GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`échec échange de code: HTTP ${res.status}`);
  }
  const json = (await res.json()) as TokenResponse;
  if (typeof json.id_token !== 'string') {
    throw new Error('réponse token sans id_token');
  }
  return json;
}
