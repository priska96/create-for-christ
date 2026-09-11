import { type ReactNode } from 'react';
import { type ProfileInput } from '@create-for-christ/contracts';
import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { authClient } from '../authClient';
import { ROUTE } from '../constants';
import { useMe } from '../hooks/useMe';
import { Action } from './Action';
import { Notice } from './Notice';
import { Page } from './Page';
export function RoleGate({
  role,
  children,
}: {
  role: ProfileInput['role'];
  children: ReactNode;
}) {
  const { data: session, isPending, error, refetch } = authClient.useSession();
  const profile = useMe(session?.user.id);
  if (isPending || (session && profile.loading))
    return (
      <Page title="Dein Konto">
        <ActivityIndicator />
      </Page>
    );
  if (error || profile.error)
    return (
      <Page title="Dein Konto">
        <Notice
          error
          message={
            profile.error || 'Deine Sitzung konnte nicht geprüft werden.'
          }
        />
        <Action
          onPress={() => {
            void refetch();
            profile.retry();
          }}
        >
          Erneut versuchen
        </Action>
      </Page>
    );
  if (!session) return <Redirect href={ROUTE.signIn} />;
  if (!profile.me?.profile) return <Redirect href={ROUTE.profile} />;
  if (profile.me.profile.details.role !== role)
    return <Redirect href={ROUTE.home} />;
  return children;
}
