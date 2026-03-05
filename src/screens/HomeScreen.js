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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
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
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-242)).current;

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

  const chatHistory = [
    'My Yesterday chat history of..',
    'My Today chat history one..',
    'During my meeting chat on..',
    'My Today chat history one..',
    'My Yesterday chat history of..',
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'assistant':
        return (
          <AssistantView
            onSwitchToTranscript={() => setActiveTab('transcript')}
            onStartRecording={() => navigation.navigate('VoiceRecording')}
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
            onSwitchToTranscript={() => setActiveTab('transcript')}
            onStartRecording={() => navigation.navigate('VoiceRecording')}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={[StyleSheet.absoluteFill, styles.bgFill]} pointerEvents="none" />

      {/* Header with hamburger (assistant only) and avatar */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {activeTab === 'assistant' ? (
          <TouchableOpacity
            style={styles.hamburgerBtn}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="menu" size={26} color={homeColors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.hamburgerBtn} />
        )}
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={() => setAvatarMenuVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.avatar, { backgroundColor: homeColors.accent }]}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Main content area */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Bottom navigation - rgba(255,255,255,0.13), borderRadius 20 */}
      <View style={[styles.tabBar, { marginBottom: insets.bottom + 16 }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.glassButton, isActive && styles.glassButtonActive]}
              onPress={() => setActiveTab(tab.id)}
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

              {/* New Chat button */}
              <TouchableOpacity
                style={styles.newChatBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil-outline" size={20} color="#99A1AF" />
                <Text style={styles.newChatText}>New Chat..</Text>
              </TouchableOpacity>

              {/* Chat History section */}
                <View style={styles.chatHistorySection}>
                <Text style={styles.chatHistoryTitle}>Chat History</Text>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={20} color="#99A1AF" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search"
                    placeholderTextColor="#99A1AF"
                  />
                </View>
                <ScrollView
                  style={styles.chatListScroll}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.chatList}>
                    {chatHistory.map((item, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.chatItem}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.chatItemText} numberOfLines={1}>
                          {item}
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
    backgroundColor: '#FFFFFF',
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
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 36,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(153, 161, 175, 0.29)',
    borderRadius: 20,
    marginBottom: 20,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 36,
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.004)',
    borderWidth: 1,
    borderColor: 'rgba(153, 161, 175, 0.29)',
    borderRadius: 20,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#000',
    padding: 0,
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
