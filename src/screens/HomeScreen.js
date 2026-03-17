import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  TextInput,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getChats, getChat, createChat, addChatMessage } from '../services/api';
import { homeColors } from '../theme/homeColors';
import AssistantView from './home/AssistantView';
import TaskBarView from './home/TaskBarView';
import TranscriptView from './home/TranscriptView';
const TABS = [
  { id: 'assistant', label: 'Assistant', icon: 'sparkles' },
  { id: 'taskbar', label: 'Tasks', icon: 'cube-outline' },
  { id: 'transcript', label: 'Transcript', icon: 'document-text-outline' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, signOut, token } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('assistant');
  const [assistantResetKey, setAssistantResetKey] = useState(0);
  const [isAssistantMainView, setIsAssistantMainView] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [startInChatView, setStartInChatView] = useState(false);
  const slideAnim = useRef(new Animated.Value(-242)).current;

  const [chatLoading, setChatLoading] = useState(false);
  const [chats, setChats] = useState([]); // { id, title, updatedAt } from API
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatsLoading, setChatsLoading] = useState(false);
  const searchDebounceRef = useRef(null);

  const fetchChats = useCallback(
    async (search = '') => {
      if (!token) return;
      setChatsLoading(true);
      try {
        const { chats: list } = await getChats(token, search);
        setChats(list);
      } catch (err) {
        // Keep existing chats on error
      } finally {
        setChatsLoading(false);
      }
    },
    [token]
  );

  const fetchChat = useCallback(
    async (chatId) => {
      if (!token || !chatId) return;
      try {
        const { chat } = await getChat(token, chatId);
        setCurrentMessages(
          (chat.messages || []).map((m) => ({
            role: m.role,
            text: m.content ?? m.text,
          }))
        );
      } catch (err) {
        setCurrentMessages([]);
      }
    },
    [token]
  );

  useEffect(() => {
    if (sidebarVisible && token) {
      fetchChats(searchQuery);
    }
  }, [sidebarVisible, token, fetchChats]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentChatId && token) {
      fetchChat(currentChatId);
    } else {
      setCurrentMessages([]);
    }
  }, [currentChatId, token, fetchChat]);

  const handleNewChat = () => {
    closeSidebar();
    setActiveTab('assistant');
    setCurrentChatId(null);
    setCurrentMessages([]);
    setStartInChatView(true);
    setAssistantResetKey((k) => k + 1);
  };

  const handleSelectChat = (chatId) => {
    closeSidebar();
    setActiveTab('assistant');
    setCurrentChatId(chatId);
    setStartInChatView(false);
    setAssistantResetKey((k) => k + 1);
  };

  const handleSendMessage = async (text) => {
    const trimmed = text?.trim();
    if (!trimmed || !token || chatLoading) return;
    const userMsg = { role: 'user', text: trimmed };
    const assistantPlaceholder = { role: 'assistant', text: '', isLoading: true };

    setChatLoading(true);

    if (currentChatId) {
      setCurrentMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      try {
        const { content } = await addChatMessage(token, currentChatId, { content: trimmed });
        setCurrentMessages((prev) =>
          prev.slice(0, -1).concat([{ role: 'assistant', text: content }])
        );
        fetchChats(searchQuery);
      } catch (err) {
        const errMsg = err?.message || 'Something went wrong. Please try again.';
        setCurrentMessages((prev) =>
          prev.slice(0, -1).concat([{ role: 'assistant', text: errMsg, isError: true }])
        );
      } finally {
        setChatLoading(false);
      }
      return;
    }

    setCurrentMessages([userMsg, assistantPlaceholder]);
    try {
      const title = trimmed.length > 40 ? `${trimmed.slice(0, 40)}..` : trimmed;
      const { chat } = await createChat(token, { title, content: trimmed });
      setCurrentChatId(chat.id);
      setCurrentMessages(
        (chat.messages || []).map((m) => ({
          role: m.role,
          text: m.content ?? m.text,
        }))
      );
      setChats((prev) => [{ id: chat.id, title: chat.title, updatedAt: chat.updatedAt }, ...prev]);
    } catch (err) {
      const errMsg = err?.message || 'Something went wrong. Please try again.';
      setCurrentMessages([
        userMsg,
        { role: 'assistant', text: errMsg, isError: true },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      if (token && sidebarVisible) fetchChats(text);
      searchDebounceRef.current = null;
    }, 300);
  };

  useEffect(() => {
    if (sidebarVisible) {
      setSidebarMounted(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -242,
        duration: 250,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setSidebarMounted(false);
      });
    }
  }, [sidebarVisible]);

  const closeSidebar = () => setSidebarVisible(false);

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.switchToTranscript) {
        setActiveTab('transcript');
        navigation.setParams({ switchToTranscript: undefined });
      }
    }, [route.params?.switchToTranscript])
  );

  const handleLogout = async () => {
    closeSidebar();
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'assistant':
        return (
          <AssistantView
            key={`assistant-${assistantResetKey}`}
            onSwitchToTranscript={() => setActiveTab('transcript')}
            onStartRecording={() => navigation.navigate('VoiceRecording')}
            onMainViewChange={setIsAssistantMainView}
            startInChatView={startInChatView}
            onConsumedNewChat={() => setStartInChatView(false)}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            currentChatId={currentChatId}
            sending={chatLoading}
          />
        );
      case 'taskbar':
        return <TaskBarView />;
      case 'transcript':
        return <TranscriptView />;
      default:
        return (
          <AssistantView
            key={`assistant-${assistantResetKey}`}
            onSwitchToTranscript={() => setActiveTab('transcript')}
            onStartRecording={() => navigation.navigate('VoiceRecording')}
            onMainViewChange={setIsAssistantMainView}
            startInChatView={startInChatView}
            onConsumedNewChat={() => setStartInChatView(false)}
            messages={currentMessages}
            onSendMessage={handleSendMessage}
            currentChatId={currentChatId}
            sending={chatLoading}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[StyleSheet.absoluteFill, styles.bgFill]} pointerEvents="none" />

      {/* Header: hamburger/back + title/avatar */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {activeTab === 'assistant' ? (
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="menu" size={26} color={homeColors.textPrimary} />
          </TouchableOpacity>
        ) : activeTab === 'transcript' ? (
          <>
            <View style={styles.hamburgerBtn} />
            <Text style={styles.transcriptHeaderTitle}>Transcript</Text>
            <View style={styles.hamburgerBtn} />
          </>
        ) : (
          <View style={styles.hamburgerBtn} />
        )}
        {activeTab !== 'transcript' && <View style={styles.hamburgerBtn} />}
      </View>

      {/* Main content area */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Bottom navigation - pill buttons with gradient (selected) / circle (unselected) */}
      <View style={[styles.tabBar, { marginBottom: insets.bottom + 16 }]}>
        {TABS.map((tab) => {
          const isActive =
            tab.id === 'assistant'
              ? activeTab === 'assistant' && isAssistantMainView
              : activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabPillOuter}
              onPress={() => {
                if (tab.id === 'assistant') {
                  setAssistantResetKey((k) => k + 1);
                  setCurrentChatId(null);
                }
                setActiveTab(tab.id);
              }}
              activeOpacity={0.85}
            >
              {isActive ? (
                <>
                  <LinearGradient
                    colors={['#B366FF', '#7C3AED', '#5B21B6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabPillGradient}
                  >
                    <Ionicons name={tab.icon} size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.tabLabel} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.tabPillCircle}>
                    <Ionicons name={tab.icon} size={24} color="#5B21B6" />
                  </View>
                  <Text style={styles.tabLabel} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sidebar modal */}
      <Modal
        visible={sidebarMounted}
        transparent
        animationType="fade"
        onRequestClose={closeSidebar}
      >
        <Pressable
          style={styles.sidebarOverlay}
          onPress={closeSidebar}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.sidebar,
                {
                  top: 0,
                  height: Dimensions.get('window').height,
                  paddingTop: insets.top,
                  paddingBottom: insets.bottom,
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              {/* Header: Back + Hamburger */}
              <View style={styles.sidebarHeader}>
                <TouchableOpacity
                  style={styles.sidebarBackBtn}
                  onPress={closeSidebar}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={20} color="#000" />
                  <Text style={styles.sidebarBackText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={closeSidebar}
                  activeOpacity={0.7}
                >
                  <Ionicons name="menu" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              {/* New Chat button - primary CTA */}
              <TouchableOpacity
                style={styles.newChatBtnWrap}
                activeOpacity={0.85}
                onPress={handleNewChat}
              >
                <View style={styles.newChatBtn}>
                  <View style={styles.newChatIconWrap}>
                    <Ionicons name="add" size={22} color="#fff" />
                  </View>
                  <Text style={styles.newChatText}>New Chat</Text>
                </View>
              </TouchableOpacity>

              {/* Company / B2B section — only when user is in a company (register flow is on login page) */}
              {user?.companyId ? (
                <View style={styles.companySection}>
                  <Text style={styles.chatHistoryTitle}>Company</Text>
                  <TouchableOpacity
                    style={styles.companyItem}
                    onPress={() => { closeSidebar(); navigation.navigate('Team'); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="people-outline" size={20} color="#9810FA" />
                    <Text style={styles.companyItemText}>Team</Text>
                  </TouchableOpacity>
                  {user?.companyRole === 'admin' && (
                    <TouchableOpacity
                      style={styles.companyItem}
                      onPress={() => { closeSidebar(); navigation.navigate('InviteMembers'); }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="person-add-outline" size={20} color="#9810FA" />
                      <Text style={styles.companyItemText}>Invite members</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* Chat History section */}
                <View style={styles.chatHistorySection}>
                <Text style={styles.chatHistoryTitle}>Chat History</Text>
                <View style={styles.searchBarWrap}>
                  <View style={styles.searchBar}>
                    <View style={styles.searchIconWrap}>
                      <Ionicons name="search" size={18} color="#6B7280" />
                    </View>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search chats..."
                      placeholderTextColor="#9CA3AF"
                      underlineColorAndroid="transparent"
                      value={searchQuery}
                      onChangeText={handleSearchChange}
                    />
                  </View>
                </View>
                <ScrollView
                  style={styles.chatListScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.chatList}>
                    {chatsLoading ? (
                      <Text style={styles.chatItemText}>Loading...</Text>
                    ) : chats.length === 0 ? (
                      <Text style={styles.chatItemText}>No chats yet</Text>
                    ) : (
                    chats.map((chat) => (
                      <TouchableOpacity
                        key={chat.id}
                        style={[styles.chatItem, currentChatId === chat.id && styles.chatItemActive]}
                        activeOpacity={0.7}
                        onPress={() => handleSelectChat(chat.id)}
                      >
                        <Text style={[styles.chatItemText, currentChatId === chat.id && styles.chatItemTextActive]} numberOfLines={1}>
                          {chat.title}
                        </Text>
                      </TouchableOpacity>
                    )))}
                  </View>
                </ScrollView>
              </View>

              {/* Footer: email + company + logout */}
              <View style={[styles.sidebarFooter, { paddingBottom: insets.bottom + 16 }]}>
                <Text style={styles.sidebarFooterEmail} numberOfLines={1}>
                  {user?.email || 'No email'}
                </Text>
                {user?.companyName ? (
                  <Text style={styles.sidebarCompanyName} numberOfLines={1}>
                    {user.companyName} {user.companyRole === 'admin' ? '(Admin)' : ''}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={styles.sidebarFooterLogout}
                  onPress={handleLogout}
                  activeOpacity={0.7}
                >
                  <Ionicons name="log-out-outline" size={20} color={homeColors.logoutRed} />
                  <Text style={styles.sidebarFooterLogoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFD',
    ...Platform.select({ web: { minHeight: '100vh' } }),
  },
  bgFill: {
    backgroundColor: '#FAFBFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  hamburgerBtn: {
    padding: 4,
  },
  transcriptHeaderTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 22,
    color: '#000000',
  },
  content: {
    flex: 1,
    ...Platform.select({ web: { minHeight: 0 } }), // Allows flex child to shrink/expand on web
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 17,
    paddingHorizontal: 10,
    paddingVertical: 14,
    gap: 12,
    borderRadius: 28,
    backgroundColor: 'rgba(248, 246, 255, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabPillOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tabPillGradient: {
    width: '100%',
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  tabPillCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(233, 230, 250, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    color: '#1F2937',
    marginTop: 6,
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    width: 290,
    flexDirection: 'column',
    backgroundColor: '#F5F6F8',
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  sidebarBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sidebarBackText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 22,
    color: '#000000',
  },
  newChatBtnWrap: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: homeColors.accent,
    ...Platform.select({
      ios: {
        shadowColor: '#9810FA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 10,
  },
  newChatIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.2,
    color: '#FFFFFF',
  },
  companySection: {
    marginBottom: 20,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  companyItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  sidebarCompanyName: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 8,
  },
  chatHistorySection: {
    flex: 1,
    minHeight: 0,
  },
  chatHistoryTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 22,
    color: '#000000',
    marginBottom: 20,
  },
  searchBarWrap: {
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: '#111827',
    padding: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
      android: {
        textAlignVertical: 'center',
      },
    }),
  },
  chatListScroll: {
    flex: 1,
  },
  chatList: {
    gap: 18,
    paddingBottom: 16,
  },
  chatItem: {
    paddingVertical: 4,
  },
  chatItemText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 22,
    color: '#000000',
  },
  chatItemActive: {
    backgroundColor: 'rgba(152, 16, 250, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  chatItemTextActive: {
    color: homeColors.accent,
    fontWeight: '600',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(153, 161, 175, 0.25)',
    paddingTop: 16,
    marginTop: 8,
  },
  sidebarFooterEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    paddingRight: 8,
  },
  sidebarFooterLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  sidebarFooterLogoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: homeColors.logoutRed,
  },
});
