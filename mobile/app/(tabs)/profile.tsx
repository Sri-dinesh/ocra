import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSettingsStore, UserRole } from '../../src/store/settingsStore';

const ROLES: { id: UserRole; title: string; desc: string }[] = [
  {
    id: 'fisherman',
    title: 'Coastal Fisherman',
    desc: 'Voice-first advice, PFZ suitability, safe return routes, boundary alerts',
  },
  {
    id: 'researcher',
    title: 'Marine Researcher',
    desc: 'Raw multi-sensor datasets, SST/Chlorophyll trends, species density',
  },
  {
    id: 'coast_guard',
    title: 'Coast Guard / Authority',
    desc: 'Vessel surveillance, IMBL containment violations, storm warnings',
  },
  {
    id: 'policymaker',
    title: 'Maritime Policy & Planner',
    desc: 'Zone analytics, aggregated risk overviews, policy briefs',
  },
];

const LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'ta-IN', label: 'தமிழ் (Tamil)' },
  { code: 'hi-IN', label: 'हिन्दी (Hindi)' },
  { code: 'te-IN', label: 'తెలుగు (Telugu)' },
];

export default function ProfileScreen() {
  const { role, language, setRole, setLanguage } = useSettingsStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Operational Persona</Text>
      <Text style={styles.sectionDesc}>
        Select your role to tailor conversational intelligence and map layers.
      </Text>

      {ROLES.map((r) => {
        const isSelected = role === r.id;
        return (
          <TouchableOpacity
            key={r.id}
            style={[styles.card, isSelected && styles.selectedCard]}
            onPress={() => setRole(r.id)}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, isSelected && styles.selectedCardTitle]}>
                {r.title}
              </Text>
              {isSelected && <Text style={styles.checkIcon}>✓</Text>}
            </View>
            <Text style={styles.cardDesc}>{r.desc}</Text>
          </TouchableOpacity>
        );
      })}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Voice & Language</Text>
      <View style={styles.langGrid}>
        {LANGUAGES.map((l) => {
          const isSelected = language === l.code;
          return (
            <TouchableOpacity
              key={l.code}
              style={[styles.langChip, isSelected && styles.selectedLangChip]}
              onPress={() => setLanguage(l.code)}
            >
              <Text style={[styles.langText, isSelected && styles.selectedLangText]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedCard: {
    borderColor: '#38BDF8',
    backgroundColor: '#0F2644',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  selectedCardTitle: {
    color: '#38BDF8',
  },
  checkIcon: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langChip: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  selectedLangChip: {
    backgroundColor: '#0369A1',
    borderColor: '#38BDF8',
  },
  langText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedLangText: {
    color: '#FFFFFF',
  },
});
