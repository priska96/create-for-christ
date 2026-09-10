import { Action } from './Action';
import { useSignOut } from '../hooks';
import { Notice } from './Notice';

export function SignOutAction({ disabled = false }: { disabled?: boolean }) {
  const { busy, error, logout } = useSignOut();
  return (
    <>
      <Notice message={error} error />
      <Action
        secondary
        disabled={disabled}
        busy={busy}
        onPress={() => void logout()}
      >
        Abmelden
      </Action>
    </>
  );
}
