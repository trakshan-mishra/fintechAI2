import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';

const CATEGORIES = [
  'Food', 'Shopping', 'Transport', 'Entertainment', 'Utilities', 
  'Healthcare', 'Salary', 'Freelance', 'Investment', 'Others'
];

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense',
    amount: '',
    category: 'Shopping',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await api.getTransactions();
      setTransactions(response.data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.amount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    try {
      await api.createTransaction({
        ...newTransaction,
        amount: parseFloat(newTransaction.amount)
      });
      Alert.alert('Success', 'Transaction added successfully!');
      setShowAddModal(false);
      setNewTransaction({
        type: 'expense',
        amount: '',
        category: 'Shopping',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchTransactions();
    } catch (error) {
      console.error('Add error:', error);
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={[styles.transactionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.transactionContent}>
        <View style={[styles.iconContainer, { 
          backgroundColor: item.type === 'income' ? colors.success + '20' : colors.danger + '20' 
        }]}>
          <Ionicons 
            name={item.type === 'income' ? 'arrow-up' : 'arrow-down'} 
            size={20} 
            color={item.type === 'income' ? colors.success : colors.danger} 
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={[styles.transactionTitle, { color: colors.text }]}>
            {item.description || item.category}
          </Text>
          <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
            {item.date} • {item.category}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, { 
          color: item.type === 'income' ? colors.success : colors.danger 
        }]}>
          {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );

  const incomeCategories = ['Salary', 'Freelance', 'Investment', 'Others'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.transaction_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No transactions yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Tap + to add your first transaction
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Transaction Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Transaction</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Type Toggle */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Type</Text>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: newTransaction.type === 'expense' ? colors.danger : colors.background },
                    newTransaction.type === 'expense' && styles.typeButtonActive
                  ]}
                  onPress={() => setNewTransaction({ ...newTransaction, type: 'expense', category: 'Shopping' })}
                >
                  <Ionicons 
                    name="arrow-down" 
                    size={18} 
                    color={newTransaction.type === 'expense' ? '#fff' : colors.danger} 
                  />
                  <Text style={{ 
                    color: newTransaction.type === 'expense' ? '#fff' : colors.danger,
                    fontWeight: '600'
                  }}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: newTransaction.type === 'income' ? colors.success : colors.background },
                    newTransaction.type === 'income' && styles.typeButtonActive
                  ]}
                  onPress={() => setNewTransaction({ ...newTransaction, type: 'income', category: 'Salary' })}
                >
                  <Ionicons 
                    name="arrow-up" 
                    size={18} 
                    color={newTransaction.type === 'income' ? '#fff' : colors.success} 
                  />
                  <Text style={{ 
                    color: newTransaction.type === 'income' ? '#fff' : colors.success,
                    fontWeight: '600'
                  }}>Income</Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Amount (₹)</Text>
              <TextInput
                style={[styles.input, styles.amountInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={newTransaction.amount}
                onChangeText={(text) => setNewTransaction({ ...newTransaction, amount: text })}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />

              {/* Category */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
              <View style={styles.categoryContainer}>
                {(newTransaction.type === 'income' ? incomeCategories : CATEGORIES.filter(c => !incomeCategories.includes(c) || c === 'Others')).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: newTransaction.category === cat ? colors.primary : colors.background,
                        borderColor: newTransaction.category === cat ? colors.primary : colors.border
                      }
                    ]}
                    onPress={() => setNewTransaction({ ...newTransaction, category: cat })}
                  >
                    <Text style={{
                      color: newTransaction.category === cat ? '#fff' : colors.text,
                      fontSize: 13,
                      fontWeight: '500'
                    }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={newTransaction.description}
                onChangeText={(text) => setNewTransaction({ ...newTransaction, description: text })}
                placeholder="Enter description"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Date */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={newTransaction.date}
                onChangeText={(text) => setNewTransaction({ ...newTransaction, date: text })}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleAddTransaction}
              >
                <Text style={styles.saveButtonText}>Add Transaction</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  transactionCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  amountInput: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  typeToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  typeButtonActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
