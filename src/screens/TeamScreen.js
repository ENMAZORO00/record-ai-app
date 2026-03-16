import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getCompanyMembers, createMeeting } from '../services/api';
import { homeColors } from '../theme/homeColors';

export default function TeamScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchMembers = useCallback(async (isRefresh = false) => {
    if (!token) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getCompanyMembers(token);
      setMembers(data.members || []);
    } catch (err) {
      setError(err?.message || 'Failed to load team');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

  const toggleMember = (id) => {
    if (id === user?.id) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startMeetingAndRecord = async () => {
    setError('');
    setCreating(true);
    try {
      const participantUserIds = [...selectedIds];
      const data = await createMeeting(token, participantUserIds);
      setSelectedIds(new Set());
      navigation.navigate('VoiceRecording', { meetingId: data.meetingId });
    } catch (err) {
      setError(err?.message || 'Failed to start meeting');
    } finally {
      setCreating(false);
    }
  };

  const otherMembers = members.filter((m) => m.id !== user?.id);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team</Text>
        <View style={styles.headerSpacer} />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actions}>
        <Text style={styles.hint}>Select colleagues to record with, then start recording.</Text>
        <TouchableOpacity
          style={[styles.startBtn, (creating || (otherMembers.length === 0 && selectedIds.size === 0)) && styles.startBtnDisabled]}
          onPress={startMeetingAndRecord}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="mic" size={20} color="#fff" />
              <Text style={styles.startBtnText}>
                {selectedIds.size > 0 ? `Start recording with ${selectedIds.size} participant(s)` : 'Start solo recording'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={homeColors.accent} />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchMembers(true)} />
          }
          ListEmptyComponent={<Text style={styles.empty}>No team members yet.</Text>}
          renderItem={({ item }) => {
            const isSelf = item.id === user?.id;
            const isSelected = selectedIds.has(item.id);
            return (
              <TouchableOpacity
                style={[styles.memberRow, isSelected && styles.memberRowSelected]}
                onPress={() => !isSelf && toggleMember(item.id)}
                activeOpacity={0.7}
                disabled={isSelf}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {(item.name || item.email || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {item.name || 'No name'}
                    {item.companyRole === 'admin' ? ' (Admin)' : ''}
                    {isSelf ? ' (You)' : ''}
                  </Text>
                  <Text style={styles.memberEmail} numberOfLines={1}>{item.email}</Text>
                </View>
                {!isSelf && (
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFBFD' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#000' },
  headerSpacer: { width: 32 },
  errorText: { color: '#dc2626', padding: 16, fontSize: 14 },
  actions: { padding: 16, paddingBottom: 8 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5810fa',
    paddingVertical: 14,
    borderRadius: 12,
  },
  startBtnDisabled: { opacity: 0.7 },
  startBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  list: { padding: 16, paddingTop: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  memberRowSelected: { borderColor: '#5810fa', backgroundColor: 'rgba(88, 16, 250, 0.06)' },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e9d5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: { fontSize: 18, fontWeight: '600', color: '#5810fa' },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 16, fontWeight: '500', color: '#000' },
  memberEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: '#5810fa', borderColor: '#5810fa' },
});
