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
        <Ionicons name="trash-outline" size={20} color="#6A7282" />
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

  const handleDelete = async (id) => {
    if (!token) return;
    try {
      await deleteInformation(token, id);
      setInfoNotes((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err?.message || 'Failed to delete');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header: Notes, plus */}
      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>Notes</Text>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.7}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={homeColors.accent} />
        </TouchableOpacity>
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
                <Text style={styles.emptyText}>No information notes yet. Add one with the + button.</Text>
              ) : (
                infoNotes.map((item) => (
                  <InfoNoteCard
                    key={item.id}
                    text={item.text}
                    onDelete={() => handleDelete(item.id)}
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
              <Text style={styles.modalTitle}>Add Information</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingVertical: 12,
    paddingTop: 8,
  },
  headerBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 22,
    color: '#000000',
  },
  addBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: homeColors.accent,
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
    borderColor: 'rgba(0, 0, 0, 0.07)',
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
});
