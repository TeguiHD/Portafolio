/**
 * Deprecated legacy helper.
 *
 * This project uses NextAuth credentials login at /login.
 * Keeping client-side credential checks (especially via NEXT_PUBLIC_*) is insecure
 * and must not be used.
 */
export function validateCredentials(_email: string, _password: string) {
  return false;
}



