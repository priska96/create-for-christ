import { useMutation } from '@tanstack/react-query';
import {
  signIn,
  signUp,
  resendVerification,
  requestPasswordReset,
} from '../api/auth';
export function useSignIn() {
  return useMutation({ mutationFn: signIn });
}
export function useSignUp() {
  return useMutation({ mutationFn: signUp });
}
export function useResendVerification() {
  return useMutation({ mutationFn: resendVerification });
}
export function usePasswordResetRequest() {
  return useMutation({ mutationFn: requestPasswordReset });
}
