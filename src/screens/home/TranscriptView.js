import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getTranscripts } from '../../services/api';
import { homeColors } from '../../theme/homeColors';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function TranscriptListItem({ item, onPress }) {
  const statusLabel = item.status === 'completed' ? 'Ready' : item.status === 'failed' ? 'Failed' : 'Processing…';
  const lineCount = item.Conversation?.length ?? 0;

  return (
    <TouchableOpacity style={styles.listItem} onPress={() => onPress(item)} activeOpacity={0.7}>
      <View style={styles.listItemIcon}>
        <Ionicons name="mic-outline" size={24} color={homeColors.accent} />
      </View>
      <View style={styles.listItemBody}>
        <Text style={styles.listItemDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.listItemMeta}>
          {statusLabel}
          {lineCount > 0 && ` · ${lineCount} lines`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={homeColors.textMuted} />
    </TouchableOpacity>
  );
}

function ConversationDetail({ transcript, onClose }) {
  const lines = transcript?.Conversation ?? [];
  return (
    <Modal visible={!!transcript} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.detailCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>Conversation</Text>
            <Text style={styles.detailDate}>{transcript ? formatDate(transcript.createdAt) : ''}</Text>
            <TouchableOpacity onPress={onClose} style={styles.detailClose}>
              <Ionicons name="close" size={24} color={homeColors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
            {lines.length === 0 ? (
              <Text style={styles.detailEmpty}>
                {transcript?.status === 'processing' ? 'Transcription in progress…' : 'No conversation lines yet.'}
              </Text>
            ) : (
              lines.map((line) => (
                <View key={line.id} style={styles.convLine}>
                  <Text style={styles.convSpeaker}>{line.speaker}</Text>
                  <Text style={styles.convText}>{line.text}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function TranscriptView() {
  const { token } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!isRefresh) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getTranscripts(token);
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Load transcripts error:', err);
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transcripts</Text>
        <Text style={styles.subtitle}>
          Your recorded conversations and their transcripts. Tap one to read.
        </Text>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={homeColors.accent} />
        </View>
      ) : list.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={48} color={homeColors.accent} />
          </View>
          <Text style={styles.emptyTitle}>No transcripts yet</Text>
          <Text style={styles.emptySubtitle}>
            Record a conversation in the Assistant tab, then stop to save and transcribe it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TranscriptListItem item={item} onPress={setSelected} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              colors={[homeColors.accent]}
            />
          }
        />
      )}
      <ConversationDetail transcript={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: homeColors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: homeColors.textSecondary,
    lineHeight: 22,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: homeColors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: homeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  listItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  listItemBody: {
    flex: 1,
  },
  listItemDate: {
    fontSize: 16,
    fontWeight: '600',
    color: homeColors.textPrimary,
  },
  listItemMeta: {
    fontSize: 13,
    color: homeColors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: homeColors.textPrimary,
  },
  detailDate: {
    fontSize: 14,
    color: homeColors.textMuted,
  },
  detailClose: {
    padding: 4,
  },
  detailScroll: {
    maxHeight: 400,
  },
  detailScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  detailEmpty: {
    fontSize: 15,
    color: homeColors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  convLine: {
    marginBottom: 16,
  },
  convSpeaker: {
    fontSize: 13,
    fontWeight: '700',
    color: homeColors.accent,
    marginBottom: 4,
  },
  convText: {
    fontSize: 16,
    color: homeColors.textPrimary,
    lineHeight: 24,
  },
});
