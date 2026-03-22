import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';

export default function TaxSummaryScreen() {
  const { colors }      = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchTax(); }, []);

  const fetchTax = async () => {
    try {
      const res = await api.getTaxSummary();
      setData(res.data);
    } catch (err) {
      console.error('Tax summary error:', err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTax();
    setRefreshing(false);
  };

  const taxBracket = (income) => {
    if (income <= 250000)  return '0%';
    if (income <= 500000)  return '5%';
    if (income <= 1000000) return '20%';
    return '30%';
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const income       = data?.total_income   || 0;
  const expense      = data?.total_expense  || 0;
  const taxable      = data?.taxable_income || 0;
  const estTax       = data?.estimated_tax  || 0;
  const gst          = data?.gst_collected  || 0;
  const deductions   = data?.deductions     || 0;

  const Row = ({ label, value, bold, color }) => (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: bold ? colors.text : colors.textSecondary, fontWeight: bold ? '600' : '400' }]}>
        {label}
      </Text>
      <Text style={[styles.rowVal, { color: color || colors.text, fontWeight: bold ? '600' : '500' }]}>
        {value}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Tax Summary</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          FY 2025-26 • Assessment Year 2026-27
        </Text>
      </View>

      {/* Income / Expense cards */}
      {[
        { label: 'Total Income',   val: income,  icon: 'trending-up',   col: colors.success },
        { label: 'Total Expenses', val: expense, icon: 'trending-down', col: colors.danger },
      ].map(({ label, val, icon, col }) => (
        <View key={label} style={[styles.card, styles.inlineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardIcon, { backgroundColor: col + '20' }]}>
            <Ionicons name={icon} size={22} color={col} />
          </View>
          <View>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.cardValue, { color: col }]}>₹{val.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      ))}

      {/* Tax Calculation */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Tax Calculation</Text>
        <Row label="Gross Income"         value={`₹${income.toLocaleString('en-IN')}`} />
        <Row label="Deductions (Expenses)" value={`- ₹${deductions.toLocaleString('en-IN')}`} />
        <Row label="Standard Deduction"   value="- ₹50,000" />
        <View style={[styles.divider, { borderTopColor: colors.border }]} />
        <Row label="Taxable Income"  value={`₹${taxable.toLocaleString('en-IN')}`} bold color={colors.primary} />
        <Row label="Tax Bracket"     value={taxBracket(taxable)} />

        <View style={[styles.taxHighlight, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="calculator" size={20} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.taxHighlightLabel, { color: colors.textSecondary }]}>Estimated Tax</Text>
            <Text style={[styles.taxHighlightValue, { color: colors.primary }]}>
              ₹{estTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
          </View>
        </View>
      </View>

      {/* GST */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>GST Summary</Text>
        <Row label="GST Collected (from Invoices)" value={`₹${gst.toLocaleString('en-IN')}`} color={colors.success} />
        <View style={[styles.noteBox, { borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            Ensure timely GST return filing to avoid penalties.
          </Text>
        </View>
      </View>

      {/* Tips */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Tax Saving Tips</Text>
        {[
          'Invest in ELSS mutual funds — Section 80C deduction up to ₹1.5 lakh',
          'Claim HRA exemption if you live in a rented accommodation',
          'Get health insurance — Section 80D deduction up to ₹25,000',
          'Contribute to NPS for extra ₹50,000 deduction under 80CCD(1B)',
          'Use the new tax regime if your deductions are below ₹3.75 lakh',
        ].map((tip, i) => (
          <View key={i} style={styles.tip}>
            <View style={[styles.tipDot, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="checkmark" size={12} color={colors.success} />
            </View>
            <Text style={[styles.tipText, { color: colors.text }]}>{tip}</Text>
          </View>
        ))}
      </View>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { borderColor: colors.border }]}>
        <Ionicons name="alert-circle-outline" size={15} color={colors.textSecondary} />
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          This is an estimate based on recorded transactions. Consult a CA for accurate tax planning.
        </Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 13 },
  card: { margin: 16, marginTop: 0, marginBottom: 16, padding: 16, borderRadius: 14, borderWidth: 1 },
  inlineCard: { flexDirection: 'row', alignItems: 'center', marginTop: 0 },
  cardIcon: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  cardLabel: { fontSize: 13, marginBottom: 2 },
  cardValue: { fontSize: 22, fontWeight: 'bold' },
  cardTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  rowLabel: { fontSize: 14 },
  rowVal: { fontSize: 14 },
  divider: { borderTopWidth: 1, marginVertical: 8 },
  taxHighlight: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginTop: 14 },
  taxHighlightLabel: { fontSize: 12, marginBottom: 2 },
  taxHighlightValue: { fontSize: 24, fontWeight: 'bold' },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 10, gap: 8 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  tipDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 1 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', margin: 16, marginTop: 0, padding: 14, borderRadius: 10, borderWidth: 1, gap: 8 },
  disclaimerText: { flex: 1, fontSize: 12, lineHeight: 18 },
});