import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ui } from './styles';

export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={ui.safe}>
      <KeyboardAvoidingView
        style={ui.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={ui.page}
        >
          <Text style={ui.wordmark}>CREATE FOR CHRIST</Text>
          <Text style={ui.title}>{title}</Text>
          {subtitle && <Text style={ui.body}>{subtitle}</Text>}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
