/** Masque un email pour les logs (AUTH-D-7 / RGPD) : `a***@domaine`. */
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

/** Chemins masqués par pino (cookies, autorisation, emails). */
export const redactPaths = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.email',
  '*.password',
];
