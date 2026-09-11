import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { colors, layout } from './theme';
export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({
  name,
  color = colors.text,
  size = layout.iconSize,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  return <Ionicons name={name} color={color} size={size} accessible={false} />;
}
