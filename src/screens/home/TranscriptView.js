import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getTranscripts, getTranscript } from '../../services/api';
import { homeColors } from '../../theme/homeColors';

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

function ConversationDetail({ transcriptId, initialTranscript, token, onClose }) {
  const [transcript, setTranscript] = useState(initialTranscript ?? null);
  const [detailLoading, setDetailLoading] = useState(!!transcriptId);
  const [detailError, setDetailError] = useState(null);
  const lines = transcript?.Conversation ?? [];
  const recordingUrl = transcript?.recordingUrl;
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!transcriptId) {
      setTranscript(null);
      setDetailLoading(false);
      return;
    }
    setTranscript(initialTranscript ?? null);
    if (!token || String(transcriptId).startsWith('dummy-')) {
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    getTranscript(token, transcriptId)
      .then((data) => {
        if (isMounted.current) {
          setTranscript(data);
          setDetailError(null);
        }
      })
      .catch((err) => {
        if (isMounted.current) {
          setDetailError(err?.message || 'Failed to load transcript');
          setTranscript(initialTranscript ?? null);
        }
      })
      .finally(() => {
        if (isMounted.current) setDetailLoading(false);
      });
  }, [transcriptId, token]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!recordingUrl) {
      setSound(null);
      setIsPlaying(false);
      setAudioError(null);
      return undefined;
    }
    let cancelled = false;
    let loadedSound = null;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recordingUrl },
          { shouldPlay: false }
        );
        loadedSound = newSound;
        if (cancelled || !isMounted.current) {
          newSound.unloadAsync();
          return;
        }
        setSound(newSound);
        setAudioError(null);
      } catch (err) {
        if (!cancelled && isMounted.current) {
          setAudioError(err?.message || 'Could not load audio');
        }
      }
    })();
    return () => {
      cancelled = true;
      if (loadedSound) {
        loadedSound.unloadAsync();
      }
      setSound(null);
      setIsPlaying(false);
    };
  }, [recordingUrl]);

  const togglePlayPause = async () => {
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (err) {
      setAudioError(err?.message || 'Playback failed');
    }
  };

  useEffect(() => {
    if (!sound || typeof sound.addListener !== 'function') return;
    const sub = sound.addListener((status) => {
      if (status.isLoaded && !status.isPlaying && status.didJustFinishAndNotReset) {
        setIsPlaying(false);
        sound.setPositionAsync(0).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [sound]);

  return (
    <Modal visible={!!transcriptId} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>Conversation</Text>
            <Text style={styles.detailDate}>
              {transcript ? formatTranscriptDate(transcript.createdAt) : ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.detailClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={homeColors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.detailScroll}
            contentContainerStyle={styles.detailScrollContent}
          >
            {detailLoading ? (
              <View style={styles.detailLoading}>
                <ActivityIndicator size="large" color={homeColors.accent} />
                <Text style={styles.detailLoadingText}>Loading transcript…</Text>
              </View>
            ) : (
            <>
            {detailError && (
              <View style={styles.detailErrorBanner}>
                <Text style={styles.detailErrorText}>{detailError}</Text>
              </View>
            )}
            {recordingUrl ? (
              <View style={styles.audioSection}>
                <Text style={styles.audioSectionTitle}>Listen to recording</Text>
                <View style={styles.audioPlayer}>
                  <TouchableOpacity
                    style={styles.audioPlayBtn}
                    onPress={togglePlayPause}
                    disabled={!!audioError}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={24}
                      color="#fff"
                    />
                  </TouchableOpacity>
                  <View style={styles.audioInfo}>
                    <View style={styles.audioInfoRow}>
                      <Ionicons name="musical-notes" size={20} color={homeColors.accent} />
                      <Text style={styles.audioLabel}>
                        {audioError ? audioError : 'Tap play to listen'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.audioLinkBtn}
                      onPress={() => Linking.openURL(recordingUrl)}
                    >
                      <Ionicons name="open-outline" size={18} color={homeColors.accent} />
                      <Text style={styles.audioLinkText}>Open recording</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : transcript ? (
              <View style={styles.audioSection}>
                <Text style={styles.audioUnavailable}>No recording available</Text>
              </View>
            ) : null}
            <Text style={styles.transcriptTitle}>Transcript</Text>
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
            </>
            )}
          </ScrollView>
        </View>
      </View>
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

  const displayList = useMemo(() => list, [list]);

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
      {/* Top spacer - matches Task screen header padding */}
      <View style={styles.topSpacer} />
      {/* Search bar - matches sidebar in Assistant screen */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBarWrap}>
          {Platform.OS !== 'web' && <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />}
          <View style={[styles.searchGlassOverlay, Platform.OS === 'web' && styles.searchGlassOverlayWeb]} pointerEvents="none" />
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#99A1AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#99A1AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              underlineColorAndroid="transparent"
            />
          </View>
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
          style={styles.list}
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

      <ConversationDetail
        transcriptId={selected?.id}
        initialTranscript={selected}
        token={token}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
    ...Platform.select({ web: { minHeight: '60vh' } }),
  },
  topSpacer: {
    height: 8,
  },
  searchWrapper: {
    paddingHorizontal: 16,
    marginTop: 0,
    marginBottom: 16,
  },
  searchBarWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(153, 161, 175, 0.35)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  searchGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
  },
  searchGlassOverlayWeb: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#000',
    padding: 0,
    ...Platform.select({
      web: { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' },
      android: { textAlignVertical: 'center' },
      default: {},
    }),
  },
  list: {
    flex: 1,
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
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginTop: 4,
    gap: 8,
  },
  cardMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '400',
    fontSize: 13,
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
    fontSize: 13,
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
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 32,
    ...Platform.select({
      web: {
        minHeight: 300,
        maxHeight: '85vh',
      },
    }),
  },
  detailLoading: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  detailLoadingText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    color: homeColors.textMuted,
  },
  detailErrorBanner: {
    padding: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
  },
  detailErrorText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
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
    ...Platform.select({
      web: {
        minHeight: 200,
        maxHeight: '60vh',
      },
    }),
  },
  detailScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  audioSection: {
    marginBottom: 20,
  },
  audioSectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    fontWeight: '700',
    color: homeColors.textPrimary,
    marginBottom: 10,
  },
  audioUnavailable: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    color: homeColors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(152, 16, 250, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(152, 16, 250, 0.2)',
  },
  audioPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: homeColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  audioInfo: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  audioInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingRight: 8,
  },
  audioLinkText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    fontWeight: '600',
    color: homeColors.accent,
  },
  audioLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    fontWeight: '500',
    color: homeColors.textPrimary,
  },
  transcriptTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    fontWeight: '700',
    color: homeColors.textPrimary,
    marginBottom: 12,
    marginTop: 4,
  },
  detailEmpty: {
    fontSize: 15,
    color: homeColors.textMuted,
    textAlign: 'center',
    marginTop: 8,
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
