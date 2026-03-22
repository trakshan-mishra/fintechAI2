import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ScrollView, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';

const emptyInvoice = () => ({
  invoice_number: `INV-${Date.now().toString().slice(-4)}`,
  gst_number: '',
  client_name: '',
  items: [{ description: '', quantity: 1, rate: '' }],
  date: new Date().toISOString().split('T')[0],
});

export default function InvoicesScreen() {
  const { colors } = useTheme();
  const [invoices, setInvoices]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [showModal, setShowModal]         = useState(false);
  const [newInvoice, setNewInvoice]       = useState(emptyInvoice());
  const [saving, setSaving]               = useState(false);

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.getInvoices();
      setInvoices(res.data);
    } catch (err) {
      console.error('Fetch invoices error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  const calcTotals = () => {
    const subtotal = newInvoice.items.reduce(
      (s, item) => s + (parseFloat(item.quantity || 0) * parseFloat(item.rate || 0)), 0
    );
    const gstAmount = subtotal * 0.18;
    return { subtotal, gstAmount, total: subtotal + gstAmount };
  };

  const handleCreate = async () => {
    if (!newInvoice.invoice_number.trim() || !newInvoice.client_name.trim()) {
      Alert.alert('Required', 'Please fill Invoice Number and Client Name'); return;
    }
    const { subtotal, gstAmount, total } = calcTotals();
    setSaving(true);
    try {
      await api.createInvoice({
        ...newInvoice,
        items: newInvoice.items.map(i => ({
          ...i,
          quantity: parseFloat(i.quantity) || 1,
          rate: parseFloat(i.rate) || 0,
        })),
        subtotal, gst_amount: gstAmount, total
      });
      Alert.alert('Created!', 'Invoice saved successfully');
      setShowModal(false);
      setNewInvoice(emptyInvoice());
      fetchInvoices();
    } catch (err) {
      Alert.alert('Error', 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index, field, value) => {
    const items = [...newInvoice.items];
    items[index] = { ...items[index], [field]: value };
    setNewInvoice({ ...newInvoice, items });
  };

  const addItem = () =>
    setNewInvoice({ ...newInvoice, items: [...newInvoice.items, { description: '', quantity: 1, rate: '' }] });

  const removeItem = (index) => {
    if (newInvoice.items.length > 1)
      setNewInvoice({ ...newInvoice, items: newInvoice.items.filter((_, i) => i !== index) });
  };

  const { subtotal, gstAmount, total } = calcTotals();

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={invoices}
        keyExtractor={item => item.invoice_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <View>
                <Text style={[styles.invoiceNum, { color: colors.primary }]}>#{item.invoice_number}</Text>
                <Text style={[styles.clientName, { color: colors.text }]}>{item.client_name}</Text>
              </View>
              <View style={styles.amountBlock}>
                <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Total</Text>
                <Text style={[styles.amountValue, { color: colors.text }]}>
                  ₹{item.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.date}</Text>
              </View>
              {item.gst_number ? (
                <View style={styles.metaItem}>
                  <Ionicons name="document-text-outline" size={13} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>GST: {item.gst_number}</Text>
                </View>
              ) : null}
            </View>
            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                Subtotal ₹{item.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                GST ₹{item.gst_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={60} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No invoices yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Create your first GST invoice
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Invoice</Text>
            <TouchableOpacity onPress={handleCreate} disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Text style={[styles.saveBtn, { color: colors.primary }]}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {[
              { label: 'Invoice Number *', key: 'invoice_number', placeholder: 'INV-001' },
              { label: 'Client Name *',    key: 'client_name',    placeholder: 'Client or company name' },
              { label: 'GST Number',       key: 'gst_number',     placeholder: '29XXXXX1234X1Z5 (optional)' },
              { label: 'Date',             key: 'date',           placeholder: 'YYYY-MM-DD' },
            ].map(({ label, key, placeholder }) => (
              <View key={key}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={newInvoice[key]}
                  onChangeText={val => setNewInvoice({ ...newInvoice, [key]: val })}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            ))}

            {/* Items */}
            <View style={styles.itemsHeader}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 0 }]}>Line Items</Text>
              <TouchableOpacity onPress={addItem}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {newInvoice.items.map((item, idx) => (
              <View key={idx} style={[styles.itemRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.itemDesc, { color: colors.text, borderBottomColor: colors.border }]}
                  value={item.description}
                  onChangeText={v => updateItem(idx, 'description', v)}
                  placeholder="Description"
                  placeholderTextColor={colors.textSecondary}
                />
                <View style={styles.itemNumbers}>
                  <TextInput
                    style={[styles.itemQty, { color: colors.text, backgroundColor: colors.background }]}
                    value={String(item.quantity)}
                    onChangeText={v => updateItem(idx, 'quantity', v)}
                    placeholder="Qty"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.itemRate, { color: colors.text, backgroundColor: colors.background }]}
                    value={String(item.rate)}
                    onChangeText={v => updateItem(idx, 'rate', v)}
                    placeholder="Rate (₹)"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.itemTotal, { color: colors.text }]}>
                    ₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)).toFixed(0)}
                  </Text>
                  {newInvoice.items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(idx)}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            {/* Totals */}
            <View style={[styles.totals, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { label: 'Subtotal', val: `₹${subtotal.toFixed(2)}` },
                { label: 'GST (18%)', val: `₹${gstAmount.toFixed(2)}` },
              ].map(({ label, val }) => (
                <View key={label} style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{label}</Text>
                  <Text style={[styles.totalVal, { color: colors.text }]}>{val}</Text>
                </View>
              ))}
              <View style={[styles.totalRow, styles.grandRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.grandLabel, { color: colors.text }]}>Total</Text>
                <Text style={[styles.grandVal, { color: colors.primary }]}>₹{total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 16, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  invoiceNum: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  clientName: { fontSize: 18, fontWeight: 'bold' },
  amountBlock: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 11, marginBottom: 2 },
  amountValue: { fontSize: 20, fontWeight: 'bold' },
  cardMeta: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1 },
  footerText: { fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyText: { fontSize: 13, marginTop: 6 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 56, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  saveBtn: { fontSize: 16, fontWeight: '600' },
  modalBody: { padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  itemRow: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  itemDesc: { fontSize: 14, paddingBottom: 8, borderBottomWidth: 1, marginBottom: 8 },
  itemNumbers: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemQty: { width: 50, borderRadius: 6, padding: 6, textAlign: 'center', fontSize: 13 },
  itemRate: { flex: 1, borderRadius: 6, padding: 6, fontSize: 13 },
  itemTotal: { fontSize: 13, fontWeight: '600', minWidth: 50, textAlign: 'right' },
  totals: { marginTop: 20, borderRadius: 12, borderWidth: 1, padding: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 14 },
  totalVal: { fontSize: 14, fontWeight: '500' },
  grandRow: { borderTopWidth: 1, paddingTop: 12, marginTop: 4, marginBottom: 0 },
  grandLabel: { fontSize: 18, fontWeight: 'bold' },
  grandVal: { fontSize: 20, fontWeight: 'bold' },
});