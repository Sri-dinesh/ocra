import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useAlertStore } from '../../src/store/alertStore';

export default function AlertsScreen() {
  const { alerts, clearAlerts } = useAlertStore();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Active Watchdog Alerts</Text>
        {alerts.length > 0 && (
          <TouchableOpacity onPress={clearAlerts}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛡️</Text>
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptySubtitle}>
            No active proximity hazards or severe weather alerts detected for your vessel.
          </Text>
        </View>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(_, idx) => idx.toString()}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.alertCard,
                item.severity === 'critical' && styles.criticalCard,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.alertType}>{item.alert_type}</Text>
                <View
                  style={[
                    styles.severityBadge,
                    item.severity === 'critical' ? styles.criticalBadge : styles.normalBadge,
                  ]}
                >
                  <Text style={styles.severityText}>{item.severity.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.timestamp}>{item.triggered_at}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  clearText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    paddingBottom: 24,
  },
  alertCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  criticalCard: {
    borderColor: '#EF4444',
    backgroundColor: '#1F1318',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  criticalBadge: {
    backgroundColor: '#991B1B',
  },
  normalBadge: {
    backgroundColor: '#854D0E',
  },
  severityText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  message: {
    fontSize: 14,
    color: '#E2E8F0',
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 11,
    color: '#64748B',
  },
});
