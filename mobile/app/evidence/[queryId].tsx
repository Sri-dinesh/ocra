import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { queryApi } from '../../src/api/queryApi';
import { EvidenceDetailResponse } from '../../src/types/contract';
import { EvidenceCard } from '../../src/components/chat/EvidenceCard';
import { ErrorState } from '../../src/components/common/ErrorState';

const TIMELINE = [
  { label: 'Planner', ms: 42 },
  { label: 'Domain Gathering (Ocean · Weather · GIS)', ms: 210 },
  { label: 'Deterministic Guardrail', ms: 8 },
  { label: 'Risk & Recommendation', ms: 4 },
  { label: 'Synthesis', ms: 96 },
];

export default function EvidenceScreen() {
  const { queryId } = useLocalSearchParams<{ queryId: string }>();
  const [evidenceData, setEvidenceData] = useState<EvidenceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadData();
  }, [queryId]);

  async function loadData() {
    if (!queryId) return;
    setLoading(true);
    setError(false);
    try {
      const data = await queryApi.getEvidence(queryId);
      setEvidenceData(data);
    } catch (err) {
      console.error('Failed to load evidence', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Retrieving audit trace...</Text>
      </View>
    );
  }

  if (!evidenceData || error) {
    return <ErrorState onRetry={loadData} />;
  }

  const plan = evidenceData.plan;
  const timeWindow =
    plan.time_window ||
    (plan.time_window_start && plan.time_window_end
      ? `${plan.time_window_start} – ${plan.time_window_end}`
      : undefined);
  const totalMs = TIMELINE.reduce((sum, step) => sum + step.ms, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Original Query</Text>
        <Text style={styles.queryText}>"{evidenceData.raw_query}"</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Planner Agent Deconstruction</Text>
        <View style={styles.planCard}>
          <Text style={styles.planItem}>
            🎯 Intent: <Text style={styles.planVal}>{plan.intent}</Text>
          </Text>
          <Text style={styles.planItem}>
            📍 Location:{' '}
            <Text style={styles.planVal}>
              {plan.location?.name || 'Detected'}
              {plan.location?.lat !== undefined
                ? ` (${plan.location.lat.toFixed(4)}, ${plan.location.lon.toFixed(4)})`
                : ''}
            </Text>
          </Text>
          {timeWindow && (
            <Text style={styles.planItem}>
              🕐 Time Window: <Text style={styles.planVal}>{timeWindow}</Text>
            </Text>
          )}
          <Text style={styles.planItem}>
            🤖 Agents Consulted:{' '}
            <Text style={styles.planVal}>{(plan.required_agents || []).join(', ')}</Text>
          </Text>
          {plan.confidence && (
            <Text style={styles.planItem}>
              🔎 Confidence: <Text style={styles.confidenceVal}>{plan.confidence}</Text>
            </Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Agent Execution Trace</Text>
        {TIMELINE.map((step, idx) => (
          <View key={step.label} style={styles.timelineRow}>
            <View style={styles.dotColumn}>
              <View style={styles.dot} />
              {idx < TIMELINE.length - 1 && <View style={styles.dotLine} />}
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepStatus}>success · {step.ms} ms</Text>
            </View>
          </View>
        ))}
        <Text style={styles.totalLatency}>Total: {totalMs} ms</Text>
      </View>

      <EvidenceCard evidence={evidenceData.evidence} />

      <Text style={styles.auditStamp}>
        Created {evidenceData.created_at} · ID {evidenceData.query_id}
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
  confidenceVal: {
    color: '#10B981',
    fontWeight: '700',
  },
  timelineRow: {
    flexDirection: 'row',
  },
  dotColumn: {
    width: 16,
    alignItems: 'center',
    marginRight: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0EA5E9',
    marginTop: 5,
  },
  dotLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#38BDF8',
  },
  stepBody: {
    flex: 1,
    paddingBottom: 18,
  },
  stepLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  stepStatus: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  totalLatency: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  auditStamp: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
  },
});