import { expoClient } from "@better-auth/expo/client";
import { APP, AUTH } from "@create-for-christ/contracts";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { TIMEOUT } from "./constants";

export const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL ?? APP.defaultApiUrl
).replace(/\/$/, "");
export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [
    expoClient({
      scheme: APP.scheme,
      storagePrefix: APP.scheme,
      storage: SecureStore,
      disableCache: true,
    }),
  ],
  fetchOptions: { timeout: TIMEOUT.authMs },
});
export function authError(code?: string) {
  const messages: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "E-Mail-Adresse oder Passwort stimmt nicht.",
    EMAIL_NOT_VERIFIED:
      "Bitte bestätige zuerst deine E-Mail-Adresse. Du kannst unten einen neuen Link anfordern.",
    PASSWORD_TOO_SHORT: `Dein Passwort muss mindestens ${AUTH.minPasswordLength} Zeichen enthalten.`,
    PASSWORD_TOO_LONG: `Dein Passwort darf höchstens ${AUTH.maxPasswordLength} Zeichen enthalten.`,
    TOO_MANY_REQUESTS: "Zu viele Versuche. Bitte warte einen Moment.",
    INVALID_EMAIL: "Bitte gib eine gültige E-Mail-Adresse ein.",
  };
  return (
    messages[code ?? ""] ??
    "Das hat gerade nicht funktioniert. Bitte prüfe deine Angaben und versuche es erneut."
  );
}
