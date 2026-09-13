import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AUTH,
  emailFormSchema,
  signInFormSchema,
  signUpFormSchema,
  resetPasswordFormSchema,
} from '@create-for-christ/contracts';

test('auth forms reject malformed addresses and attribute password confirmation errors', () => {
  assert.equal(
    emailFormSchema.safeParse({ email: 'not-an-email' }).success,
    false
  );
  assert.equal(
    signInFormSchema.safeParse({ email: 'creator@example.test', password: '' })
      .success,
    false
  );
  const result = signUpFormSchema.safeParse({
    name: 'Creator',
    email: 'creator@example.test',
    password: 'a'.repeat(AUTH.minPasswordLength),
    confirm: 'different',
  });
  assert.equal(result.success, false);
  if (!result.success)
    assert.deepEqual(result.error.issues[0]?.path, ['confirm']);
});
test('registration trims identity fields but preserves passwords; reset enforces both password bounds', () => {
  const password = ' a-valid-password ';
  const result = signUpFormSchema.parse({
    name: ' Creator ',
    email: ' creator@example.test ',
    password,
    confirm: password,
  });
  assert.equal(result.name, 'Creator');
  assert.equal(result.email, 'creator@example.test');
  assert.equal(result.password, password);
  for (const length of [
    AUTH.minPasswordLength - 1,
    AUTH.maxPasswordLength + 1,
  ]) {
    const value = 'a'.repeat(length);
    assert.equal(
      resetPasswordFormSchema.safeParse({ password: value, confirm: value })
        .success,
      false
    );
  }
  assert.equal(
    resetPasswordFormSchema.safeParse({ password, confirm: password }).success,
    true
  );
});
