import { useSignOut } from "../use-sign-out";
import { Action } from "./action";
import { Notice } from "./notice";
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
