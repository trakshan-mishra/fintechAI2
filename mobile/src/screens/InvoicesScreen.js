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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { API_URL } from '../utils/config';
import * as SecureStore from 'expo-secure-store';

export default function InvoicesScreen() {
  const { colors } = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    invoice_number: '',
    gst_number: '',
    client_name: '',
    items: [{ description: '', quantity: 1, rate: 0 }],
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const token = await SecureStore.getItemAsync('session_token');
      const response = await axios.get(`${API_URL}/invoices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(response.data);
    } catch (error) {
      console.error('Fetch invoices error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const gstAmount = subtotal * 0.18; // 18% GST
    const total = subtotal + gstAmount;
    return { subtotal, gstAmount, total };
  };

  const handleCreateInvoice = async () => {
    const { subtotal, gstAmount, total } = calculateTotals();

    if (!newInvoice.invoice_number || !newInvoice.client_name) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('session_token');
      await axios.post(`${API_URL}/invoices`, {
        ...newInvoice,
        subtotal,
        gst_amount: gstAmount,
        total
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert('Success', 'Invoice created successfully!');
      setShowCreateModal(false);
      resetNewInvoice();
      fetchInvoices();
    } catch (error) {
      console.error('Create invoice error:', error);
      Alert.alert('Error', 'Failed to create invoice');
    }
  };

  const resetNewInvoice = () => {
    setNewInvoice({
      invoice_number: '',
      gst_number: '',
      client_name: '',
      items: [{ description: '', quantity: 1, rate: 0 }],
      date: new Date().toISOString().split('T')[0]
    });
  };

  const addItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', quantity: 1, rate: 0 }]
    });
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index][field] = field === 'description' ? value : parseFloat(value) || 0;
    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  const removeItem = (index) => {
    if (newInvoice.items.length > 1) {
      const updatedItems = newInvoice.items.filter((_, i) => i !== index);
      setNewInvoice({ ...newInvoice, items: updatedItems });
    }
  };

  const renderInvoice = ({ item }) => (
    <TouchableOpacity
      style={[styles.invoiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.invoiceHeader}>
        <View>
          <Text style={[styles.invoiceNumber, { color: colors.primary }]}>
            #{item.invoice_number}
          </Text>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {item.client_name}
          </Text>
        </View>
        <View style={styles.invoiceAmount}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.totalAmount, { color: colors.text }]}>
            ₹{item.total.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      <View style={styles.invoiceDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{item.date}</Text>
        </View>
        {item.gst_number && (
          <View style={styles.detailItem}>
            <Ionicons name="document-text-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>GST: {item.gst_number}</Text>
          </View>
        )}
      </View>

      <View style={[styles.invoiceFooter, { borderTopColor: colors.border }]}>
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Subtotal</Text>
          <Text style={[styles.footerValue, { color: colors.text }]}>₹{item.subtotal.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>GST (18%)</Text>
          <Text style={[styles.footerValue, { color: colors.text }]}>₹{item.gst_amount.toLocaleString('en-IN')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const { subtotal, gstAmount, total } = calculateTotals();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={invoices}
        renderItem={renderInvoice}
        keyExtractor={(item) => item.invoice_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No invoices yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Create your first invoice with GST
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Invoice Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Invoice</Text>
            <TouchableOpacity onPress={handleCreateInvoice}>
              <Text style={[styles.saveButton, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Invoice Number *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={newInvoice.invoice_number}
              onChangeText={(text) => setNewInvoice({ ...newInvoice, invoice_number: text })}
              placeholder="INV-001"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Client Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={newInvoice.client_name}
              onChangeText={(text) => setNewInvoice({ ...newInvoice, client_name: text })}
              placeholder="Client name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>GST Number (Optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={newInvoice.gst_number}
              onChangeText={(text) => setNewInvoice({ ...newInvoice, gst_number: text })}
              placeholder="29XXXXX1234X1Z5"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={newInvoice.date}
              onChangeText={(text) => setNewInvoice({ ...newInvoice, date: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />

            <View style={styles.itemsHeader}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Items</Text>
              <TouchableOpacity onPress={addItem}>
                <Text style={{ color: colors.primary }}>+ Add Item</Text>
              </TouchableOpacity>
            </View>

            {newInvoice.items.map((item, index) => (
              <View key={index} style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.itemInputs}>
                  <TextInput
                    style={[styles.itemInput, styles.descInput, { backgroundColor: colors.background, color: colors.text }]}
                    value={item.description}
                    onChangeText={(text) => updateItem(index, 'description', text)}
                    placeholder="Description"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TextInput
                    style={[styles.itemInput, styles.qtyInput, { backgroundColor: colors.background, color: colors.text }]}
                    value={item.quantity.toString()}
                    onChangeText={(text) => updateItem(index, 'quantity', text)}
                    placeholder="Qty"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.itemInput, styles.rateInput, { backgroundColor: colors.background, color: colors.text }]}
                    value={item.rate.toString()}
                    onChangeText={(text) => updateItem(index, 'rate', text)}
                    placeholder="Rate"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                {newInvoice.items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeButton}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <View style={[styles.totalsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>₹{subtotal.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>GST (18%)</Text>
                <Text style={[styles.totalValue, { color: colors.text }]}>₹{gstAmount.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={[styles.grandTotalLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.grandTotalValue, { color: colors.primary }]}>₹{total.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>
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
  },
  invoiceCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  invoiceAmount: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  invoiceDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerItem: {},
  footerLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '600',
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  itemInputs: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  itemInput: {
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  descInput: {
    flex: 2,
  },
  qtyInput: {
    width: 50,
    textAlign: 'center',
  },
  rateInput: {
    width: 80,
    textAlign: 'center',
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  totalsContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalValue: {
    fontWeight: '500',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
