import { ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import Discovery from '../App';
import { authClient } from '../src/auth-client';
import { useMe } from '../src/use-me';
import { Action, Notice, SignOutAction, Page } from '../src/ui';
export default function Index(){
  const {data:session,isPending,error,refetch}=authClient.useSession();
  const profile=useMe(session?.user.id);
  if(isPending)return <Page title="Willkommen."><ActivityIndicator color="#36584A"/></Page>;
  if(error&&!session)return <Page title="Kurz keine Verbindung."><Notice message="Deine Sitzung konnte nicht geprüft werden." error/><Action onPress={()=>void refetch()}>Erneut versuchen</Action></Page>;
  if(!session)return <Discovery/>;
  if(profile.loading)return <Page title="Dein Konto wird geladen."><ActivityIndicator color="#36584A"/></Page>;
  if(profile.error)return <Page title="Dein Konto"><Notice message={profile.error} error/><Action onPress={profile.retry}>Erneut versuchen</Action><SignOutAction/></Page>;
  if(!profile.me?.profile)return <Redirect href="/profile"/>;
  return <Discovery key={session.user.id} initialRole={profile.me.profile.details.role} authenticated/>;
}
