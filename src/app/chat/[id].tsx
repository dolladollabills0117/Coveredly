import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, H3, Small } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/backend';
import { timeAgo, useLive } from '../../lib/hooks';
import { colors, fonts, radius, space } from '../../lib/theme';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: m } = useLive(() => api.getMatch(id), [id]);
  const { data: msgs } = useLive(() => api.listMessages(id), [id]);
  const [text, setText] = useState('');
  const list = useRef<FlatList>(null);
  useEffect(() => { setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50); }, [msgs?.length]);
  const other = user?.role === 'agent' ? m?.policyholder?.fullName : m?.agent?.fullName;

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    await api.sendMessage(id, body);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.peach }} edges={['top', 'bottom']}>
      <View style={st.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={26} color={colors.ink} /></Pressable>
        <View style={{ flex: 1 }}>
          <H3>{other}</H3>
          <Small>{user?.role === 'agent' ? 'Your Coveredly lead' : 'Your Coveredly agent'}</Small>
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={list}
          data={msgs ?? []}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: space(4), gap: 8 }}
          ListEmptyComponent={<Small style={{ textAlign: 'center', marginTop: space(10) }}>Say hi 👋 Messages stay private between you two.</Small>}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <View style={[st.bubble, mine ? st.mine : st.theirs]}>
                  <Body style={{ color: mine ? colors.white : colors.ink }}>{item.body}</Body>
                </View>
                <Small style={{ fontSize: 11, marginTop: 2, marginHorizontal: 6 }}>{timeAgo(item.createdAt)}</Small>
              </View>
            );
          }}
        />
        <View style={st.composer}>
          <TextInput value={text} onChangeText={setText} placeholder="Message" placeholderTextColor="#A8998B" style={st.input} multiline onSubmitEditing={send} />
          <Pressable onPress={send} disabled={!text.trim()} style={[st.send, !text.trim() && { opacity: 0.4 }]}>
            <Ionicons name="arrow-up" size={22} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space(4), paddingVertical: space(3), borderBottomWidth: 1, borderBottomColor: colors.line },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  mine: { backgroundColor: colors.orange, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.cream, borderBottomLeftRadius: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: space(3), borderTopWidth: 1, borderTopColor: colors.line },
  input: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 12, fontFamily: fonts.body, fontSize: 16, maxHeight: 120, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
});
