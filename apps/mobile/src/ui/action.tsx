import { Button } from "@expo/ui";
import { NativeControl } from "./native-control";
import { layout, radii } from "./theme";
export function Action({
  children,
  onPress,
  busy = false,
  secondary = false,
  disabled = false,
}: {
  children: string;
  onPress: () => void;
  busy?: boolean;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <NativeControl>
      <Button
        label={busy ? `${children} …` : children}
        disabled={disabled || busy}
        onPress={onPress}
        variant={secondary ? "outlined" : "filled"}
        style={{
          width: "100%",
          height: layout.controlHeight,
          borderRadius: radii.control,
        }}
      />
    </NativeControl>
  );
}
