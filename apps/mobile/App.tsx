import type { Campaign, DealType } from '@create-for-christ/contracts';
import { DEAL, ROLE } from '@create-for-christ/contracts';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCampaigns } from './src/api';
import { apiUrl } from './src/authClient';
import { FILTER_ALL, MONEY, ROUTE, TIMEOUT } from './src/constants';
import { useSignOut } from './src/hooks';
import { styles } from './src/features/discovery/styles';
import { colors, layout, radii } from './src/ui/theme';

type Role = 'creator' | 'brand';
const filters = [
  { value: FILTER_ALL, label: 'Alle Deals' },
  { value: 'barter', label: 'Barter' },
  { value: 'paid', label: 'Paid' },
] as const;

export default function App({
  initialRole = 'creator',
  authenticated = false,
}: {
  initialRole?: Role;
  authenticated?: boolean;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const { error: accountError, busy: signingOut, logout } = useSignOut();
  const [filter, setFilter] = useState<DealType | typeof FILTER_ALL>(
    FILTER_ALL
  );
  const [reload, setReload] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      let active = true;
      const timer = setTimeout(() => controller.abort(), TIMEOUT.discoveryMs);
      setState('loading');
      getCampaigns(filter, controller.signal)
        .then((data) => {
          if (active) {
            setCampaigns(data);
            setState('ready');
          }
        })
        .catch(() => {
          if (active) setState('error');
        })
        .finally(() => clearTimeout(timer));
      return () => {
        active = false;
        clearTimeout(timer);
        controller.abort();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- reload is a manual refetch trigger, not read in the body.
    }, [filter, reload])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.mark}>
            <Text style={styles.markText}>cfc.</Text>
          </View>
          <View>
            <Text style={styles.wordmark}>Create For Christ</Text>
            <Text style={styles.small}>CREATORS × BRANDS</Text>
          </View>
          <View style={styles.preview}>
            <Text style={styles.previewText}>
              {authenticated ? 'MEIN KONTO' : 'ENTDECKEN'}
            </Text>
          </View>
        </View>

        <View style={styles.tags}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push(authenticated ? ROUTE.profile : ROUTE.signUp)
            }
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {authenticated ? 'Profil bearbeiten' : 'Konto erstellen'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            onPress={() =>
              authenticated ? void logout() : router.push(ROUTE.signIn)
            }
            style={styles.filter}
          >
            <Text style={styles.filterText}>
              {authenticated
                ? signingOut
                  ? 'Abmelden …'
                  : 'Abmelden'
                : 'Anmelden'}
            </Text>
          </Pressable>
        </View>
        {accountError ? (
          <Text accessibilityRole="alert" style={styles.note}>
            {accountError}
          </Text>
        ) : null}
        {!authenticated && (
          <View style={styles.roles}>
            {Object.values(ROLE).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: role === value }}
                onPress={() => setRole(value)}
                style={[styles.role, role === value && styles.roleActive]}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === value && styles.roleTextActive,
                  ]}
                >
                  {value === ROLE.creator ? 'Für Creator' : 'Für Brands'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>DEINE IDEEN. ECHTE VERBINDUNGEN.</Text>
          <Text style={styles.title}>
            {role === ROLE.creator
              ? 'Dein nächstes Reel.\nDeine nächste Chance.'
              : 'Deine Brand.\nIhre Kreativität.'}
          </Text>
          <Text style={styles.intro}>
            {role === ROLE.creator
              ? 'Entdecke Brands, die zu dir passen. Kreiere Reels auf deinem Instagram-Kanal – für Produkte oder ein Honorar.'
              : 'Finde Creator, die dein Produkt in einem Reel zum Leben erwecken. Mit einem Barter-Deal oder einem festen Honorar.'}
          </Text>
          <View style={styles.tags}>
            <Text style={styles.tag}>Nur Reels</Text>
            <Text style={styles.tag}>Barter & Paid</Text>
            <Text style={styles.tag}>Auf deinem Kanal</Text>
          </View>
        </View>

        {role === ROLE.creator ? (
          <>
            {!authenticated && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(ROUTE.creatorFeed)}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Zum Creator-Feed</Text>
              </Pressable>
            )}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Entdecke Kooperationen</Text>
            </View>
            <View style={styles.filters}>
              {filters.map((item) => (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === item.value }}
                  onPress={() => setFilter(item.value)}
                  style={[
                    styles.filter,
                    filter === item.value && styles.filterActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === item.value && styles.filterTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {state === 'loading' ? (
              <View style={styles.empty}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.body}>Kampagnen werden geladen …</Text>
              </View>
            ) : state === 'error' ? (
              <View style={styles.empty} accessibilityLiveRegion="polite">
                <Text style={styles.emptySymbol}>↻</Text>
                <Text style={styles.emptyTitle}>Kurz keine Verbindung</Text>
                <Text style={styles.body}>
                  Die Kampagnen sind gerade nicht erreichbar. Versuch es gleich
                  noch einmal.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setReload((value) => value + 1)}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Erneut versuchen</Text>
                </Pressable>
              </View>
            ) : campaigns.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptySymbol}>✳</Text>
                <Text style={styles.emptyTitle}>Hier beginnt etwas Neues.</Text>
                <Text style={styles.body}>
                  Für diese Auswahl gibt es noch keine veröffentlichten
                  Kampagnen. Schau bald wieder vorbei.
                </Text>
              </View>
            ) : (
              campaigns.map((campaign) => (
                <View key={campaign.id} style={styles.card}>
                  <Text style={styles.eyebrow}>
                    {campaign.brandName.toUpperCase()} ·{' '}
                    {campaign.compensation.type.toUpperCase()}
                  </Text>
                  <Text style={styles.emptyTitle}>{campaign.title}</Text>
                  {campaign.productImageUrl && (
                    <Image
                      source={{ uri: `${apiUrl}${campaign.productImageUrl}` }}
                      accessibilityLabel={campaign.productName}
                      style={{
                        width: '100%',
                        height: layout.imageHeight,
                        borderRadius: radii.image,
                      }}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={styles.body}>{campaign.description}</Text>
                  <Text style={styles.price}>
                    {campaign.compensation.type === DEAL.paid
                      ? `${(campaign.compensation.amountPerReelMinor / MONEY.minorPerUnit).toFixed(2)} ${campaign.currency} pro Reel`
                      : `${campaign.productName} als Gegenleistung`}
                  </Text>
                  <Text style={styles.small}>
                    {campaign.reelCount} Reel(s) · Veröffentlichung auf
                    Instagram
                  </Text>
                  <Text style={styles.note}>
                    Melde dich mit deinem Creator-Profil an, um passende
                    Kampagnen zu entdecken und dich zu bewerben.
                  </Text>
                </View>
              ))
            )}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptySymbol}>↗</Text>
            <Text style={styles.emptyTitle}>
              Platz für deine nächste Kampagne.
            </Text>
            <Text style={styles.body}>
              Erstelle Entwürfe mit Produkt, Vergütung und Briefing, lade ein
              Produktbild hoch und veröffentliche die Kampagne, sobald sie
              bereit ist.
            </Text>
            {authenticated && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(ROUTE.brandCampaigns)}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Kampagnen verwalten</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.how}>
          <Text style={styles.sectionTitle}>So kommen wir zusammen.</Text>
          {[
            [
              '01',
              'Entdecken',
              'Die passende Brand und das passende Produkt finden.',
            ],
            [
              '02',
              'Verbinden',
              'Bewerben und nach der Zusage gemeinsam loslegen.',
            ],
            [
              '03',
              'Kreieren',
              'Dein Reel posten und den Instagram-Link einreichen.',
            ],
          ].map(([number, title, body]) => (
            <View key={number} style={styles.step}>
              <Text style={styles.stepNumber}>{number}</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.body}>{body}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.footer}>
          CREATE FOR CHRIST · GEMEINSAM ETWAS BEWEGEN.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
