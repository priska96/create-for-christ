import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [expoClient({ scheme: 'create-for-christ', storagePrefix: 'create-for-christ', storage: SecureStore, disableCache: true })],
  fetchOptions: { timeout: 10000 },
});
export function authError(code?: string) {
  const messages: Record<string,string> = {
    INVALID_EMAIL_OR_PASSWORD: 'E-Mail-Adresse oder Passwort stimmt nicht.',
    EMAIL_NOT_VERIFIED: 'Bitte bestätige zuerst deine E-Mail-Adresse. Du kannst unten einen neuen Link anfordern.',
    PASSWORD_TOO_SHORT: 'Dein Passwort muss mindestens 10 Zeichen enthalten.',
    PASSWORD_TOO_LONG: 'Dein Passwort darf höchstens 128 Zeichen enthalten.',
    TOO_MANY_REQUESTS: 'Zu viele Versuche. Bitte warte einen Moment.',
    INVALID_EMAIL: 'Bitte gib eine gültige E-Mail-Adresse ein.',
  };
  return messages[code ?? ''] ?? 'Das hat gerade nicht funktioniert. Bitte prüfe deine Angaben und versuche es erneut.';
}
