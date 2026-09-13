import { authError } from './authClient';
import type {
  FieldErrors,
  FieldValues,
  Path,
  Resolver,
  UseFormSetError,
} from 'react-hook-form';
import { ApiError } from './api/request';

export const FORM_OPTIONS = {
  mode: 'onTouched',
  reValidateMode: 'onChange',
} as const;
export function splitList(value: string, separator = ',') {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}
type Issue = {
  path: PropertyKey[];
  message: string;
  code?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  origin?: string;
};
export function validationMessage(issue: Issue) {
  if (!/^(Invalid|Too |Invalid input)/.test(issue.message))
    return issue.message;
  if (issue.code === 'too_small')
    return `Bitte mindestens ${String(issue.minimum)} ${issue.origin === 'string' ? 'Zeichen eingeben' : issue.origin === 'array' ? 'Einträge auswählen' : 'angeben'}.`;
  if (issue.code === 'too_big')
    return `Erlaubt sind höchstens ${String(issue.maximum)} ${issue.origin === 'string' ? 'Zeichen' : issue.origin === 'array' ? 'Einträge' : ''}.`;
  return 'Bitte eine gültige Angabe eingeben.';
}
export function formResolver<T extends FieldValues>(
  validate: (values: T) => { success: boolean; error?: { issues: Issue[] } },
  fieldName: (path: string, values: T) => string = (path) => path
): Resolver<T> {
  return (values) => {
    const result = validate(values);
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error?.issues ?? []) {
      const name = fieldName(String(issue.path[0]), values);
      errors[name] ??= { type: 'validate', message: validationMessage(issue) };
    }
    return result.success
      ? { values, errors: {} }
      : { values: {}, errors: errors as FieldErrors<T> };
  };
}
export function applyApiErrors<T extends FieldValues>(
  cause: unknown,
  setError: UseFormSetError<T>,
  values: T,
  fieldName: (path: string) => string = (path) => path
) {
  if (!(cause instanceof ApiError)) return;
  for (const issue of cause.issues) {
    const name = fieldName(issue.path.split('.')[0]);
    if (Object.hasOwn(values, name))
      setError(name as Path<T>, { type: 'server', message: issue.message });
  }
}

export function applyAuthErrors<T extends FieldValues>(
  code: string | undefined,
  setError: UseFormSetError<T>,
  available: Path<T>[]
) {
  const paths =
    code === 'INVALID_EMAIL_OR_PASSWORD'
      ? ['email', 'password']
      : code === 'INVALID_EMAIL'
        ? ['email']
        : code === 'PASSWORD_TOO_SHORT' || code === 'PASSWORD_TOO_LONG'
          ? ['password']
          : [];
  for (const path of available)
    if (paths.includes(path))
      setError(path, { type: 'server', message: authError(code) });
}
