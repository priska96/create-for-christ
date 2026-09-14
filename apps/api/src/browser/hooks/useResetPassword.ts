import { useMutation } from '@tanstack/react-query';
export function useResetPassword(token: string | null) {
  return useMutation({
    mutationFn: async (password: string) => {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!response.ok)
        throw new Error(
          'Das Passwort konnte nicht geändert werden. Prüfe die Verbindung oder fordere einen neuen Link an.'
        );
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
  });
}
