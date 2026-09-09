import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { profileInputSchema, type OwnProfile, type ProfileInput } from '@create-for-christ/contracts';
import { authClient } from '../src/auth-client';
import { saveProfile } from '../src/api';
import { useMe } from '../src/use-me';
import { Action, Field, Notice, SignOutAction, Page, ui } from '../src/ui';
export default function Profile(){
  const {data:session,isPending}=authClient.useSession();
  const state=useMe(session?.user.id);
  if(isPending)return <Page title="Dein Profil"><ActivityIndicator/></Page>;
  if(!session)return <Redirect href="/sign-in"/>;
  if(state.loading)return <Page title="Dein Profil"><ActivityIndicator/></Page>;
  if(state.error)return <Page title="Dein Profil"><Notice message={state.error} error/><Action onPress={state.retry}>Erneut versuchen</Action><SignOutAction/></Page>;
  return <ProfileForm key={session.user.id + (state.me?.profile?.id??'new')} initial={state.me?.profile??null} name={session.user.name}/>;
}
function ProfileForm({initial,name}:{initial:OwnProfile|null;name:string}){
  const details=initial?.details;
  const [role,setRole]=useState<'creator'|'brand'>(details?.role??'creator');
  const [displayName,setDisplayName]=useState(details?.displayName??name);
  const [location,setLocation]=useState(details?.location??'');
  const [bio,setBio]=useState(details?.role==='creator'?details.bio:'');
  const [instagram,setInstagram]=useState(details?.role==='creator'?details.instagramHandle:'');
  const [languages,setLanguages]=useState(details?.role==='creator'?details.languages.join(', '):'Deutsch');
  const [topics,setTopics]=useState(details?.role==='creator'?details.topics.join(', '):'');
  const [portfolio,setPortfolio]=useState(details?.role==='creator'?details.portfolioUrls.join('\n'):'');
  const [deals,setDeals]=useState<Array<'barter'|'paid'>>(details?.role==='creator'?details.dealPreferences:['barter','paid']);
  const [brandName,setBrandName]=useState(details?.role==='brand'?details.brandName:'');
  const [description,setDescription]=useState(details?.role==='brand'?details.description:'');
  const [website,setWebsite]=useState(details?.role==='brand'?details.website:'');
  const [industry,setIndustry]=useState(details?.role==='brand'?details.industry:'');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[fields,setFields]=useState<Record<string,string>>({});
  function toggleDeal(deal:'barter'|'paid'){setDeals(values=>values.includes(deal)?values.filter(value=>value!==deal):[...values,deal]);}
  async function submit(){
    setError('');setFields({});
    const list=(value:string)=>value.split(',').map(item=>item.trim()).filter(Boolean);
    const input:ProfileInput=role==='creator'?{
      role,displayName,bio,instagramHandle:instagram.replace(/^@/,''),location,languages:list(languages),topics:list(topics),dealPreferences:deals,portfolioUrls:portfolio.split('\n').map(value=>value.trim()).filter(Boolean),
    }:{role,displayName,brandName,description,website,industry,location};
    const result=profileInputSchema.safeParse(input);
    if(!result.success){setFields(Object.fromEntries(result.error.issues.map(issue=>[String(issue.path[0]),issue.message])));setError('Bitte prüfe die markierten Angaben.');return;}
    setBusy(true);
    try{await saveProfile(result.data);router.replace('/');}
    catch(cause){setError(cause instanceof Error&&cause.name!=='AbortError'?cause.message:'Keine Verbindung. Bitte versuche es erneut.');}finally{setBusy(false);}
  }
  return <Page title={initial?'Dein Profil.':'Was möchtest du bewegen?'} subtitle={initial?'Halte deine Angaben aktuell.':'Wähle deine Rolle und richte dein Profil ein. Die Rolle bleibt danach fest mit deinem Konto verbunden.'}>
    {!initial?<View style={ui.row}>{(['creator','brand'] as const).map(value=><Pressable key={value} disabled={busy} accessibilityRole="radio" accessibilityState={{checked:role===value}} onPress={()=>setRole(value)} style={[ui.chip,role===value&&ui.selected]}><Text style={ui.label}>{value==='creator'?'Ich bin Creator':'Ich bin eine Brand'}</Text></Pressable>)}</View>:<Text style={ui.label}>{role==='creator'?'Creator-Profil':'Brand-Profil'}</Text>}
    <Field label={role==='brand'?'Dein Name / Ansprechpartner':'Dein Name'} value={displayName} onChangeText={setDisplayName} maxLength={100} error={fields.displayName} editable={!busy}/>
    {role==='creator'?<>
      <Field label="Instagram-Nutzername" value={instagram} onChangeText={setInstagram} autoCapitalize="none" autoCorrect={false} placeholder="dein.name" error={fields.instagramHandle} editable={!busy}/>
      <Text style={ui.body}>Dein Instagram-Kanal muss öffentlich sein. Hier veröffentlichst du deine Reels.</Text>
      <Field label="Über dich" value={bio} onChangeText={setBio} multiline maxLength={1000} error={fields.bio} editable={!busy}/>
      <Field label="Sprachen (mit Komma trennen)" value={languages} onChangeText={setLanguages} placeholder="Deutsch, Englisch" error={fields.languages} editable={!busy}/>
      <Field label="Themen (mit Komma trennen)" value={topics} onChangeText={setTopics} placeholder="Beauty, Food, Fitness" error={fields.topics} editable={!busy}/>
      <Text style={ui.label}>Welche Deals interessieren dich?</Text><View style={ui.row}>{(['barter','paid'] as const).map(deal=><Pressable key={deal} disabled={busy} accessibilityRole="checkbox" accessibilityState={{checked:deals.includes(deal)}} onPress={()=>toggleDeal(deal)} style={[ui.chip,deals.includes(deal)&&ui.selected]}><Text style={ui.label}>{deal==='barter'?'Barter · Produkt':'Paid · Honorar'}</Text></Pressable>)}</View>
      {fields.dealPreferences&&<Text style={ui.error}>{fields.dealPreferences}</Text>}
      <Field label="Reel-Portfolio (optional, ein Link pro Zeile)" value={portfolio} onChangeText={setPortfolio} multiline autoCapitalize="none" autoCorrect={false} placeholder="https://www.instagram.com/reel/…/" error={fields.portfolioUrls} editable={!busy}/>
    </>:<>
      <Field label="Name deiner Brand" value={brandName} onChangeText={setBrandName} maxLength={100} error={fields.brandName} editable={!busy}/>
      <Field label="Über deine Brand" value={description} onChangeText={setDescription} multiline maxLength={1500} error={fields.description} editable={!busy}/>
      <Field label="Branche" value={industry} onChangeText={setIndustry} maxLength={100} placeholder="z. B. Kosmetik" error={fields.industry} editable={!busy}/>
      <Field label="Website (optional)" value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" autoCorrect={false} placeholder="https://deine-brand.de" error={fields.website} editable={!busy}/>
    </>}
    <Field label="Standort (optional)" value={location} onChangeText={setLocation} maxLength={200} error={fields.location} editable={!busy}/>
    <Notice message={error} error/><Action busy={busy} onPress={()=>void submit()}>{initial?'Änderungen speichern':'Profil erstellen'}</Action>
    {initial&&<Action secondary disabled={busy} onPress={()=>router.replace('/')}>Abbrechen</Action>}
    <SignOutAction disabled={busy}/>
  </Page>;
}
