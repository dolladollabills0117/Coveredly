import { View } from 'react-native';
import { colors, fonts } from '../lib/theme';
import { H2 } from './ui';

/** Wordmark. Swap for the real logo image (assets/logo.png) when you have it. */
export function Logo({ light = false, size = 26 }: { light?: boolean; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: size * 0.95, height: size * 0.95, borderRadius: size * 0.32, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: size * 0.38, height: size * 0.38, borderRadius: size, borderWidth: size * 0.09, borderColor: colors.white }} />
      </View>
      <H2 style={{ fontSize: size, lineHeight: size * 1.2, color: light ? colors.white : colors.ink, fontFamily: fonts.display }}>coveredly</H2>
    </View>
  );
}
