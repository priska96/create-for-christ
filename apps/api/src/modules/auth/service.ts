import { expo } from "@better-auth/expo";
import { APP, AUTH } from "@create-for-christ/contracts";
import { betterAuth } from "better-auth";
import type pg from "pg";
import { AUTH_RATE } from "../../config/constants.js";
import type { Config } from "../../config/environment.js";
import type { SendAuthMail } from "../../infrastructure/mail.js";

export function createAuth(
  pool: pg.Pool,
  config: Config,
  sendMail: SendAuthMail,
) {
  return betterAuth({
    appName: APP.name,
    baseURL: config.AUTH_BASE_URL,
    secret: config.BETTER_AUTH_SECRET,
    database: pool,
    user: { modelName: "auth_users" },
    account: { modelName: "auth_accounts" },
    session: {
      modelName: "auth_sessions",
      expiresIn: AUTH.sessionLifetimeSeconds,
      cookieCache: { enabled: false },
    },
    verification: { modelName: "auth_verifications" },
    trustedOrigins: [
      config.AUTH_BASE_URL,
      ...config.CORS_ORIGINS.split(",").map((value) => value.trim()),
      APP.origin,
      ...(config.NODE_ENV === "development" ? ["exp://**"] : []),
    ],
    plugins: [expo()],
    advanced: { ipAddress: { ipAddressHeaders: [AUTH.clientIpHeader] } },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: AUTH.minPasswordLength,
      maxPasswordLength: AUTH.maxPasswordLength,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: AUTH.tokenLifetimeSeconds,
      async sendResetPassword({ user, url }) {
        await sendMail({
          to: user.email,
          subject: "Create For Christ – Passwort zurücksetzen",
          text: `Setze dein Passwort über diesen Link zurück (1 Stunde gültig):\n\n${url}\n\nWenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: AUTH.tokenLifetimeSeconds,
      async sendVerificationEmail({ user, url }) {
        await sendMail({
          to: user.email,
          subject: "Create For Christ – E-Mail bestätigen",
          text: `Willkommen bei Create For Christ!\n\nBestätige deine E-Mail-Adresse über diesen Link (1 Stunde gültig):\n\n${url}\n\nMelde dich anschließend in der App an.`,
        });
      },
    },
    rateLimit: {
      enabled: true,
      window: AUTH_RATE.windowSeconds,
      max: AUTH_RATE.maxRequests,
      customRules: {
        "/sign-in/email": {
          window: AUTH_RATE.windowSeconds,
          max: AUTH_RATE.maxSignIns,
        },
      },
    },
  });
}
export type Auth = ReturnType<typeof createAuth>;
