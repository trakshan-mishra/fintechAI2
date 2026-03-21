import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';

export default function MarketsScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('crypto');
  const [cryptoData, setCryptoData] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [commodityData, setCommodityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchMarkets = async () => {
    try {
      const [cryptoRes, stockRes, commodityRes] = await Promise.all([
        api.getCryptoData(),
        api.getStockData(),
        api.getCommodityData()
      ]);
      setCryptoData(cryptoRes.data);
      setStockData(stockRes.data);
      setCommodityData(commodityRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMarkets();
    setRefreshing(false);
  };

  const tabs = [
    { key: 'crypto', label: 'Crypto', icon: 'logo-bitcoin' },
    { key: 'stocks', label: 'Stocks', icon: 'bar-chart' },
    { key: 'commodities', label: 'Commodities', icon: 'flame' }
  ];

  const renderCrypto = ({ item, index }) => (
    <View style={[styles.cryptoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cryptoHeader}>
        <View style={styles.cryptoInfo}>
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.cryptoImage} />
          )}
          <View>
            <Text style={[styles.cryptoSymbol, { color: colors.text }]}>
              {item.symbol.toUpperCase()}
            </Text>
            <Text style={[styles.cryptoName, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>
        <View style={[styles.changeBadge, { 
          backgroundColor: item.price_change_percentage_24h > 0 ? colors.success + '20' : colors.danger + '20' 
        }]}>
          <Ionicons 
            name={item.price_change_percentage_24h > 0 ? 'trending-up' : 'trending-down'} 
            size={12} 
            color={item.price_change_percentage_24h > 0 ? colors.success : colors.danger} 
          />
          <Text style={{ 
            color: item.price_change_percentage_24h > 0 ? colors.success : colors.danger,
            fontSize: 12,
            fontWeight: '600'
          }}>
            {item.price_change_percentage_24h > 0 ? '+' : ''}{item.price_change_percentage_24h?.toFixed(2)}%
          </Text>
        </View>
      </View>
      
      <Text style={[styles.cryptoPrice, { color: colors.text }]}>
        ₹{item.current_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </Text>
      
      <Text style={[styles.marketCap, { color: colors.textSecondary }]}>
        MCap: ₹{(item.market_cap / 1e12).toFixed(2)}T
      </Text>
    </View>
  );

  const renderStock = ({ item }) => (
    <View style={[styles.stockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.stockHeader}>
        <View>
          <Text style={[styles.stockSymbol, { color: colors.text }]}>{item.symbol}</Text>
          <Text style={[styles.stockName, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <View style={[styles.exchangeBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.exchangeText, { color: colors.primary }]}>{item.exchange}</Text>
        </View>
      </View>
      
      <View style={styles.stockFooter}>
        <Text style={[styles.stockPrice, { color: colors.text }]}>
          ₹{item.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </Text>
        <View style={styles.stockChange}>
          <Text style={[styles.stockChangeText, { 
            color: item.change > 0 ? colors.success : colors.danger 
          }]}>
            {item.change > 0 ? '+' : ''}₹{item.change.toFixed(2)}
          </Text>
          <Text style={[styles.stockChangePercent, { 
            color: item.change_percent > 0 ? colors.success : colors.danger 
          }]}>
            ({item.change_percent > 0 ? '+' : ''}{item.change_percent.toFixed(2)}%)
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCommodity = ({ item }) => (
    <View style={[styles.commodityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.commodityHeader}>
        <Text style={[styles.commodityName, { color: colors.text }]}>{item.name}</Text>
        <View style={[styles.changeBadge, { 
          backgroundColor: item.change_percent > 0 ? colors.success + '20' : colors.danger + '20' 
        }]}>
          <Text style={{ 
            color: item.change_percent > 0 ? colors.success : colors.danger,
            fontSize: 12,
            fontWeight: '600'
          }}>
            {item.change_percent > 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
          </Text>
        </View>
      </View>
      
      <Text style={[styles.commodityPrice, { color: colors.text }]}>
        ₹{item.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </Text>
      <Text style={[styles.commodityUnit, { color: colors.textSecondary }]}>{item.unit}</Text>
    </View>
  );

  const getData = () => {
    switch (activeTab) {
      case 'crypto': return cryptoData;
      case 'stocks': return stockData;
      case 'commodities': return commodityData;
      default: return [];
    }
  };

  const getRenderItem = () => {
    switch (activeTab) {
      case 'crypto': return renderCrypto;
      case 'stocks': return renderStock;
      case 'commodities': return renderCommodity;
      default: return renderCrypto;
    }
  };

  const getKeyExtractor = (item) => {
    switch (activeTab) {
      case 'crypto': return item.id;
      case 'stocks': return item.symbol;
      case 'commodities': return item.symbol;
      default: return Math.random().toString();
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { backgroundColor: colors.primary + '20' }
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons 
              name={tab.icon} 
              size={18} 
              color={activeTab === tab.key ? colors.primary : colors.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? colors.primary : colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Market Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Updates every 60 seconds • Prices in INR
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={getData()}
        renderItem={getRenderItem()}
        keyExtractor={getKeyExtractor}
        numColumns={activeTab === 'crypto' ? 2 : 1}
        key={activeTab}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No market data available
            </Text>
          </View>
        }
      />
    </View>
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
  tabBar: {
    flexDirection: 'row',
    padding: 8,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  infoText: {
    fontSize: 11,
  },
  list: {
    padding: 8,
  },
  cryptoCard: {
    flex: 1,
    margin: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cryptoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cryptoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cryptoImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  cryptoSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cryptoName: {
    fontSize: 11,
    maxWidth: 80,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  cryptoPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  marketCap: {
    fontSize: 11,
  },
  stockCard: {
    marginHorizontal: 8,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stockSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stockName: {
    fontSize: 12,
    marginTop: 2,
    maxWidth: 200,
  },
  exchangeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  exchangeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  stockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  stockChange: {
    alignItems: 'flex-end',
  },
  stockChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  stockChangePercent: {
    fontSize: 12,
  },
  commodityCard: {
    marginHorizontal: 8,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  commodityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commodityName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  commodityPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commodityUnit: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});
