import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { authClient } from '../src/authClient';
import { ROUTE } from '../src/constants';
import { ProfileForm } from '../src/features/profiles/ProfileForm';
import { useMe } from '../src/hooks';
import { Action, Notice, Page, SignOutAction } from '../src/ui';

export default function Profile() {
  const { data: session, isPending } = authClient.useSession();
  const state = useMe(session?.user.id);
  if (isPending)
    return (
      <Page title="Dein Profil">
        <ActivityIndicator />
      </Page>
    );
  if (!session) return <Redirect href={ROUTE.signIn} />;
  if (state.loading)
    return (
      <Page title="Dein Profil">
        <ActivityIndicator />
      </Page>
    );
  if (state.error)
    return (
      <Page title="Dein Profil">
        <Notice message={state.error} error />
        <Action onPress={state.retry}>Erneut versuchen</Action>
        <SignOutAction />
      </Page>
    );
  return (
    <ProfileForm
      key={session.user.id + (state.me?.profile?.id ?? 'new')}
      initial={state.me?.profile ?? null}
      name={session.user.name}
    />
  );
}
