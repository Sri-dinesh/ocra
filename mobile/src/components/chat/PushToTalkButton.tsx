import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface Props {
  onRecordingComplete?: (audioUri: string) => void;
  isProcessing?: boolean;
}

export const PushToTalkButton: React.FC<Props> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);

  const handlePressIn = () => {
    setIsRecording(true);
    // TODO (AKASH): Implement audio recording start in Phase 5
  };

  const handlePressOut = () => {
    setIsRecording(false);
    // TODO (AKASH): Implement audio recording stop and send in Phase 5
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isProcessing}
      style={[
        styles.button,
        isRecording && styles.recordingButton,
        isProcessing && styles.disabledButton,
      ]}
    >
      <Text style={styles.buttonText}>
        {isProcessing ? 'Thinking...' : isRecording ? 'Listening...' : 'Hold to Speak'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordingButton: {
    backgroundColor: '#EF4444',
    transform: [{ scale: 1.05 }],
  },
  disabledButton: {
    backgroundColor: '#475569',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
