import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Platform, StyleSheet, View } from 'react-native';
import { api } from '../lib/backend';
import { useLive } from '../lib/hooks';
import { localNotify } from '../lib/push';
import { colors, fonts } from '../lib/theme';
import type { AppNotification } from '../lib/types';
import { Body, Button, H1 } from './ui';

const CONFETTI = [colors.orange, '#FFB766', colors.ink, '#FFD6AE', colors.green, '#FF9F45'];

function Confetti() {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    x: Math.random() * width, delay: Math.random() * 600, size: 6 + Math.random() * 8,
    color: CONFETTI[i % CONFETTI.length], spin: Math.random() > 0.5 ? 1 : -1, drift: (Math.random() - 0.5) * 120, round: Math.random() > 0.6,
  })), [width]);
  const anims = useRef(pieces.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(12, anims.map((a, i) => Animated.timing(a, {
      toValue: 1, duration: 2600 + Math.random() * 1200, delay: pieces[i].delay, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }))).start();
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: p.x, top: -20, width: p.size, height: p.round ? p.size : p.size * 0.45,
          borderRadius: p.round ? p.size : 2, backgroundColor: p.color,
          transform: [
            { translateY: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
            { translateX: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
            { rotate: anims[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin * 720}deg`] }) },
          ],
        }} />
      ))}
    </View>
  );
}

/** Watches for new "Established" notifications and throws a party on whichever side is signed in. */
export function CelebrationHost() {
  const { data } = useLive(() => api.listNotifications().catch(() => [] as AppNotification[]));
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const next = data?.find((n) => n.kind === 'established' && !n.read);
    if (next && next.id !== current?.id) {
      setCurrent(next);
      localNotify(next.title, next.body);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      scale.setValue(0.6);
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    }
  }, [data]);

  if (!current) return null;
  const close = async () => { await api.markNotificationRead(current.id); setCurrent(null); };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View style={st.backdrop}>
        <Confetti />
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
