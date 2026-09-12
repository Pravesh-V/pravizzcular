import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

interface SeparatorProps {
  /** Left inset, to align with text that sits beside a leading icon. */
  inset?: number;
  style?: ViewStyle;
}

export function Separator({ inset = 0, style }: SeparatorProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          height: theme.borderWidth.thin,
          backgroundColor: theme.color.borderSubtle,
          marginLeft: inset,
        },
        style,
      ]}
    />
  );
}
