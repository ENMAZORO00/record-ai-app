import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getInformation, createInformation, deleteInformation } from '../../services/api';
import { homeColors } from '../../theme/homeColors';

const LIST_PREVIEW_MAX_CHARS = 100;

function truncateChars(s, max) {
  const t = (s || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function getDisplayTitle(note) {
  if (note.title && String(note.title).trim()) return String(note.title).trim();
  const first = (note.text || '').split('\n')[0]?.trim() || '';
  if (first) return truncateChars(first, 72);
  return 'Note';
}

function getPreviewPlain(note) {
  const t = (note.text || '').replace(/\s+/g, ' ').trim();
  return truncateChars(t, LIST_PREVIEW_MAX_CHARS);
}

/** Full title for detail modal (no list preview truncation). */
function getDetailTitle(note) {
  if (note.title && String(note.title).trim()) return String(note.title).trim();
  const first = (note.text || '').split('\n')[0]?.trim() || '';
  if (first) return first;
  return 'Note';
}

/** @param {{ bullets?: unknown, text?: string }} note */
function getBulletLines(note) {
  if (Array.isArray(note.bullets) && note.bullets.length > 0) {
    return note.bullets
      .filter((b) => typeof b === 'string' && b.trim())
      .map((b) => b.trim());
  }
  const raw = (note.text || '').trim();
  if (!raw) return [];
  return raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
}

// Information note card: title + fixed-length preview; tap opens detail (delete is separate)
function InfoNoteCard({ title, preview, onPress, onDelete }) {
  return (
    <View style={[styles.taskCard, styles.infoNoteCard]}>
      <TouchableOpacity
        style={styles.infoCardPressable}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Open note: ${title}`}
      >
        <View style={styles.infoDot} />
        <View style={styles.infoCardTextCol}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.notePreview} numberOfLines={2}>
            {preview}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Delete note"
      >
        <Ionicons name="trash-outline" size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );
}

const DETAIL_MODAL_MAX_HEIGHT_RATIO = 0.7;
/** Top + bottom padding on the white card (detailModalContent + merged modalContent). */
const DETAIL_CARD_VERTICAL_INSET = 32;

export default function TaskBarView() {
  const { height: windowHeight } = useWindowDimensions();
  const { token } = useAuth();
  const [infoNotes, setInfoNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newInfoText, setNewInfoText] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [detailNote, setDetailNote] = useState(null);
  const [detailContentHeight, setDetailContentHeight] = useState(0);

  const detailModalMaxHeight = windowHeight * DETAIL_MODAL_MAX_HEIGHT_RATIO;
  const detailScrollViewportMax = Math.max(
    0,
    detailModalMaxHeight - DETAIL_CARD_VERTICAL_INSET
  );
  const detailNeedsScroll = detailContentHeight > detailScrollViewportMax;
  const detailCardHeight =
    detailContentHeight > 0
      ? Math.min(detailContentHeight + DETAIL_CARD_VERTICAL_INSET, detailModalMaxHeight)
      : undefined;

  useEffect(() => {
    setDetailContentHeight(0);
  }, [detailNote?.id]);

  const fetchInfoNotes = useCallback(async (showRefreshing = false) => {
    if (!token) return;
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getInformation(token);
      setInfoNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (token) fetchInfoNotes();
    }, [token, fetchInfoNotes])
  );

  const handleAddInfo = async () => {
    const trimmed = newInfoText.trim();
    if (!trimmed || !token || addLoading) return;
    setAddLoading(true);
    try {
      const item = await createInformation(token, { text: trimmed });
      setInfoNotes((prev) => [item, ...prev]);
      setNewInfoText('');
      setModalVisible(false);
    } catch (err) {
      setError(err?.message || 'Failed to add information');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeletePress = (id) => {
    setNoteToDelete(id);
    setDeleteConfirmVisible(true);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmVisible(false);
    setNoteToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!token || !noteToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteInformation(token, noteToDelete);
      setInfoNotes((prev) => prev.filter((item) => item.id !== noteToDelete));
      setDetailNote((n) => (n && n.id === noteToDelete ? null : n));
      setDeleteConfirmVisible(false);
      setNoteToDelete(null);
    } catch (err) {
      setError(err?.message || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Centered title + right-aligned Add note */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
        <View style={styles.headerAddRow}>
          <View style={styles.addBtnShadow}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Add notes"
            >
              <LinearGradient
                colors={[homeColors.accent, homeColors.accentMuted]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.addBtnGradient}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addBtnLabel}>Add note</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchInfoNotes(true)}
            tintColor={homeColors.accent}
          />
        }
      >
        {error ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <View style={styles.section}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={homeColors.accent} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {infoNotes.length === 0 ? (
                <Text style={styles.emptyText}>
                  No information notes yet. Tap Add note to create one.
                </Text>
              ) : (
                infoNotes.map((item) => (
                  <InfoNoteCard
                    key={item.id}
                    title={getDisplayTitle(item)}
                    preview={getPreviewPlain(item)}
                    onPress={() => setDetailNote(item)}
                    onDelete={() => handleDeletePress(item.id)}
                  />
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Information Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.modalContent}
            >
              <Text style={styles.modalTitle}>Add Notes</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Describe your information..."
                placeholderTextColor="#9CA3AF"
                value={newInfoText}
                onChangeText={setNewInfoText}
                multiline
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => {
                    setNewInfoText('');
                    setModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnAdd]}
                  onPress={handleAddInfo}
                  activeOpacity={0.7}
                  disabled={addLoading}
                >
                  {addLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalBtnAddText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Note detail — height follows content up to 70% of window, then scrolls */}
      <Modal
        visible={!!detailNote}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailNote(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDetailNote(null)}
        >
          <View style={[styles.modalContainer, styles.detailModalVerticalPad]}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.modalContent,
                styles.detailModalContent,
                { maxHeight: detailModalMaxHeight },
                detailCardHeight != null && { height: detailCardHeight },
                detailContentHeight === 0 && detailNote && { minHeight: 100 },
              ]}
            >
              <ScrollView
                style={styles.detailScrollFlex}
                contentContainerStyle={styles.detailScrollContent}
                showsVerticalScrollIndicator={detailNeedsScroll}
                scrollEnabled={detailNeedsScroll}
                keyboardShouldPersistTaps="handled"
                bounces={detailNeedsScroll}
                onContentSizeChange={(_, h) => setDetailContentHeight(h)}
              >
                <View style={styles.detailModalHeader}>
                  <Text style={styles.detailModalTitle}>
                    {detailNote ? getDetailTitle(detailNote) : ''}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setDetailNote(null)}
                    style={styles.detailCloseBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Close"
                  >
                    <Ionicons name="close" size={26} color="#6A7282" />
                  </TouchableOpacity>
                </View>
                {(detailNote ? getBulletLines(detailNote) : []).map((line, idx) => (
                  <View key={`${idx}-${line.slice(0, 24)}`} style={styles.bulletRow}>
                    <Text style={styles.bulletGlyph}>•</Text>
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))}
                {detailNote && getBulletLines(detailNote).length === 0 ? (
                  <Text style={styles.bulletTextMuted}>No content.</Text>
                ) : null}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleDeleteCancel}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modalContent, styles.deleteModalContent]}
          >
            <Text style={styles.modalTitle}>Delete Note</Text>
            <Text style={styles.deleteConfirmText}>
              Are you sure you want to delete this note? This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={handleDeleteCancel}
                activeOpacity={0.7}
                disabled={deleteLoading}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.deleteConfirmBtn]}
                onPress={handleDeleteConfirm}
                activeOpacity={0.7}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnAddText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  headerTitle: {
    width: '100%',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 22,
    color: '#000000',
  },
  headerAddRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  addBtnShadow: {
    borderRadius: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: homeColors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 22,
  },
  addBtnLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: {
    gap: 12,
    marginBottom: 44,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 22,
    color: '#6A7282',
  },
  cardList: {
    gap: 9,
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  loadingText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 14,
    color: '#6A7282',
  },
  emptyText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 14,
    color: '#9CA3AF',
    paddingVertical: 24,
    textAlign: 'center',
  },
  errorWrap: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontSize: 14,
    color: '#DC2626',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 23,
    paddingHorizontal: 25,
    paddingLeft: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.28)',
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(152, 16, 250, 0.08)',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 9.9,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  infoNoteCard: {
    paddingLeft: 14,
    paddingVertical: 16,
    alignItems: 'stretch',
  },
  infoCardPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    minWidth: 0,
  },
  infoCardTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  noteTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 20,
    color: '#111827',
  },
  notePreview: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 18,
    color: '#6A7282',
  },
  infoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#13A10E',
  },
  detailModalVerticalPad: {
    paddingVertical: 28,
  },
  detailModalContent: {
    paddingTop: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  detailModalTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 17,
    lineHeight: 22,
    color: '#111827',
    letterSpacing: -0.3,
  },
  detailCloseBtn: {
    padding: 4,
    marginTop: -4,
  },
  detailScrollFlex: {
    flex: 1,
  },
  detailScrollContent: {
    paddingBottom: 8,
    paddingHorizontal: 4,
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletGlyph: {
    fontSize: 16,
    lineHeight: 22,
    color: homeColors.accent,
    marginTop: 1,
    width: 14,
    textAlign: 'center',
  },
  bulletText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
  },
  bulletTextMuted: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 14,
    color: '#9CA3AF',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 18,
    color: '#111827',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    minHeight: 88,
    textAlignVertical: 'top',
    marginBottom: 24,
    backgroundColor: '#FAFAFA',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalBtnCancel: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  modalBtnCancelText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 16,
    color: '#6A7282',
  },
  modalBtnAdd: {
    backgroundColor: homeColors.accent,
    borderColor: homeColors.accent,
  },
  modalBtnAddText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 16,
    color: '#FFFFFF',
  },
  deleteModalContent: {
    marginHorizontal: 24,
  },
  deleteConfirmText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 15,
    color: '#6A7282',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteConfirmBtn: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
});
