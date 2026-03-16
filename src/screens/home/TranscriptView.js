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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getTranscripts, getTranscript, searchTranscripts, deleteTranscript, getTranscriptShares, shareTranscript, unshareTranscript } from '../../services/api';
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

function formatAudioTime(ms) {
  if (ms == null || isNaN(ms)) return '0:00';
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  const isOwner = item.isOwner !== false;
  const isMeeting = !!item.meetingId;
  const badgeLabel = isMeeting ? 'Meeting' : (isOwner ? 'Mine' : 'Shared');
  const badgeStyle = isMeeting ? styles.meetingBadge : (!isOwner ? styles.sharedBadge : null);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.cardInner}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardSnippet} numberOfLines={3}>
            {snippet}
          </Text>
          <View style={[styles.ownerBadge, badgeStyle]}>
            <Text style={[styles.ownerBadgeText, !isOwner && styles.sharedBadgeText, isMeeting && styles.meetingBadgeText]}>{badgeLabel}</Text>
          </View>
        </View>
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

function ConversationDetail({ transcriptId, initialTranscript, token, user, onClose, onDeleted }) {
  const [transcript, setTranscript] = useState(initialTranscript ?? null);
  const canDelete = transcript
    ? (transcript.meetingId ? user?.companyRole === 'admin' : transcript.isOwner !== false)
    : false;
  const [detailLoading, setDetailLoading] = useState(!!transcriptId);
  const [detailError, setDetailError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shares, setShares] = useState([]);
  const [shareEmail, setShareEmail] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState(null);
  const lines = transcript?.Conversation ?? [];
  const recordingUrl = transcript?.recordingUrl;
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const isMounted = useRef(true);
  const positionInterval = useRef(null);

  useEffect(() => {
    if (!transcriptId) {
      setTranscript(null);
      setDetailLoading(false);
      setShowDeleteConfirm(false);
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

  const isOwner = transcript?.isOwner !== false;

  useEffect(() => {
    if (!transcriptId || !token || !isOwner || String(transcriptId).startsWith('dummy-')) {
      setShares([]);
      return;
    }
    getTranscriptShares(token, transcriptId)
      .then((data) => isMounted.current && setShares(Array.isArray(data) ? data : []))
      .catch(() => isMounted.current && setShares([]));
  }, [transcriptId, token, isOwner]);

  const handleShare = async () => {
    const email = shareEmail.trim().toLowerCase();
    if (!email || !transcriptId || !token || String(transcriptId).startsWith('dummy-')) return;
    setShareLoading(true);
    setShareError(null);
    try {
      await shareTranscript(token, transcriptId, email);
      setShareEmail('');
      const updated = await getTranscriptShares(token, transcriptId);
      setShares(Array.isArray(updated) ? updated : []);
    } catch (err) {
      setShareError(err?.message || 'Failed to share');
    } finally {
      setShareLoading(false);
    }
  };

  const handleUnshare = async (email) => {
    if (!transcriptId || !token || String(transcriptId).startsWith('dummy-')) return;
    setShareLoading(true);
    setShareError(null);
    try {
      await unshareTranscript(token, transcriptId, email);
      const updated = await getTranscriptShares(token, transcriptId);
      setShares(Array.isArray(updated) ? updated : []);
    } catch (err) {
      setShareError(err?.message || 'Failed to unshare');
    } finally {
      setShareLoading(false);
    }
  };

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
      setPosition(0);
      setDuration(0);
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
        const status = await newSound.getStatusAsync();
        if (status.isLoaded && status.durationMillis != null && isMounted.current) {
          setDuration(status.durationMillis);
        }
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
      if (status.isLoaded) {
        if (!status.isPlaying && status.didJustFinishAndNotReset) {
          setIsPlaying(false);
          setPosition(0);
          sound.setPositionAsync(0).catch(() => {});
        } else if (status.durationMillis != null) {
          setDuration(status.durationMillis);
        }
      }
    });
    return () => sub.remove();
  }, [sound]);

  const handleDeletePress = () => setShowDeleteConfirm(true);
  const handleDeleteCancel = () => setShowDeleteConfirm(false);
  const handleDeleteConfirm = async () => {
    if (!transcriptId || !token || String(transcriptId).startsWith('dummy-')) return;
    setDeleting(true);
    setDetailError(null);
    try {
      await deleteTranscript(token, transcriptId);
      onDeleted?.();
      onClose();
    } catch (err) {
      setDetailError(err?.message || 'Failed to delete');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    if (!sound || !isPlaying) {
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
        positionInterval.current = null;
      }
      return;
    }
    const updatePosition = async () => {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && isMounted.current) {
          setPosition(status.positionMillis ?? 0);
          if (status.durationMillis != null) setDuration(status.durationMillis);
        }
      } catch (_) {}
    };
    updatePosition();
    positionInterval.current = setInterval(updatePosition, 250);
    return () => {
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
        positionInterval.current = null;
      }
    };
  }, [sound, isPlaying]);

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
                    <View style={styles.audioBar}>
                      <View style={styles.audioBarTrack}>
                        <View
                          style={[
                            styles.audioBarFill,
                            {
                              width: `${duration > 0 ? Math.min(100, (position / duration) * 100) : 0}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.audioTimeRow}>
                      <Text style={styles.audioTimeText}>{formatAudioTime(position)}</Text>
                      <Text style={styles.audioTimeText}>{formatAudioTime(duration)}</Text>
                    </View>
                    {audioError ? (
                      <Text style={styles.audioErrorText}>{audioError}</Text>
                    ) : null}
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
            {transcript && transcriptId && !String(transcriptId).startsWith('dummy-') && isOwner && !transcript.meetingId && (
              <View style={styles.shareSection}>
                <Text style={styles.shareSectionTitle}>Share with others</Text>
                <Text style={styles.shareHint}>Share with up to 3 people. They can view, listen, and chat with this transcript.</Text>
                <View style={styles.shareInputRow}>
                  <TextInput
                    style={styles.shareInput}
                    placeholder="Enter email address"
                    placeholderTextColor="#99A1AF"
                    value={shareEmail}
                    onChangeText={(t) => { setShareEmail(t); setShareError(null); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleShare}
                    editable={!shareLoading && shares.length < 3}
                  />
                  <TouchableOpacity
                    style={[styles.shareButton, (shareLoading || !shareEmail.trim() || shares.length >= 3) && styles.shareButtonDisabled]}
                    onPress={handleShare}
                    disabled={shareLoading || !shareEmail.trim() || shares.length >= 3}
                  >
                    {shareLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.shareButtonText}>Add</Text>}
                  </TouchableOpacity>
                </View>
                {shareError ? <Text style={styles.shareErrorText}>{shareError}</Text> : null}
                {shares.length > 0 && (
                  <View style={styles.sharesList}>
                    {shares.map((s) => (
                      <View key={s.email} style={styles.shareRow}>
                        <Text style={styles.shareRowEmail}>{s.email}</Text>
                        <TouchableOpacity
                          onPress={() => handleUnshare(s.email)}
                          disabled={shareLoading}
                          style={styles.unshareButton}
                        >
                          <Ionicons name="close-circle" size={22} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            {transcript && transcriptId && !String(transcriptId).startsWith('dummy-') && canDelete && (
              <View style={styles.deleteSection}>
                {showDeleteConfirm ? (
                  <View style={styles.deleteConfirmBox}>
                    <Text style={styles.deleteConfirmText}>Are you sure you want to delete this recording and transcript? This cannot be undone.</Text>
                    <View style={styles.deleteConfirmButtons}>
                      <TouchableOpacity
                        style={styles.deleteConfirmCancel}
                        onPress={handleDeleteCancel}
                        disabled={deleting}
                      >
                        <Text style={styles.deleteConfirmCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteConfirmDelete}
                        onPress={handleDeleteConfirm}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.deleteButtonText}>Yes, Delete</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeletePress}
                    disabled={deleting}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const SEARCH_DEBOUNCE_MS = 500;

export default function TranscriptView() {
  const { token, user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const searchQueryRef = useRef('');

  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || !token) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    const tid = setTimeout(async () => {
      const queryAtSearch = q;
      setSearchLoading(true);
      try {
        const data = await searchTranscripts(token, queryAtSearch);
        if (searchQueryRef.current === queryAtSearch) {
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.warn('Semantic search error:', err);
        if (searchQueryRef.current === queryAtSearch) {
          setSearchResults([]);
        }
      } finally {
        if (searchQueryRef.current === queryAtSearch) {
          setSearchLoading(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(tid);
  }, [searchQuery, token]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return list;
    return searchResults;
  }, [list, searchQuery, searchResults]);

  const emptyMessage = searchQuery.trim()
    ? 'No matching transcripts'
    : 'No transcripts yet';
  const emptySubtitle = searchQuery.trim()
    ? 'Try a different search or describe what you\u2019re looking for.'
    : 'Record a conversation in the Assistant tab, then stop to save and transcribe it here.';

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
              placeholder="Search or describe what you're looking for"
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
      ) : searchQuery.trim() && searchLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={homeColors.accent} />
          <Text style={styles.emptySubtitle}>Searching transcripts…</Text>
        </View>
      ) : filteredList.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={48} color={homeColors.accent} />
          </View>
          <Text style={styles.emptyTitle}>{emptyMessage}</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
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
        user={user}
        onClose={() => setSelected(null)}
        onDeleted={() => load(true)}
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  ownerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  sharedBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  meetingBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  meetingBadgeText: {
    color: '#059669',
  },
  sharedBadgeText: {
    color: '#6366F1',
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: homeColors.accent,
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
  audioBar: {
    width: '100%',
    marginBottom: 4,
  },
  audioBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(152, 16, 250, 0.2)',
    overflow: 'hidden',
  },
  audioBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: homeColors.accent,
  },
  audioTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  audioTimeText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    fontWeight: '500',
    color: homeColors.textMuted,
  },
  audioErrorText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
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
  shareSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(152, 16, 250, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(152, 16, 250, 0.15)',
  },
  shareSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: homeColors.textPrimary,
    marginBottom: 6,
  },
  shareHint: {
    fontSize: 13,
    color: homeColors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  shareInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  shareInput: {
    flex: 1,
    fontSize: 15,
    color: homeColors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(153, 161, 175, 0.35)',
  },
  shareButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: homeColors.accent,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  shareErrorText: {
    fontSize: 13,
    color: '#DC2626',
    marginTop: 8,
  },
  sharesList: {
    marginTop: 12,
    gap: 8,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(153, 161, 175, 0.25)',
  },
  shareRowEmail: {
    fontSize: 14,
    color: homeColors.textPrimary,
  },
  unshareButton: {
    padding: 4,
  },
  deleteSection: {
    marginTop: 24,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#DC2626',
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteConfirmBox: {
    padding: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  deleteConfirmText: {
    fontSize: 14,
    color: homeColors.textPrimary,
    lineHeight: 22,
    marginBottom: 16,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  deleteConfirmCancel: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  deleteConfirmCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: homeColors.textPrimary,
  },
  deleteConfirmDelete: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
