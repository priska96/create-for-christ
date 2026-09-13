import { useId, type Ref } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { ui } from './styles';
import { colors } from './theme';

// Keep RN TextInput: Expo UI's current universal TextInput does not expose accessibilityLabel.
export function Field({
  label,
  error,
  style,
  ref,
  ...props
}: TextInputProps & { label: string; error?: string; ref?: Ref<TextInput> }) {
  const errorId = useId();
  return (
    <View style={ui.field}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        {...props}
        ref={ref}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        accessibilityLabel={label}
        placeholderTextColor={colors.placeholder}
        style={[
          ui.input,
          props.multiline && ui.multiline,
          style,
          error && { borderColor: colors.danger },
        ]}
      />
      {error && (
        <Text nativeID={errorId} accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
