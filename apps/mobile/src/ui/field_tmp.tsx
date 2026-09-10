import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { ui } from './styles';
import { colors } from './theme';

// Keep RN TextInput: Expo UI's current universal TextInput does not expose accessibilityLabel.
export function Field({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={ui.field}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        style={[ui.input, props.multiline && ui.multiline, style]}
      />
      {error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
