import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Dimensions
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/ClerkAuthWrapper';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';

const W = Dimensions.get('window').width;

export default function DashboardScreen() {
  const navigation    = useNavigation();
  const { user }      = useAuth();
  const { colors }    = useTheme();
  const [stats, setStats]           = useState(null);
  const [cryptoPreview, setCrypto]  = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        api.getTransactionStats(),
        api.getCryptoData(3),
      ]);
      setStats(sRes.data);
      setCrypto(cRes.data.slice(0, 3));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{ data: [1200, 800, 1500, 2000, 1800, 900, 1400], strokeWidth: 2 }]
  };

  // ✅ Fixed: correct route names matching AppNavigator
  const quickActions = [
    { icon: 'add-circle',    label: 'Add',     color: colors.primary, onPress: () => navigation.navigate('Transactions') },
    { icon: 'scan',          label: 'Scan',    color: '#10B981',      onPress: () => navigation.navigate('Scanner') },
    { icon: 'document-text', label: 'Invoice', color: '#F59E0B',      onPress: () => navigation.navigate('More') },
    { icon: 'calculator',    label: 'Tax',     color: '#EC4899',      onPress: () => navigation.navigate('Dashboard', { screen: 'TaxSummary' }) },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {greeting()}, {user?.name?.split(' ')[0] || 'User'}!
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dashboard</Text>
        </View>
        <View style={[styles.avatarBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceValue}>
          ₹{(stats?.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
        <View style={styles.balanceRow}>
          {[
            { icon: 'arrow-up-circle', label: 'Income',   val: stats?.total_income  || 0, color: '#34D399' },
            { icon: 'arrow-down-circle', label: 'Expenses', val: stats?.total_expense || 0, color: '#F87171' },
          ].map(({ icon, label, val, color }) => (
            <View key={label} style={styles.balanceItem}>
              <Ionicons name={icon} size={20} color={color} />
              <View style={{ marginLeft: 6 }}>
                <Text style={styles.balanceItemLabel}>{label}</Text>
                <Text style={styles.balanceItemValue}>
                  ₹{val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {quickActions.map((a, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={a.onPress}
          >
            <View style={[styles.quickIcon, { backgroundColor: a.color + '20' }]}>
              <Ionicons name={a.icon} size={22} color={a.color} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Spending Chart */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Spending Overview</Text>
          <Text style={[styles.cardSub, { color: colors.primary }]}>This Week</Text>
        </View>
        <LineChart
          data={chartData}
          width={W - 64}
          height={180}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: colors.card,
            backgroundGradientTo: colors.card,
            decimalPlaces: 0,
            color: () => colors.primary,
            labelColor: () => colors.textSecondary,
            propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
            propsForBackgroundLines: { strokeDasharray: '5,5', stroke: colors.border },
          }}
          bezier
          style={styles.chart}
          withInnerLines
          withOuterLines={false}
        />
      </View>

      {/* Market preview */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Markets</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Markets')}>
            <Text style={[styles.cardSub, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        {cryptoPreview.length > 0 ? cryptoPreview.map((coin, i) => (
          <View key={i} style={[styles.cryptoItem, i < cryptoPreview.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.coinSymbol, { color: colors.text }]}>{coin.symbol?.toUpperCase()}</Text>
              <Text style={[styles.coinName, { color: colors.textSecondary }]}>{coin.name}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.coinPrice, { color: colors.text }]}>
                ₹{coin.current_price?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={{ color: (coin.price_change_percentage_24h || 0) >= 0 ? colors.success : colors.danger, fontSize: 12 }}>
                {(coin.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{(coin.price_change_percentage_24h || 0).toFixed(2)}%
              </Text>
            </View>
          </View>
        )) : (
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Loading market data...</Text>
        )}
      </View>

      {/* Quick stats */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 32 }]}>
        <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 16 }]}>Quick Stats</Text>
        <View style={styles.statsRow}>
          {[
            { val: stats?.transaction_count || 0,                         label: 'Transactions' },
            { val: Object.keys(stats?.category_breakdown || {}).length,   label: 'Categories' },
          ].map(({ val, label }) => (
            <View key={label} style={styles.statItem}>
              <Text style={[styles.statVal, { color: colors.text }]}>{val}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  greeting: { fontSize: 14, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: 'bold' },
  avatarBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  balanceCard: { marginHorizontal: 16, borderRadius: 20, padding: 24 },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 6 },
  balanceValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceItem: { flexDirection: 'row', alignItems: 'center' },
  balanceItemLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  balanceItemValue: { color: '#fff', fontSize: 16, fontWeight: '600' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingTop: 20 },
  quickBtn: { alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, flex: 1, marginHorizontal: 4 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickLabel: { fontSize: 11, fontWeight: '500' },
  card: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 12 },
  chart: { borderRadius: 16, marginLeft: -16 },
  cryptoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  coinSymbol: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  coinName: { fontSize: 12 },
  coinPrice: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 12 },
});