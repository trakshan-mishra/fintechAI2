import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cryptoPreview, setCryptoPreview] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsResponse, cryptoResponse] = await Promise.all([
        api.getTransactionStats(),
        api.getCryptoData()
      ]);
      setStats(statsResponse.data);
      setCryptoPreview(cryptoResponse.data.slice(0, 3));
    } catch (error) {
      console.error('Fetch data error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: [1200, 800, 1500, 2000, 1800, 900, 1400],
      color: (opacity = 1) => colors.primary,
      strokeWidth: 2
    }]
  };

  const quickActions = [
    { icon: 'add-circle', label: 'Add', color: colors.primary, onPress: () => navigation.navigate('Transactions') },
    { icon: 'scan', label: 'Scan', color: '#10B981', onPress: () => navigation.navigate('Scanner') },
    { icon: 'document-text', label: 'Invoice', color: '#F59E0B', onPress: () => navigation.navigate('More', { screen: 'Invoices' }) },
    { icon: 'calculator', label: 'Tax', color: '#EC4899', onPress: () => navigation.navigate('TaxSummary') },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}!
          </Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dashboard</Text>
        </View>
        <TouchableOpacity style={[styles.notificationBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: colors.primary }]}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceValue}>
          ₹{(stats?.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Ionicons name="arrow-up-circle" size={20} color="#34D399" />
            <View>
              <Text style={styles.balanceItemLabel}>Income</Text>
              <Text style={styles.balanceItemValue}>
                ₹{(stats?.total_income || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
          <View style={styles.balanceItem}>
            <Ionicons name="arrow-down-circle" size={20} color="#F87171" />
            <View>
              <Text style={styles.balanceItemLabel}>Expenses</Text>
              <Text style={styles.balanceItemValue}>
                ₹{(stats?.total_expense || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={action.onPress}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={[styles.quickActionLabel, { color: colors.text }]}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Spending Overview</Text>
          <TouchableOpacity>
            <Text style={{ color: colors.primary, fontSize: 12 }}>This Week</Text>
          </TouchableOpacity>
        </View>
        <LineChart
          data={chartData}
          width={screenWidth - 64}
          height={180}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: colors.card,
            backgroundGradientTo: colors.card,
            decimalPlaces: 0,
            color: (opacity = 1) => colors.primary,
            labelColor: (opacity = 1) => colors.textSecondary,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: colors.primary
            },
            propsForBackgroundLines: {
              strokeDasharray: '5,5',
              stroke: colors.border,
            }
          }}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={false}
        />
      </View>

      {/* Crypto Preview */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Markets</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Markets')}>
            <Text style={{ color: colors.primary, fontSize: 12 }}>See All</Text>
          </TouchableOpacity>
        </View>
        {cryptoPreview.map((coin, index) => (
          <View
            key={index}
            style={[styles.cryptoItem, index !== cryptoPreview.length - 1 && styles.cryptoItemBorder]}
          >
            <View style={styles.cryptoInfo}>
              <Text style={[styles.cryptoSymbol, { color: colors.text }]}>
                {coin.symbol.toUpperCase()}
              </Text>
              <Text style={[styles.cryptoName, { color: colors.textSecondary }]}>
                {coin.name}
              </Text>
            </View>
            <View style={styles.cryptoPrice}>
              <Text style={[styles.cryptoPriceValue, { color: colors.text }]}>
                ₹{coin.current_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={[styles.cryptoChange, { 
                color: coin.price_change_percentage_24h > 0 ? colors.success : colors.danger 
              }]}>
                {coin.price_change_percentage_24h > 0 ? '+' : ''}
                {coin.price_change_percentage_24h?.toFixed(2)}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Activity */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 32 }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Stats</Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats?.transaction_count || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Transactions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {Object.keys(stats?.category_breakdown || {}).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Categories</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 14,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceItemLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  balanceItemValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 20,
  },
  quickActionBtn: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chart: {
    borderRadius: 16,
    marginLeft: -16,
  },
  cryptoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cryptoItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  cryptoInfo: {},
  cryptoSymbol: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cryptoName: {
    fontSize: 12,
  },
  cryptoPrice: {
    alignItems: 'flex-end',
  },
  cryptoPriceValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cryptoChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
});
