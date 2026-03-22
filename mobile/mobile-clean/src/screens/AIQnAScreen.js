import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';

const CATEGORIES = {
  sip:        { title: 'SIP Investment',   icon: 'trending-up',       color: '#10B981' },
  tax:        { title: 'Tax Saving',       icon: 'calculator',        color: '#F59E0B' },
  investment: { title: 'Investment',       icon: 'bar-chart',         color: '#6366F1' },
  insurance:  { title: 'Insurance',        icon: 'shield-checkmark',  color: '#EC4899' },
  retirement: { title: 'Retirement',       icon: 'wallet',            color: '#8B5CF6' },
  debt:       { title: 'Debt Management',  icon: 'card',              color: '#EF4444' },
};

const QUICK_QUESTIONS = {
  sip:        ['What is SIP?', 'Should I start SIP?', 'Best SIP funds for 2026?'],
  tax:        ['How to save tax?', 'Section 80C explained', 'Old vs New tax regime?'],
  investment: ['Where to invest in 2026?', 'Mutual funds vs FD?', 'Gold or stocks?'],
  insurance:  ['Do I need term insurance?', 'Term vs endowment?', 'How much coverage?'],
  retirement: ['How much for retirement?', 'NPS vs PPF?', 'Early retirement plan?'],
  debt:       ['Pay off debt fast?', 'Good vs bad debt?', 'How to improve CIBIL score?'],
};

export default function AIQnAScreen() {
  const { colors } = useTheme();
  const [category, setCategory] = useState(null);
  const [question, setQuestion] = useState('');
  const [chat, setChat]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const scrollRef = useRef(null);

  const ask = async (q) => {
    const text = (q || question).trim();
    if (!text || !category) return;

    setChat(prev => [...prev, { role: 'user', text }]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await api.askAIQuestion(category, text);
      setChat(prev => [...prev, { role: 'ai', text: res.data.answer }]);
    } catch (err) {
      console.error('AI Q&A error:', err);
      setChat(prev => [
        ...prev,
        { role: 'ai', text: 'Sorry, I could not process that. Please try again.' }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const selectCategory = (key) => {
    setCategory(key);
    setChat([]);
    setQuestion('');
  };

  const goBack = () => {
    setCategory(null);
    setChat([]);
    setQuestion('');
  };

  // ── Category picker ──────────────────────────────────────────────────────────
  if (!category) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>AI Financial Q&A</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Get personalised financial advice powered by AI
          </Text>
        </View>

        <View style={styles.grid}>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <TouchableOpacity
              key={key}
              style={[styles.catCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => selectCategory(key)}
            >
              <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={cat.icon} size={24} color={cat.color} />
              </View>
              <Text style={[styles.catTitle, { color: colors.text }]}>{cat.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.disclaimer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            AI responses are for informational purposes only, not professional financial advice.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // ── Chat view ────────────────────────────────────────────────────────────────
  const cat = CATEGORIES[category];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={[styles.chatHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.catIcon, { backgroundColor: cat.color + '20', marginRight: 10 }]}>
          <Ionicons name={cat.icon} size={18} color={cat.color} />
        </View>
        <Text style={[styles.chatTitle, { color: colors.text }]}>{cat.title}</Text>
      </View>

      {/* Chat messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {chat.length === 0 && (
          <View style={styles.quickContainer}>
            <Text style={[styles.quickTitle, { color: colors.textSecondary }]}>
              Tap a question to get started:
            </Text>
            {QUICK_QUESTIONS[category]?.map((q, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => ask(q)}
              >
                <Text style={[styles.quickText, { color: colors.text }]}>{q}</Text>
                <Ionicons name="arrow-forward-circle" size={18} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {chat.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              msg.role === 'user' ? styles.userBubble : styles.aiBubble,
              {
                backgroundColor: msg.role === 'user' ? colors.primary : colors.card,
                borderColor: msg.role === 'ai' ? colors.border : 'transparent',
              }
            ]}
          >
            {msg.role === 'ai' && (
              <Ionicons name="sparkles" size={14} color={colors.primary} style={styles.aiDot} />
            )}
            <Text style={[styles.bubbleText, { color: msg.role === 'user' ? '#fff' : colors.text }]}>
              {msg.text}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={[styles.bubble, styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.bubbleText, { color: colors.textSecondary, marginLeft: 8 }]}>
              Thinking...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
          value={question}
          onChangeText={setQuestion}
          placeholder={`Ask about ${cat.title.toLowerCase()}...`}
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
          onSubmitEditing={() => ask()}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: question.trim() ? colors.primary : colors.border }]}
          onPress={() => ask()}
          disabled={loading || !question.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', padding: 24, paddingTop: 60 },
  headerIcon: { width: 64, height: 64, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: 'center' },
  grid: { padding: 16, gap: 10 },
  catCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
  catIcon: { width: 42, height: 42, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  catTitle: { flex: 1, fontSize: 16, fontWeight: '600' },
  disclaimer: { flexDirection: 'row', margin: 16, padding: 14, borderRadius: 12, borderWidth: 1, gap: 10, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 56, borderBottomWidth: 1 },
  backBtn: { marginRight: 10 },
  chatTitle: { fontSize: 17, fontWeight: '600' },
  chatScroll: { flex: 1 },
  chatContent: { padding: 16 },
  quickContainer: { marginBottom: 16 },
  quickTitle: { fontSize: 13, marginBottom: 10 },
  quickBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  quickText: { flex: 1, fontSize: 14 },
  bubble: { padding: 13, borderRadius: 16, marginBottom: 10, maxWidth: '88%', flexDirection: 'row', alignItems: 'flex-start' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1 },
  aiDot: { marginRight: 6, marginTop: 2 },
  bubbleText: { flex: 1, fontSize: 15, lineHeight: 22 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100, fontSize: 15 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
});