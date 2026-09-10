import { Checkbox } from "@expo/ui";
import { Pressable, Text } from "react-native";
import { NativeControl } from "./native-control";
import { ui } from "./styles";
type SelectionProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
};
export function Choice({ label, checked, disabled, onPress }: SelectionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[ui.chip, checked && ui.selected]}
    >
      <Text style={ui.label}>{label}</Text>
    </Pressable>
  );
}
export function Check({ label, checked, disabled, onPress }: SelectionProps) {
  return (
    <NativeControl>
      <Checkbox
        label={label}
        value={checked}
        disabled={disabled}
        onValueChange={onPress}
      />
    </NativeControl>
  );
}
