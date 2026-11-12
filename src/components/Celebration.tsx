import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Platform, StyleSheet, View } from 'react-native';
import { api } from '../lib/backend';
import { useLive } from '../lib/hooks';
import { localNotify } from '../lib/push';
import { colors, fonts } from '../lib/theme';
import type { AppNotification } from '../lib/types';
import { Body, Button, H1 } from './ui';

const CONFETTI = [colors.orange, '#FFB766', colors.ink, '#FFD6AE', colors.green, '#FF9F45'];

type Piece = { x: number; delay: number; duration: number; size: number; color: string; spin: number; drift: number; round: boolean; anim: Animated.Value };

function makePieces(): Piece[] {
  const { width } = Dimensions.get('window');
  return Array.from({ length: 70 }, (_, i) => ({
    x: Math.random() * width, delay: Math.random() * 600, duration: 2600 + Math.random() * 1200, size: 6 + Math.random() * 8,
    color: CONFETTI[i % CONFETTI.length], spin: Math.random() > 0.5 ? 1 : -1, drift: (Math.random() - 0.5) * 120,
    round: Math.random() > 0.6, anim: new Animated.Value(0),
  }));
}

function Confetti() {
  // Random layout is generated once, when the confetti first mounts.
  const [pieces] = useState(makePieces);
  const { height } = Dimensions.get('window');
  useEffect(() => {
    Animated.stagger(12, pieces.map((p) => Animated.timing(p.anim, {
      toValue: 1, duration: p.duration, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }))).start();
  }, [pieces]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.x, top: -20, width: p.size, height: p.round ? p.size : p.size * 0.45,
          borderRadius: p.round ? p.size : 2, backgroundColor: p.color,
          transform: [
            { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
            { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
            { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin * 720}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}

/** Watches for new "Established" notifications and throws a party on whichever side is signed in. */
export function CelebrationHost() {
  const { data } = useLive(() => api.listNotifications().catch(() => [] as AppNotification[]));
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [scale] = useState(() => new Animated.Value(0.6));
  const current = data?.find((n) => n.kind === 'established' && !n.read && !dismissed.includes(n.id)) ?? null;
  const currentId = current?.id;

  // Side effects only (no state updates): buzz, system notification and pop-in animation, once per celebration.
  useEffect(() => {
    if (!current) return;
    localNotify(current.title, current.body);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    scale.setValue(0.6);
    Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the id so data refreshes don't replay it
  }, [currentId, scale]);

  if (!current) return null;
  const close = async () => { setDismissed((d) => [...d, current.id]); await api.markNotificationRead(current.id); };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View style={st.backdrop}>
        <Confetti key={current.id} />
        <Animated.View style={[st.card, { transform: [{ scale }] }]}>
          <View style={st.badge}><Ionicons name="heart" size={40} color={colors.white} /></View>
          <H1 style={{ textAlign: 'center' }}>{current.title}</H1>
          <Body style={{ textAlign: 'center', color: colors.inkSoft }}>{current.body}</Body>
          <View style={st.steps}>
            {['Call', 'Quote', 'Policy', 'Review'].map((t) => (
              <View key={t} style={st.step}>
                <Ionicons name="checkmark-circle" size={22} color={colors.green} />
                <Body style={st.stepText}>{t}</Body>
              </View>
            ))}
          </View>
          <Button title="Celebrate 🧡" onPress={close} style={{ alignSelf: 'stretch' }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.cream, borderRadius: 32, padding: 28, alignItems: 'center', gap: 14, width: '100%', maxWidth: 400 },
  badge: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', marginTop: -70, borderWidth: 6, borderColor: colors.cream },
  steps: { flexDirection: 'row', gap: 12, marginVertical: 6 },
  step: { alignItems: 'center', gap: 2 },
  stepText: { fontFamily: fonts.semibold, fontSize: 12 },
});
