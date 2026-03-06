import React, { useState, useCallback, useMemo } from 'react';
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
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getTranscripts } from '../../services/api';
import { homeColors } from '../../theme/homeColors';

const DUMMY_SNIPPET =
  'The search button should be a submit button for the form, and while a magnifying glass icon can make Better ....';

const DUMMY_TRANSCRIPTS = [
  {
    id: 'dummy-1',
    createdAt: '2026-03-21T00:30:00.000Z',
    Conversation: [{ id: 1, speaker: 'User', text: DUMMY_SNIPPET }],
    status: 'completed',
  },
  {
    id: 'dummy-2',
    createdAt: '2026-03-21T00:30:00.000Z',
    Conversation: [{ id: 2, speaker: 'User', text: DUMMY_SNIPPET }],
    status: 'completed',
  },
  {
    id: 'dummy-3',
    createdAt: '2026-03-21T00:30:00.000Z',
    Conversation: [{ id: 3, speaker: 'User', text: DUMMY_SNIPPET }],
    status: 'completed',
  },
  {
    id: 'dummy-4',
    createdAt: '2026-03-21T00:30:00.000Z',
    Conversation: [{ id: 4, speaker: 'User', text: DUMMY_SNIPPET }],
    status: 'completed',
  },
];

function formatTranscriptDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[d.getDay()]}, ${d.getDate()} ${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
}

function formatTranscriptTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getSnippet(item) {
  const lines = item.Conversation ?? [];
  if (lines.length === 0) {
    return item.status === 'processing' ? 'Transcription in progress…' : 'No transcript yet.';
  }
  const text = lines.map((l) => l.text).join(' ');
  return text.length > 120 ? `${text.slice(0, 120).trim()}....` : text;
}

function TranscriptCard({ item, onPress }) {
  const snippet = getSnippet(item);
  const dateStr = formatTranscriptDate(item.createdAt);
  const timeStr = formatTranscriptTime(item.createdAt);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.cardInner}>
        <Text style={styles.cardSnippet} numberOfLines={3}>
          {snippet}
        </Text>
        <View style={styles.cardMeta}>
          <View style={styles.cardMetaLeft}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{dateStr}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{timeStr}</Text>
            </View>
          </View>
          <View style={styles.viewTranscript}>
            <Text style={styles.viewTranscriptText}>View Transcript</Text>
            <Ionicons name="chevron-forward" size={16} color="#99A1AF" />
          </View>
        </View>
      </View>
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
            <Text style={styles.detailDate}>
              {transcript ? formatTranscriptDate(transcript.createdAt) : ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.detailClose}>
              <Ionicons name="close" size={24} color={homeColors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.detailScroll}
            contentContainerStyle={styles.detailScrollContent}
          >
            {lines.length === 0 ? (
              <Text style={styles.detailEmpty}>
                {transcript?.status === 'processing'
                  ? 'Transcription in progress…'
                  : 'No conversation lines yet.'}
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(
    async (isRefresh = false) => {
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
    },
    [token]
  );

  React.useEffect(() => {
    load();
  }, [load]);

  const displayList = useMemo(() => {
    return list.length > 0 ? list : DUMMY_TRANSCRIPTS;
  }, [list]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return displayList;
    const q = searchQuery.toLowerCase().trim();
    return displayList.filter((item) => {
      const snippet = getSnippet(item).toLowerCase();
      const dateStr = formatTranscriptDate(item.createdAt).toLowerCase();
      return snippet.includes(q) || dateStr.includes(q);
    });
  }, [displayList, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#000" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#99A1AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={homeColors.accent} />
        </View>
      ) : filteredList.length === 0 ? (
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
          data={filteredList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TranscriptCard item={item} onPress={setSelected} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: Math.min(252, width - 80),
    height: 44,
    paddingHorizontal: 16,
    gap: 10,
    backgroundColor: 'rgba(152, 16, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(153, 161, 175, 0.35)',
    borderRadius: 20,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 22,
    color: '#000',
    padding: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    width: '100%',
    minHeight: 135,
    marginBottom: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#9810FA',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 9.9,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardInner: {
    flex: 1,
    gap: 10,
  },
  cardSnippet: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 22,
    color: '#000000',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '400',
    fontSize: 10,
    lineHeight: 22,
    color: '#99A1AF',
  },
  viewTranscript: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewTranscriptText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '400',
    fontSize: 10,
    lineHeight: 22,
    color: '#99A1AF',
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
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 20,
    fontWeight: '700',
    color: homeColors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 15,
    color: homeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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
