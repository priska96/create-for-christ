import { z } from 'zod';
import { AUTH, LIMITS } from './constants.js';
const email = z
  .string()
  .trim()
  .email('Bitte eine gültige E-Mail-Adresse eingeben.');
const password = z
  .string()
  .min(
    AUTH.minPasswordLength,
    `Bitte mindestens ${AUTH.minPasswordLength} Zeichen eingeben.`
  )
  .max(
    AUTH.maxPasswordLength,
    `Erlaubt sind höchstens ${AUTH.maxPasswordLength} Zeichen.`
  );
export const emailFormSchema = z.object({ email });
export const signInFormSchema = emailFormSchema.extend({
  password: z.string().min(1, 'Bitte dein Passwort eingeben.'),
});
export const resetPasswordFormSchema = z
  .object({ password, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'Die Passwörter stimmen nicht überein.',
  });
export const signUpFormSchema = resetPasswordFormSchema.safeExtend({
  name: z
    .string()
    .trim()
    .min(1, 'Bitte deinen Namen eingeben.')
    .max(
      LIMITS.shortText,
      `Erlaubt sind höchstens ${LIMITS.shortText} Zeichen.`
    ),
  email,
});
