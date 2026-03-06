import React, { useState, useEffect, useRef } from 'react';
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
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { homeColors } from '../theme/homeColors';
import AssistantView from './home/AssistantView';
import TaskBarView from './home/TaskBarView';
import TranscriptView from './home/TranscriptView';
import MindMapView from './home/MindMapView';
const TABS = [
  { id: 'assistant', label: 'Assistant', icon: 'sparkles' },
  { id: 'taskbar', label: 'Tasks', icon: 'cube-outline' },
  { id: 'transcript', label: 'Transcript', icon: 'document-text-outline' },
  { id: 'mindmap', label: 'Mindmap', icon: 'bulb-outline' },
];

function getInitials(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('assistant');
  const [assistantResetKey, setAssistantResetKey] = useState(0);
  const [isAssistantMainView, setIsAssistantMainView] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [startInChatView, setStartInChatView] = useState(false);
  const slideAnim = useRef(new Animated.Value(-242)).current;

  // Chats: { id, title, messages: [{ role, text, isLoading? }] }
  const [chats, setChats] = useState(() => [
    {
      id: 'chat-1',
      title: 'My Yesterday chat history of..',
      messages: [
        { role: 'user', text: 'Summarize my meeting from yesterday' },
        { role: 'assistant', text: 'Here’s a summary of your meeting...' },
      ],
    },
    {
      id: 'chat-2',
      title: 'My Today chat history one..',
      messages: [
        { role: 'user', text: 'What were the action items?' },
        { role: 'assistant', text: 'The main action items were...' },
      ],
    },
    {
      id: 'chat-3',
      title: 'During my meeting chat on..',
      messages: [
        { role: 'user', text: 'Help me with the transcript' },
        { role: 'assistant', text: 'Searching precise transcri...', isLoading: true },
      ],
    },
  ]);
  const [currentChatId, setCurrentChatId] = useState(null);

  const currentMessages = currentChatId
    ? (chats.find((c) => c.id === currentChatId)?.messages ?? [])
    : [];

  const handleNewChat = () => {
    closeSidebar();
    setActiveTab('assistant');
    setCurrentChatId(null);
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

  const handleSendMessage = (text) => {
    const trimmed = text?.trim();
    if (!trimmed) return;
    const userMsg = { role: 'user', text: trimmed };
    const assistantPlaceholder = { role: 'assistant', text: 'Searching precise transcri...', isLoading: true };

    if (currentChatId) {
      setChats((prev) =>
        prev.map((c) =>
          c.id === currentChatId
            ? { ...c, messages: [...c.messages, userMsg, assistantPlaceholder] }
            : c
        )
      );
    } else {
      const newId = `chat-${Date.now()}`;
      const title = trimmed.length > 40 ? `${trimmed.slice(0, 40)}..` : trimmed;
      setChats((prev) => [
        { id: newId, title, messages: [userMsg, assistantPlaceholder] },
        ...prev,
      ]);
      setCurrentChatId(newId);
    }
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
    setAvatarMenuVisible(false);
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
          />
        );
      case 'taskbar':
        return <TaskBarView />;
      case 'transcript':
        return <TranscriptView />;
      case 'mindmap':
        return <MindMapView />;
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
          <TouchableOpacity
            style={styles.transcriptHeaderLeft}
            onPress={() => setActiveTab('assistant')}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
            <Text style={styles.transcriptHeaderTitle}>Transcript..</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.hamburgerBtn} />
        )}
        {activeTab !== 'transcript' && (
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => setAvatarMenuVisible(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.avatar, { backgroundColor: homeColors.accent }]}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Main content area */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Bottom navigation - rgba(255,255,255,0.13), borderRadius 20 */}
      <View style={[styles.tabBar, { marginBottom: insets.bottom + 16 }]}>
        {TABS.map((tab) => {
          const isActive =
            tab.id === 'assistant'
              ? activeTab === 'assistant' && isAssistantMainView
              : activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.glassButton, isActive && styles.glassButtonActive]}
              onPress={() => {
                if (tab.id === 'assistant') {
                  setAssistantResetKey((k) => k + 1);
                  setCurrentChatId(null);
                }
                setActiveTab(tab.id);
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name={tab.icon}
                size={24}
                color={isActive ? '#9810FA' : '#99A1AF'}
              />
              <Text
                style={[styles.glassLabel, isActive && styles.glassLabelActive]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
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

              {/* New Chat button - glass style */}
              <TouchableOpacity
                style={styles.newChatBtnWrap}
                activeOpacity={0.8}
                onPress={handleNewChat}
              >
                <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                <View style={styles.newChatGlassOverlay} pointerEvents="none" />
                <View style={styles.newChatBtn}>
                  <Svg width={20} height={20} viewBox="0 0 21 21" fill="none">
                    <Path
                      d="M14.612 2.98725L16.299 1.29925C16.6507 0.94757 17.1277 0.75 17.625 0.75C18.1223 0.75 18.5993 0.94757 18.951 1.29925C19.3027 1.65092 19.5002 2.1279 19.5002 2.62525C19.5002 3.12259 19.3027 3.59957 18.951 3.95125L8.332 14.5702C7.80332 15.0986 7.15137 15.487 6.435 15.7002L3.75 16.5002L4.55 13.8152C4.76328 13.0989 5.15163 12.4469 5.68 11.9182L14.612 2.98725ZM14.612 2.98725L17.25 5.62525M15.75 12.5002V17.2502C15.75 17.847 15.5129 18.4193 15.091 18.8412C14.669 19.2632 14.0967 19.5002 13.5 19.5002H3C2.40326 19.5002 1.83097 19.2632 1.40901 18.8412C0.987053 18.4193 0.75 17.847 0.75 17.2502V6.75025C0.75 6.15351 0.987053 5.58121 1.40901 5.15926C1.83097 4.7373 2.40326 4.50025 3 4.50025H7.75"
                      stroke="#99A1AF"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <Text style={styles.newChatText}>New Chat..</Text>
                </View>
              </TouchableOpacity>

              {/* Chat History section */}
                <View style={styles.chatHistorySection}>
                <Text style={styles.chatHistoryTitle}>Chat History</Text>
                <View style={styles.searchBarWrap}>
                  <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
                  <View style={styles.searchGlassOverlay} pointerEvents="none" />
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#99A1AF" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search"
                      placeholderTextColor="#99A1AF"
                      underlineColorAndroid="transparent"
                    />
                  </View>
                </View>
                <ScrollView
                  style={styles.chatListScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.chatList}>
                    {chats.map((chat) => (
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
                    ))}
                  </View>
                </ScrollView>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Avatar menu: user email + logout */}
      <Modal
        visible={avatarMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarMenuVisible(false)}
      >
        <Pressable
          style={styles.avatarMenuOverlay}
          onPress={() => setAvatarMenuVisible(false)}
        >
          <Pressable
            style={[styles.avatarMenuCard, { top: insets.top + 60 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.avatarMenuEmail}>{user?.email || 'No email'}</Text>
            <TouchableOpacity
              style={styles.avatarMenuLogout}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color={homeColors.logoutRed} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
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
  transcriptHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transcriptHeaderTitle: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 22,
    color: '#000000',
  },
  avatarWrap: {
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'android' && { overflow: 'hidden' }),
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: homeColors.avatarText,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 17,
    paddingHorizontal: 11,
    paddingVertical: 12,
    gap: 23,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.13)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  glassButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  glassButtonActive: {
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  glassLabel: {
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 15,
    color: '#99A1AF',
    marginTop: 4,
  },
  glassLabelActive: {
    color: '#9810FA',
    fontWeight: '400',
  },
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    width: 242,
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
    borderRadius: 20,
    marginBottom: 20,
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
  newChatGlassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 36,
    gap: 10,
  },
  newChatText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 22,
    color: '#99A1AF',
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
    borderRadius: 20,
    marginBottom: 20,
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
  avatarMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
  },
  avatarMenuCard: {
    position: 'absolute',
    right: 20,
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  avatarMenuEmail: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: homeColors.dropdownBorder,
  },
  avatarMenuLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: homeColors.logoutRed,
  },
});
