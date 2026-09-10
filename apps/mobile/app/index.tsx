import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import Discovery from '../App';
import { authClient } from '../src/auth-client';
import { ROUTE } from '../src/constants';
import { Action, Notice, Page, SignOutAction } from '../src/ui';
import { colors } from '../src/ui/theme';
import { useMe } from '../src/use-me';

export default function Index() {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const profile = useMe(session?.user.id);
  if (isPending)
    return (
      <Page title="Willkommen.">
        <ActivityIndicator color={colors.primary} />
      </Page>
    );
  if (error && !session)
    return (
      <Page title="Kurz keine Verbindung.">
        <Notice message="Deine Sitzung konnte nicht geprüft werden." error />
        <Action onPress={() => void refetch()}>Erneut versuchen</Action>
      </Page>
    );
  if (!session) return <Discovery />;
  if (profile.loading)
    return (
      <Page title="Dein Konto wird geladen.">
        <ActivityIndicator color={colors.primary} />
      </Page>
    );
  if (profile.error)
    return (
      <Page title="Dein Konto">
        <Notice message={profile.error} error />
        <Action onPress={profile.retry}>Erneut versuchen</Action>
        <SignOutAction />
      </Page>
    );
  if (!profile.me?.profile) return <Redirect href={ROUTE.profile} />;
  return (
    <Discovery
      key={session.user.id}
      initialRole={profile.me.profile.details.role}
      authenticated
    />
  );
}
