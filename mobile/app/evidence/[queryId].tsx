import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { queryApi } from '../../src/api/queryApi';
import { EvidenceDetailResponse } from '../../src/types/contract';
import { EvidenceCard } from '../../src/components/chat/EvidenceCard';

export default function EvidenceScreen() {
  const { queryId } = useLocalSearchParams<{ queryId: string }>();
  const [evidenceData, setEvidenceData] = useState<EvidenceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!queryId) return;
      try {
        const data = await queryApi.getEvidence(queryId);
        setEvidenceData(data);
      } catch (err) {
        console.error('Failed to load evidence', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [queryId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Retrieving audit trace...</Text>
      </View>
    );
  }

  if (!evidenceData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No audit trail found for this query.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Original Query</Text>
        <Text style={styles.queryText}>"{evidenceData.raw_query}"</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Planner Agent Deconstruction</Text>
        <View style={styles.planCard}>
          <Text style={styles.planItem}>🎯 Intent: <Text style={styles.planVal}>{evidenceData.plan.intent}</Text></Text>
          <Text style={styles.planItem}>📍 Location: <Text style={styles.planVal}>{evidenceData.plan.location?.name || 'Detected'}</Text></Text>
          <Text style={styles.planItem}>🤖 Agents Consulted: <Text style={styles.planVal}>{(evidenceData.plan.required_agents || []).join(', ')}</Text></Text>
        </View>
      </View>

      <View style={styles.section}>
        <EvidenceCard evidence={evidenceData.evidence} />
      </View>

      <Text style={styles.auditStamp}>
        Timestamp: {evidenceData.created_at} | ID: {evidenceData.query_id}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A192F',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A192F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#38BDF8',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 15,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  queryText: {
    fontSize: 16,
    color: '#F8FAFC',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  planItem: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 6,
  },
  planVal: {
    color: '#38BDF8',
    fontWeight: '700',
  },
  auditStamp: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
  },
});
