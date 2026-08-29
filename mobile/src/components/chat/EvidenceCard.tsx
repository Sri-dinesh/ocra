import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EvidenceItem } from '../../types/contract';

interface Props {
  evidence: EvidenceItem[];
}

export const EvidenceCard: React.FC<Props> = ({ evidence }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audited Evidence Trace</Text>
      {evidence.map((item, idx) => (
        <View key={idx} style={styles.itemContainer}>
          <Text style={styles.claim}>{item.claim}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.source}>Source: {item.source}</Text>
            <Text style={styles.time}>{item.fetched_at}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 8,
  },
  title: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  itemContainer: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  claim: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  source: {
    color: '#10B981',
    fontSize: 12,
  },
  time: {
    color: '#64748B',
    fontSize: 11,
  },
});
