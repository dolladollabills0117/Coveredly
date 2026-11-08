import { memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { usePrefs } from '../lib/prefs';

const GAP = 28; // distance between dots
const SIZE = 5; // dot diameter
const COLOR = 'rgba(255, 122, 0, 0.16)'; // brand orange, softened so text stays readable

/** Coveredly's signature polka-dot background. Sits behind content; toggled in Profile. */
export const PolkaDots = memo(function PolkaDots() {
  const { dots } = usePrefs();
  const { width, height } = useWindowDimensions();
  const pts = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (let r = 0; r * GAP < height + GAP; r++)
      for (let c = 0; c * GAP < width + GAP; c++) out.push({ x: c * GAP + (r % 2 ? GAP / 2 : 0), y: r * GAP });
    return out;
  }, [width, height]);
  if (!dots) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pts.map((p, i) => (
        <View key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: COLOR }} />
      ))}
    </View>
  );
});
