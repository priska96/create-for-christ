import { Text } from 'react-native';
import { ui } from './styles';

export function Notice({
  message,
  error = false,
}: {
  message: string;
  error?: boolean;
}) {
  return message ? (
    <Text
      accessibilityRole={error ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[ui.notice, error && ui.error]}
    >
      {message}
    </Text>
  ) : null;
}
