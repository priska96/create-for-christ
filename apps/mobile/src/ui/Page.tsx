import type { ReactNode } from 'react';
import type { ProfileInput } from '@create-for-christ/contracts';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomNavigation } from './BottomNavigation';
import { IconButton } from './IconButton';
import { ui } from './styles';
import { colors, fontSize, fontWeight, layout, spacing } from './theme';
export function Page({
  title,
  subtitle,
  children,
  navigationRole,
  onBack,
  headerAction,
  branded = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  navigationRole?: ProfileInput['role'];
  onBack?: () => void;
  headerAction?: ReactNode;
  branded?: boolean;
}) {
  return (
    <SafeAreaView style={ui.safe}>
      <View style={styles.header}>
        {onBack ? (
          <IconButton
            small
            icon="chevron-back"
            label="Zurück"
            onPress={onBack}
          />
        ) : (
          <View style={styles.mark}>
            <Text numberOfLines={1} style={styles.markText}>
              cfc<Text style={styles.accent}>.</Text>
            </Text>
          </View>
        )}
        <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        <View style={styles.headerAction}>{headerAction}</View>
      </View>
      <KeyboardAvoidingView
        style={ui.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={ui.page}
        >
          {branded && (
            <Text style={styles.wordmark}>
              Create For <Text style={styles.accent}>Christ</Text>
            </Text>
          )}
          {subtitle && <Text style={ui.body}>{subtitle}</Text>}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      {navigationRole && <BottomNavigation role={navigationRole} />}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: layout.pageWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.card,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerAction: { width: layout.brandMark, alignItems: 'flex-end' },
  mark: { width: layout.brandMark },
  markText: {
    fontWeight: fontWeight.heavy,
    fontSize: fontSize.heading,
    color: colors.text,
  },
  accent: { color: colors.accent },
  wordmark: {
    fontWeight: fontWeight.heavy,
    fontSize: fontSize.title,
    textAlign: 'center',
    color: colors.text,
    marginVertical: spacing.section,
  },
});
