import { ROLE, type ProfileInput } from '@create-for-christ/contracts';
import { router, usePathname } from 'expo-router';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { ROUTE } from '../constants';
import { Icon, type IconName } from './Icon';
import { colors, fontSize, fontWeight, layout, spacing } from './theme';
export function BottomNavigation({ role }: { role: ProfileInput['role'] }) {
  const pathname = usePathname();
  const tabs: {
    label: string;
    path: (typeof ROUTE)[keyof typeof ROUTE];
    icon: IconName;
    activePaths?: string[];
  }[] = [
    {
      label: 'Home',
      path: role === ROLE.creator ? ROUTE.creatorFeed : ROUTE.brandCampaigns,
      icon: 'home-outline',
    },
    {
      label: 'Bewerbungen',
      path: role === ROLE.creator ? ROUTE.myApplications : ROUTE.brandInbox,
      icon: 'file-tray-full-outline',
      activePaths: [ROUTE.brandApplications],
    },
    {
      label: 'Nachrichten',
      path: ROUTE.messages,
      icon: 'chatbubble-ellipses-outline',
    },
    { label: 'Profil', path: ROUTE.profile, icon: 'person-outline' },
  ];
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Hauptnavigation"
      style={styles.bar}
    >
      {tabs.map((tab) => {
        const selected =
          pathname === tab.path || Boolean(tab.activePaths?.includes(pathname));
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) router.replace(tab.path);
            }}
            style={styles.tab}
          >
            <Icon
              name={tab.icon}
              color={selected ? colors.text : colors.muted}
            />
            <Text style={[styles.label, selected && styles.active]}>
              {tab.label}
            </Text>
            {selected && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: layout.pageWidth,
    alignSelf: 'center',
    minHeight: layout.navigationHeight,
    borderTopWidth: spacing.hairline,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  label: { fontSize: fontSize.tiny, color: colors.muted },
  active: { color: colors.text, fontWeight: fontWeight.semibold },
  dot: {
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: spacing.tiny,
    backgroundColor: colors.accent,
  },
});
