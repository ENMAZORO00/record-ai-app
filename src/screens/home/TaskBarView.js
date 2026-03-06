import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Upcoming task card (unchecked - grey circle)
function UpcomingTaskCard({ text }) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskCircle} />
      <Text style={styles.taskText} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

// Information note card (green dot)
function InfoNoteCard({ text }) {
  return (
    <View style={[styles.taskCard, styles.infoNoteCard]}>
      <View style={styles.infoDot} />
      <Text style={styles.taskText} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

export default function TaskBarView() {
  const upcomingTasks = [
    'Showcasing new design elements and style',
    'Showcasing new design elements and style',
    'Showcasing new design elements and style',
  ];
  const infoNotes = [
    'Your Password set as Adam2029 of Discord',
    'Meeting at 12AM at 3rd wave coffee shop',
    'Passport Appointment at New York ,4th street',
  ];

  return (
    <View style={styles.container}>
      {/* Header: back, Notes, plus */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notes</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Upcoming Task */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Task</Text>
          <View style={styles.cardList}>
            {upcomingTasks.map((text, i) => (
              <UpcomingTaskCard key={i} text={text} />
            ))}
          </View>
        </View>

        {/* Information Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information Note:</Text>
          <View style={styles.cardList}>
            {infoNotes.map((text, i) => (
              <InfoNoteCard key={i} text={text} />
            ))}
          </View>
        </View>
      </ScrollView>
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
    borderColor: 'rgba(0,0,0,0.2)',
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
    marginBottom: 30,
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
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 23,
    paddingHorizontal: 25,
    paddingLeft: 25,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  taskCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#D9D9D9',
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
});
