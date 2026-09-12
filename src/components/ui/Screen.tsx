import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView. Off for screens that manage their own list. */
  scroll?: boolean;
  /** Horizontal page gutter. */
  padded?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  /** Extra bottom space so content clears the tab bar / sticky footers. */
  bottomInset?: number;
}

export function Screen({
  children,
  scroll = false,
  padded = true,
  style,
  contentContainerStyle,
  bottomInset = 0,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const base: ViewStyle = {
    flex: 1,
    backgroundColor: theme.color.canvas,
  };

  const inner: ViewStyle = {
    paddingTop: insets.top,
    paddingHorizontal: padded ? theme.spacing.lg : 0,
  };

  if (!scroll) {
    return <View style={[base, inner, style]}>{children}</View>;
  }

  return (
    <View style={[base, style]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          inner,
          { paddingBottom: insets.bottom + bottomInset + theme.spacing.xxl },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}
