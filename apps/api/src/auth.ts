import { betterAuth } from 'better-auth';
import { expo } from '@better-auth/expo';
import type pg from 'pg';
import type { Config } from './config.js';
import type { SendAuthMail } from './mail.js';

export function createAuth(pool: pg.Pool, config: Config, sendMail: SendAuthMail) {
  return betterAuth({
    appName: 'Create For Christ',
    baseURL: config.AUTH_BASE_URL,
    secret: config.BETTER_AUTH_SECRET,
    database: pool,
    user: { modelName: 'auth_users' },
    account: { modelName: 'auth_accounts' },
    session: { modelName: 'auth_sessions', expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    verification: { modelName: 'auth_verifications' },
    trustedOrigins: [config.AUTH_BASE_URL, ...config.CORS_ORIGINS.split(',').map(value => value.trim()), 'create-for-christ://',
      ...(config.NODE_ENV === 'development' ? ['exp://**'] : [])],
    plugins: [expo()],
    advanced: { ipAddress: { ipAddressHeaders: ['x-cfc-client-ip'] } },
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, autoSignIn: false,
      minPasswordLength: 10, maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 3600,
      async sendResetPassword({ user, url }) {
        await sendMail({ to: user.email, subject: 'Create For Christ – Passwort zurücksetzen',
          text: `Setze dein Passwort über diesen Link zurück (1 Stunde gültig):\n\n${url}\n\nWenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren.` });
      },
    },
    emailVerification: {
      sendOnSignUp: true, sendOnSignIn: true, autoSignInAfterVerification: false, expiresIn: 3600,
      async sendVerificationEmail({ user, url }) {
        await sendMail({ to: user.email, subject: 'Create For Christ – E-Mail bestätigen',
          text: `Willkommen bei Create For Christ!\n\nBestätige deine E-Mail-Adresse über diesen Link (1 Stunde gültig):\n\n${url}\n\nMelde dich anschließend in der App an.` });
      },
    },
    rateLimit: { enabled: true, window: 60, max: 60, customRules: { '/sign-in/email': { window: 60, max: 10 } } },
  });
}
export type Auth = ReturnType<typeof createAuth>;
