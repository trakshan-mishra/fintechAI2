import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { API_URL } from '../utils/config';
import * as SecureStore from 'expo-secure-store';

export default function TaxSummaryScreen() {
  const { colors } = useTheme();
  const [taxData, setTaxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTaxSummary();
  }, []);

  const fetchTaxSummary = async () => {
    try {
      const token = await SecureStore.getItemAsync('session_token');
      const response = await axios.get(`${API_URL}/tax/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTaxData(response.data);
    } catch (error) {
      console.error('Fetch tax summary error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTaxSummary();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const getTaxBracket = (income) => {
    if (income <= 250000) return '0%';
    if (income <= 500000) return '5%';
    if (income <= 1000000) return '20%';
    return '30%';
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Tax Summary</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          FY 2025-26 (Assessment Year 2026-27)
        </Text>
      </View>

      {/* Income Card */}
      <View style={[styles.card, styles.incomeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.cardIcon, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="trending-up" size={24} color={colors.success} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Total Income</Text>
          <Text style={[styles.cardValue, { color: colors.success }]}>
            ₹{(taxData?.total_income || 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Expense Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.cardIcon, { backgroundColor: colors.danger + '20' }]}>
          <Ionicons name="trending-down" size={24} color={colors.danger} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Total Expenses</Text>
          <Text style={[styles.cardValue, { color: colors.danger }]}>
            ₹{(taxData?.total_expense || 0).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Tax Calculation Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tax Calculation</Text>
        
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Gross Income</Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>
            ₹{(taxData?.total_income || 0).toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Deductions (Expenses)</Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>
            - ₹{(taxData?.deductions || 0).toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Standard Deduction</Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>- ₹50,000</Text>
        </View>

        <View style={[styles.row, styles.divider]}>
          <Text style={[styles.rowLabel, { color: colors.text, fontWeight: '600' }]}>Taxable Income</Text>
          <Text style={[styles.rowValue, { color: colors.primary, fontWeight: '600' }]}>
            ₹{(taxData?.taxable_income || 0).toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Tax Bracket</Text>
          <Text style={[styles.rowValue, { color: colors.text }]}>
            {getTaxBracket(taxData?.taxable_income || 0)}
          </Text>
        </View>

        <View style={[styles.taxRow, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="calculator" size={20} color={colors.primary} />
          <View style={styles.taxContent}>
            <Text style={[styles.taxLabel, { color: colors.textSecondary }]}>Estimated Tax</Text>
            <Text style={[styles.taxValue, { color: colors.primary }]}>
              ₹{(taxData?.estimated_tax || 0).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>

      {/* GST Section */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>GST Summary</Text>
        
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>GST Collected (Invoices)</Text>
          <Text style={[styles.rowValue, { color: colors.success }]}>
            ₹{(taxData?.gst_collected || 0).toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={[styles.gstNote, { borderColor: colors.border }]}>
          <Ionicons name="information-circle" size={16} color={colors.primary} />
          <Text style={[styles.gstNoteText, { color: colors.textSecondary }]}>
            This is the total GST amount from all your invoices. Ensure timely filing of GST returns.
          </Text>
        </View>
      </View>

      {/* Tax Saving Tips */}
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tax Saving Tips</Text>
        
        <View style={styles.tipItem}>
          <View style={[styles.tipIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark" size={16} color={colors.success} />
          </View>
          <Text style={[styles.tipText, { color: colors.text }]}>
            Invest in ELSS mutual funds for Section 80C deduction up to ₹1.5 lakh
          </Text>
        </View>

        <View style={styles.tipItem}>
          <View style={[styles.tipIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark" size={16} color={colors.success} />
          </View>
          <Text style={[styles.tipText, { color: colors.text }]}>
            Claim HRA exemption if you live in a rented accommodation
          </Text>
        </View>

        <View style={styles.tipItem}>
          <View style={[styles.tipIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark" size={16} color={colors.success} />
          </View>
          <Text style={[styles.tipText, { color: colors.text }]}>
            Get health insurance for Section 80D deduction up to ₹25,000
          </Text>
        </View>

        <View style={styles.tipItem}>
          <View style={[styles.tipIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark" size={16} color={colors.success} />
          </View>
          <Text style={[styles.tipText, { color: colors.text }]}>
            Consider NPS for additional ₹50,000 deduction under 80CCD(1B)
          </Text>
        </View>
      </View>

      <View style={[styles.disclaimer, { borderColor: colors.border }]}>
        <Ionicons name="alert-circle" size={16} color={colors.textSecondary} />
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          This is an estimate based on your recorded transactions. Consult a tax professional for accurate tax planning.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  incomeCard: {
    marginTop: 8,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    marginTop: 8,
    paddingTop: 16,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  taxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginTop: 16,
    gap: 12,
  },
  taxContent: {
    flex: 1,
  },
  taxLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  taxValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  gstNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  gstNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
