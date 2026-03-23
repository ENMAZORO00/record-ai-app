import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getInformation, createInformation, deleteInformation } from '../../services/api';
import { homeColors } from '../../theme/homeColors';

// Information note card (green dot, delete button)
function InfoNoteCard({ text, onDelete }) {
  return (
    <View style={[styles.taskCard, styles.infoNoteCard]}>
      <View style={styles.infoDot} />
      <Text style={styles.taskText} numberOfLines={2}>
        {text}
      </Text>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );
}

export default function TaskBarView() {
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
                    text={item.text}
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
    paddingLeft: 20,
  },
  infoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#13A10E',
  },
  taskText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 22,
    color: '#000000',
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
