import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChatMessage } from '../../store/chatStore';
import { RiskBadge } from '../common/RiskBadge';

interface Props {
  message: ChatMessage;
  onPressEvidence?: (queryId: string) => void;
}

export const ChatBubble: React.FC<Props> = ({ message, onPressEvidence }) => {
  const isUser = message.role === 'user';
  const payload = message.responsePayload;

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.orcaContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.orcaBubble]}>
        {!isUser && payload?.risk_band && (
          <View style={styles.badgeRow}>
            <RiskBadge band={payload.risk_band} score={payload.risk_score} />
          </View>
        )}
        <Text style={[styles.text, isUser ? styles.userText : styles.orcaText]}>
          {message.text}
        </Text>

        {!isUser && payload?.caveats && payload.caveats.length > 0 && (
          <Text style={styles.caveatText}>
            ℹ️ {payload.caveats.join(' ')}
          </Text>
        )}

        {!isUser && payload?.query_id && (
          <TouchableOpacity
            style={styles.evidenceBtn}
            onPress={() => onPressEvidence && onPressEvidence(payload.query_id)}
          >
            <Text style={styles.evidenceBtnText}>Show the math (Evidence Trace) →</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.timestamp}>{message.timestamp}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  orcaContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  orcaBubble: {
    backgroundColor: '#1E293B',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeRow: {
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  orcaText: {
    color: '#E2E8F0',
  },
  caveatText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  evidenceBtn: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  evidenceBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
});
