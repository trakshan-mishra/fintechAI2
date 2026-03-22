import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/ClerkAuthWrapper';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme, colors } = useTheme();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' }
      ]
    );
  };

  const menuItems = [
    {
      icon: 'document-text',
      title: 'Invoices',
      subtitle: 'Create and manage GST invoices',
      color: '#6366F1',
      onPress: () => navigation.navigate('Invoices')
    },
    {
      icon: 'calculator',
      title: 'Tax Summary',
      subtitle: 'View your tax calculations',
      color: '#F59E0B',
      onPress: () => navigation.navigate('TaxSummaryMore')
    },
    {
      icon: 'cloud-upload',
      title: 'Import from Paytm',
      subtitle: 'Import transactions from Paytm',
      color: '#00BAF2',
      onPress: () => Alert.alert('Coming Soon', 'This feature will be available soon')
    },
    {
      icon: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage push notifications',
      color: '#EC4899',
      onPress: () => Alert.alert('Coming Soon', 'Push notifications will be available soon')
    },
    {
      icon: 'send',
      title: 'Connect Telegram',
      subtitle: 'Get alerts on Telegram',
      color: '#0088CC',
      onPress: () => Alert.alert('Telegram', 'Open our bot @TradeTrackProBot on Telegram to connect')
    }
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
      </View>

      {/* Profile Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'User'}</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email || 'No email'}</Text>
          </View>
          <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Items */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, index !== menuItems.length - 1 && styles.menuItemBorder]}
            onPress={item.onPress}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Preferences */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
        
        <View style={styles.setting}>
          <View style={styles.settingLeft}>
            <View style={[styles.menuIcon, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={20} color={colors.primary} />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
          </View>
          <Switch 
            value={theme === 'dark'} 
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary + '50' }}
            thumbColor={theme === 'dark' ? colors.primary : '#f4f4f4'}
          />
        </View>

        <View style={[styles.setting, { marginTop: 12 }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#10B981' + '20' }]}>
              <Ionicons name="finger-print" size={20} color="#10B981" />
            </View>
            <Text style={[styles.settingText, { color: colors.text }]}>Biometric Lock</Text>
          </View>
          <Switch 
            value={false} 
            trackColor={{ false: colors.border, true: colors.primary + '50' }}
          />
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: colors.danger + '15', borderColor: colors.danger + '30' }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={[styles.version, { color: colors.textSecondary }]}>
        TradeTrack Pro v1.0.0{'\n'}Made for Indian users with ❤️
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 40,
    fontSize: 12,
    lineHeight: 20,
  },
});
