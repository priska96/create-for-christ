import { API_PATH, MESSAGES } from '@create-for-christ/contracts';
import { apiUrl, authClient, authError } from '../authClient';
export class AuthError extends Error {
  constructor(public code?: string) {
    super(authError(code));
  }
}
async function authenticate<T extends { error: { code?: string } | null }>(
  request: Promise<T>
): Promise<void> {
  const result = await request;
  if (result.error) throw new AuthError(result.error.code);
}
export const signIn = (input: { email: string; password: string }) =>
  authenticate(authClient.signIn.email(input));
export const signUp = (input: {
  name: string;
  email: string;
  password: string;
}) =>
  authenticate(
    authClient.signUp.email({
      ...input,
      callbackURL: `${apiUrl}${API_PATH.verified}`,
    })
  );
export const resendVerification = (email: string) =>
  authenticate(
    authClient.sendVerificationEmail({
      email: email.trim(),
      callbackURL: `${apiUrl}${API_PATH.verified}`,
    })
  );
export const requestPasswordReset = (input: { email: string }) =>
  authenticate(
    authClient.requestPasswordReset({
      ...input,
      redirectTo: `${apiUrl}${API_PATH.resetPassword}`,
    })
  );
export async function signOut() {
  const result = await authClient.signOut();
  if (result.error) throw new Error(MESSAGES.logoutFailed);
}
