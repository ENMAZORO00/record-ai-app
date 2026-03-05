import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { homeColors } from '../theme/homeColors';
import AssistantView from './home/AssistantView';
import TaskBarView from './home/TaskBarView';
import TranscriptView from './home/TranscriptView';
import MindMapView from './home/MindMapView';

const TABS = [
  { id: 'assistant', label: 'Assistant', icon: 'sparkles' },
  { id: 'taskbar', label: 'Task Bar', icon: 'checkbox-outline' },
  { id: 'transcript', label: 'Transcript', icon: 'document-text-outline' },
  { id: 'mindmap', label: 'Mind Map', icon: 'git-network-outline' },
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
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('assistant');
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleLogout = async () => {
    setDropdownVisible(false);
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'assistant':
        return (
          <AssistantView
            onSwitchToTranscript={() => setActiveTab('transcript')}
          />
        );
      case 'taskbar':
        return <TaskBarView />;
      case 'transcript':
        return <TranscriptView />;
      case 'mindmap':
        return <MindMapView />;
      default:
        return <AssistantView onSwitchToTranscript={() => setActiveTab('transcript')} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[homeColors.bgStart, homeColors.bgEnd]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header with avatar */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={() => setDropdownVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[homeColors.accent, '#a78bfa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Main content area */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Floating glass tab bar */}
      <BlurView
        intensity={70}
        tint="light"
        style={[styles.tabBar, { marginBottom: insets.bottom + 16 }]}
      >
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
                size={22}
                color={isActive ? homeColors.accent : homeColors.textMuted}
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
      </BlurView>

      {/* Dropdown modal */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { paddingTop: insets.top + 56 }]}
          onPress={() => setDropdownVisible(false)}
        >
          <Pressable
            style={styles.dropdown}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.dropdownArrow} />
            <View style={styles.dropdownContent}>
              <Text style={styles.dropdownEmail} numberOfLines={1}>
                {user?.email || 'No email'}
              </Text>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={20} color={homeColors.logoutRed} />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  avatarWrap: {
    alignSelf: 'flex-end',
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
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 16,
    marginHorizontal: 2,
  },
  glassLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: homeColors.textMuted,
    marginTop: 4,
  },
  glassLabelActive: {
    color: homeColors.accent,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingRight: 20,
    paddingLeft: 20,
    alignItems: 'flex-end',
  },
  dropdown: {
    backgroundColor: homeColors.dropdownBg,
    borderRadius: 16,
    minWidth: 240,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
    overflow: 'visible',
  },
  dropdownArrow: {
    position: 'absolute',
    top: -8,
    right: 20,
    width: 16,
    height: 16,
    backgroundColor: homeColors.dropdownBg,
    transform: [{ rotate: '45deg' }],
  },
  dropdownContent: {
    padding: 16,
    paddingTop: 20,
  },
  dropdownEmail: {
    fontSize: 15,
    color: homeColors.textSecondary,
    marginBottom: 12,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: homeColors.dropdownBorder,
    marginVertical: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: homeColors.logoutRed,
  },
});
