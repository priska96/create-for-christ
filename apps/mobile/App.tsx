import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { authClient } from './src/auth-client';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { Campaign, DealType } from '@create-for-christ/contracts';
import { getCampaigns } from './src/api';

type Role = 'creator' | 'brand';
const filters = [{ value: 'all', label: 'Alle Deals' }, { value: 'barter', label: 'Barter' }, { value: 'paid', label: 'Paid' }] as const;

export default function App({initialRole='creator',authenticated=false}: {initialRole?:Role;authenticated?:boolean}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [accountError,setAccountError] = useState('');
  const [signingOut,setSigningOut] = useState(false);
  async function logout(){setSigningOut(true);setAccountError('');try{const result=await authClient.signOut();if(result.error){setAccountError('Abmelden fehlgeschlagen. Bitte erneut versuchen.');return;}router.replace('/');}catch{setAccountError('Keine Verbindung. Bitte erneut versuchen.');}finally{setSigningOut(false);}}
  const [filter, setFilter] = useState<DealType | 'all'>('all');
  const [reload, setReload] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => controller.abort(), 8000);
    setState('loading');
    getCampaigns(filter, controller.signal)
      .then(data => { if (active) { setCampaigns(data); setState('ready'); } })
      .catch(() => { if (active) setState('error'); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [filter, reload]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <View style={styles.mark}><Text style={styles.markText}>cfc.</Text></View>
            <View><Text style={styles.wordmark}>Create For Christ</Text><Text style={styles.small}>CREATORS × BRANDS</Text></View>
            <View style={styles.preview}><Text style={styles.previewText}>{authenticated?'MEIN KONTO':'ENTDECKEN'}</Text></View>
          </View>

          <View style={styles.tags}>
            <Pressable accessibilityRole="button" onPress={()=>router.push(authenticated?'/profile':'/sign-up')} style={styles.button}><Text style={styles.buttonText}>{authenticated?'Profil bearbeiten':'Konto erstellen'}</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={signingOut} onPress={()=>authenticated?void logout():router.push('/sign-in')} style={styles.filter}><Text style={styles.filterText}>{authenticated?(signingOut?'Abmelden …':'Abmelden'):'Anmelden'}</Text></Pressable>
          </View>
          {accountError ? <Text accessibilityRole="alert" style={styles.note}>{accountError}</Text> : null}
          {!authenticated && <View style={styles.roles}>
            {(['creator', 'brand'] as const).map(value => (
              <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: role === value }} onPress={() => setRole(value)} style={[styles.role, role === value && styles.roleActive]}>
                <Text style={[styles.roleText, role === value && styles.roleTextActive]}>{value === 'creator' ? 'Für Creator' : 'Für Brands'}</Text>
              </Pressable>
            ))}
          </View>}

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>DEINE IDEEN. ECHTE VERBINDUNGEN.</Text>
            <Text style={styles.title}>{role === 'creator' ? 'Dein nächstes Reel.\nDeine nächste Chance.' : 'Deine Brand.\nIhre Kreativität.'}</Text>
            <Text style={styles.intro}>{role === 'creator' ? 'Entdecke Brands, die zu dir passen. Kreiere Reels auf deinem Instagram-Kanal – für Produkte oder ein Honorar.' : 'Finde Creator, die dein Produkt in einem Reel zum Leben erwecken. Mit einem Barter-Deal oder einem festen Honorar.'}</Text>
            <View style={styles.tags}><Text style={styles.tag}>Nur Reels</Text><Text style={styles.tag}>Barter & Paid</Text><Text style={styles.tag}>Auf deinem Kanal</Text></View>
          </View>

          {role === 'creator' ? <>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Entdecke Kooperationen</Text></View>
            <View style={styles.filters}>{filters.map(item => (
              <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: filter === item.value }} onPress={() => setFilter(item.value)} style={[styles.filter, filter === item.value && styles.filterActive]}>
                <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            ))}</View>
            {state === 'loading' ? <View style={styles.empty}><ActivityIndicator color="#36584A" /><Text style={styles.body}>Kampagnen werden geladen …</Text></View> : state === 'error' ? (
              <View style={styles.empty} accessibilityLiveRegion="polite">
                <Text style={styles.emptySymbol}>↻</Text><Text style={styles.emptyTitle}>Kurz keine Verbindung</Text>
                <Text style={styles.body}>Die Kampagnen sind gerade nicht erreichbar. Versuch es gleich noch einmal.</Text>
                <Pressable accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={styles.button}><Text style={styles.buttonText}>Erneut versuchen</Text></Pressable>
              </View>
            ) : campaigns.length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptySymbol}>✳</Text><Text style={styles.emptyTitle}>Hier beginnt etwas Neues.</Text><Text style={styles.body}>Für diese Auswahl gibt es noch keine veröffentlichten Kampagnen. Schau bald wieder vorbei.</Text></View>
            ) : campaigns.map(campaign => (
              <View key={campaign.id} style={styles.card}>
                <Text style={styles.eyebrow}>{campaign.brandName.toUpperCase()} · {campaign.compensation.type.toUpperCase()}</Text>
                <Text style={styles.emptyTitle}>{campaign.title}</Text><Text style={styles.body}>{campaign.description}</Text>
                <Text style={styles.price}>{campaign.compensation.type === 'paid' ? `${(campaign.compensation.amountPerReelMinor / 100).toFixed(2)} ${campaign.currency} pro Reel` : `${campaign.productName} als Gegenleistung`}</Text>
                <Text style={styles.small}>{campaign.reelCount} Reel(s) · Veröffentlichung auf Instagram</Text>
                <Text style={styles.note}>Bewerbungen und Swipes folgen im nächsten Entwicklungsschritt. Du kannst die Kampagnen bereits ansehen.</Text>
              </View>
            ))}
          </> : <View style={styles.empty}><Text style={styles.emptySymbol}>↗</Text><Text style={styles.emptyTitle}>Platz für deine nächste Kampagne.</Text><Text style={styles.body}>Hier wirst du Reel-Kampagnen veröffentlichen und Bewerbungen verwalten. Dein Brand-Profil kannst du bereits oben bearbeiten.</Text><Text style={styles.note}>Die Brand-Verwaltung ist noch in Entwicklung.</Text></View>}

          <View style={styles.how}><Text style={styles.sectionTitle}>So kommen wir zusammen.</Text>
            {[['01', 'Entdecken', 'Die passende Brand und das passende Produkt finden.'], ['02', 'Verbinden', 'Bewerben und nach der Zusage gemeinsam loslegen.'], ['03', 'Kreieren', 'Dein Reel posten und den Instagram-Link einreichen.']].map(([number, title, body]) => <View key={number} style={styles.step}><Text style={styles.stepNumber}>{number}</Text><View style={styles.stepContent}><Text style={styles.stepTitle}>{title}</Text><Text style={styles.body}>{body}</Text></View></View>)}
          </View>
          <Text style={styles.footer}>CREATE FOR CHRIST · GEMEINSAM ETWAS BEWEGEN.</Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F5EF' },
  container: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  mark: { backgroundColor: '#36584A', width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#FFF', fontSize: 23, fontWeight: '800' },
  wordmark: { fontSize: 19, fontWeight: '700', color: '#203B30' },
  small: { fontSize: 11, color: '#637268', letterSpacing: 1, lineHeight: 19 },
  preview: { marginLeft: 'auto', backgroundColor: '#E9E5D9', padding: 8, borderRadius: 20 },
  previewText: { fontSize: 9, letterSpacing: 1.2, color: '#526256', fontWeight: '700' },
  roles: { flexDirection: 'row', padding: 4, borderRadius: 16, backgroundColor: '#EAEDE5' },
  role: { flex: 1, padding: 13, alignItems: 'center', borderRadius: 12 },
  roleActive: { backgroundColor: '#36584A' },
  roleText: { fontWeight: '600', color: '#526256' }, roleTextActive: { color: '#FFFFFF' },
  hero: { paddingVertical: 14, gap: 18 }, eyebrow: { fontSize: 10, letterSpacing: 2, color: '#527362', fontWeight: '700' },
  title: { fontSize: 38, lineHeight: 44, letterSpacing: -1.5, fontWeight: '700', color: '#203B30' },
  intro: { fontSize: 16, lineHeight: 25, color: '#627066' },
  tags: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, tag: { fontSize: 11, color: '#536647', backgroundColor: '#E6EBD9', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between' }, sectionTitle: { fontSize: 20, color: '#203B30', fontWeight: '600' },
  filters: { flexDirection: 'row', gap: 8, marginTop: -10 }, filter: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1, borderColor: '#D9DDD3' },
  filterActive: { backgroundColor: '#203B30', borderColor: '#203B30' }, filterText: { color: '#526256', fontWeight: '500' }, filterTextActive: { color: '#FFFFFF' },
  empty: { padding: 28, gap: 16, alignItems: 'center', backgroundColor: '#FFFDF8', borderRadius: 24, borderWidth: 1, borderColor: '#E8E7DE' },
  emptySymbol: { fontSize: 38, color: '#78916B' }, emptyTitle: { fontSize: 22, color: '#203B30', fontWeight: '600', textAlign: 'center' }, body: { color: '#647067', fontSize: 14, lineHeight: 23 },
  button: { backgroundColor: '#36584A', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 }, buttonText: { color: '#FFFFFF', fontWeight: '600' },
  card: { backgroundColor: '#FFFDF8', borderRadius: 24, padding: 24, gap: 16, borderWidth: 1, borderColor: '#E8E7DE' }, price: { color: '#36584A', fontSize: 18, fontWeight: '700' },
  note: { fontSize: 12, lineHeight: 19, color: '#73766D', marginTop: 6 }, how: { gap: 22, paddingTop: 12 }, step: { flexDirection: 'row', gap: 18 },
  stepNumber: { color: '#779166', fontSize: 13, fontWeight: '700', paddingTop: 4 }, stepContent: { flex: 1, gap: 3 }, stepTitle: { fontSize: 16, fontWeight: '600', color: '#203B30' },
  footer: { color: '#6F796D', fontSize: 9, letterSpacing: 1.3, textAlign: 'center', paddingTop: 20 },
});
