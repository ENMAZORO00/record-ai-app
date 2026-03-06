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
import { homeColors } from '../../theme/homeColors';

// Upcoming task card - circle toggles completion (Notes app style)
function UpcomingTaskCard({ text, completed, onToggle }) {
  return (
    <View style={[styles.taskCard, completed && styles.taskCardComplete]}>
      <TouchableOpacity
        style={[styles.taskCircleWrap, completed && styles.taskCircleComplete]}
        onPress={onToggle}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {completed ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : (
          <View style={styles.taskCircle} />
        )}
      </TouchableOpacity>
      <Text
        style={[styles.taskText, completed && styles.taskTextComplete]}
        numberOfLines={2}
      >
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
  const [tasks, setTasks] = useState([
    { id: '1', text: 'Showcasing new design elements and style', completed: false },
    { id: '2', text: 'Showcasing new design elements and style', completed: false },
    { id: '3', text: 'Showcasing new design elements and style', completed: false },
  ]);
  const infoNotes = [
    'Your Password set as Adam2029 of Discord',
    'Meeting at 12AM at 3rd wave coffee shop',
    'Passport Appointment at New York ,4th street',
  ];

  return (
    <View style={styles.container}>
      {/* Header: Notes, plus */}
      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>Notes</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.7}>
          <Ionicons name="add" size={24} color={homeColors.accent} />
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
            {tasks.map((t) => (
              <UpcomingTaskCard
                key={t.id}
                text={t.text}
                completed={t.completed}
                onToggle={() => {
                  setTasks((prev) =>
                    prev.map((task) =>
                      task.id === t.id
                        ? { ...task, completed: !task.completed }
                        : task
                    )
                  );
                }}
              />
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
  taskCircleWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  taskCircleComplete: {
    backgroundColor: homeColors.accent,
  },
  taskCardComplete: {
    opacity: 0.78,
  },
  taskTextComplete: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
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
