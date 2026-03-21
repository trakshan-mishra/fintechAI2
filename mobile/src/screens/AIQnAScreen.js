import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { API_URL } from '../utils/config';
import * as SecureStore from 'expo-secure-store';

const CATEGORIES = {
  sip: { title: 'SIP Investment', icon: 'trending-up', color: '#10B981' },
  tax: { title: 'Tax Saving', icon: 'calculator', color: '#F59E0B' },
  investment: { title: 'Investment', icon: 'bar-chart', color: '#6366F1' },
  insurance: { title: 'Insurance', icon: 'shield-checkmark', color: '#EC4899' },
  retirement: { title: 'Retirement', icon: 'wallet', color: '#8B5CF6' },
  debt: { title: 'Debt Management', icon: 'card', color: '#EF4444' }
};

const QUICK_QUESTIONS = {
  sip: ['What is SIP?', 'Should I start SIP?', 'Best SIP funds?'],
  tax: ['How to save tax?', 'Section 80C explained', 'Old vs New regime?'],
  investment: ['Where to invest?', 'MF vs FD?', 'Stock or Gold?'],
  insurance: ['Do I need insurance?', 'Term vs Endowment?', 'How much coverage?'],
  retirement: ['How much for retirement?', 'NPS vs PPF?', 'Early retirement plan?'],
  debt: ['Pay off debt fast?', 'Good vs Bad debt?', 'Improve credit score?']
};

export default function AIQnAScreen() {
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const scrollViewRef = useRef(null);

  const handleAskQuestion = async (q) => {
    const questionText = q || question;
    if (!questionText.trim() || !selectedCategory) return;

    setLoading(true);
    const newChat = { type: 'user', text: questionText };
    setChatHistory(prev => [...prev, newChat]);
    setQuestion('');

    try {
      const token = await SecureStore.getItemAsync('session_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.post(
        `${API_URL}/ai/qna/ask`,
        null,
        {
          params: { category: selectedCategory, question: questionText },
          headers
        }
      );

      const aiResponse = { type: 'ai', text: response.data.answer };
      setChatHistory(prev => [...prev, aiResponse]);
      setAnswer(response.data.answer);
    } catch (error) {
      console.error('AI Q&A error:', error);
      const errorResponse = { type: 'ai', text: 'Sorry, I could not process your question. Please try again.' };
      setChatHistory(prev => [...prev, errorResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setChatHistory([]);
    setAnswer('');
  };

  const goBack = () => {
    setSelectedCategory(null);
    setChatHistory([]);
    setAnswer('');
  };

  if (!selectedCategory) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={32} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>AI Financial Q&A</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Get personalized financial advice powered by AI
          </Text>
        </View>

        <View style={styles.categoriesContainer}>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <TouchableOpacity
              key={key}
              style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleCategorySelect(key)}
            >
              <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={cat.icon} size={24} color={cat.color} />
              </View>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>{cat.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.disclaimerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            AI responses are for informational purposes only and should not be considered as professional financial advice.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const category = CATEGORIES[selectedCategory];
  const quickQuestions = QUICK_QUESTIONS[selectedCategory] || [];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <View style={[styles.chatHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.chatHeaderIcon, { backgroundColor: category.color + '20' }]}>
          <Ionicons name={category.icon} size={20} color={category.color} />
        </View>
        <Text style={[styles.chatHeaderTitle, { color: colors.text }]}>{category.title}</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {chatHistory.length === 0 && (
          <View style={styles.quickQuestionsContainer}>
            <Text style={[styles.quickQuestionsTitle, { color: colors.textSecondary }]}>
              Quick questions to get started:
            </Text>
            {quickQuestions.map((q, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.quickQuestionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleAskQuestion(q)}
              >
                <Text style={[styles.quickQuestionText, { color: colors.text }]}>{q}</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {chatHistory.map((chat, index) => (
          <View
            key={index}
            style={[
              styles.chatBubble,
              chat.type === 'user' ? styles.userBubble : styles.aiBubble,
              {
                backgroundColor: chat.type === 'user' ? colors.primary : colors.card,
                borderColor: colors.border
              }
            ]}
          >
            {chat.type === 'ai' && (
              <View style={styles.aiIcon}>
                <Ionicons name="sparkles" size={16} color={colors.primary} />
              </View>
            )}
            <Text style={[
              styles.chatText,
              { color: chat.type === 'user' ? '#fff' : colors.text }
            ]}>
              {chat.text}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={[styles.chatBubble, styles.aiBubble, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.chatText, { color: colors.textSecondary, marginLeft: 8 }]}>
              Thinking...
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask a financial question..."
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={() => handleAskQuestion()}
          disabled={loading || !question.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  categoriesContainer: {
    padding: 16,
    gap: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  chatHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
  },
  quickQuestionsContainer: {
    marginBottom: 20,
  },
  quickQuestionsTitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  quickQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  quickQuestionText: {
    fontSize: 14,
    flex: 1,
  },
  chatBubble: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  aiIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  chatText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
