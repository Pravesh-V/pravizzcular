import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * A soft radial-feeling wash behind hero content — the Home greeting, the
 * onboarding welcome. One per screen, at most: this is the "bold" accent
 * moment, and it stops being one if it shows up everywhere.
 *
 * Built from a stacked linear gradient rather than a true radial gradient
 * (no radial support in react-native-svg's <RadialGradient> without extra
 * setup cost) — two vertical gradients centred and clipped read as a glow at
 * the sizes this is used.
 */
export function HeroGlow({ height = 260 }: { height?: number }) {
  const theme = useTheme();

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -80,
        left: -60,
        right: -60,
        height,
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={[theme.color.accentGlow, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ width: '140%', height: '100%' }}
      />
    </View>
  );
}
