import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { PressableScale, PulseRing } from '../ui/anim';
import { colors, radius, shadow } from '../../theme/theme';

interface Props {
  onRecordingComplete?: (audioUri: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export const PushToTalkButton: React.FC<Props> = ({
  onRecordingComplete,
  isProcessing,
  disabled,
  compact = true,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    }).catch(() => undefined);
  }, []);

  const handlePressIn = async () => {
    if (disabled || isProcessing) return;
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        console.warn('[ptt] audio permission not granted');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('[ptt] could not start recording', e);
      setIsRecording(false);
    }
  };

  const handlePressOut = async () => {
    if (!isRecording) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      setIsRecording(false);
      if (uri) onRecordingComplete?.(uri);
    } catch (e) {
      console.warn('[ptt] could not finalize recording', e);
      setIsRecording(false);
    }
  };

  return (
    <View style={styles.container}>
      {isRecording && (
        <View style={styles.pulseContainer}>
          <PulseRing color={colors.alertDanger} active={true} />
        </View>
      )}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Push to talk - Hold to speak"
        accessibilityState={{
          busy: isProcessing,
          selected: isRecording,
          disabled: disabled || isProcessing,
        }}
        disabled={disabled || isProcessing}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          compact ? styles.buttonCompact : styles.buttonLarge,
          isRecording ? styles.recording : styles.idle,
          (disabled || isProcessing) && styles.disabled,
        ]}
      >
        <Text style={[styles.micIcon, compact ? styles.micIconCompact : styles.micIconLarge]}>
          {isRecording ? '🔴' : '🎙️'}
        </Text>
      </PressableScale>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  buttonCompact: {
    width: 42,
    height: 42,
  },
  buttonLarge: {
    width: 56,
    height: 56,
  },
  idle: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
    ...shadow.card,
  },
  recording: {
    backgroundColor: colors.alertDangerBg,
    borderColor: colors.alertDanger,
  },
  disabled: {
    backgroundColor: colors.borderSubtle,
    borderColor: colors.border,
    opacity: 0.6,
  },
  micIcon: {
    textAlign: 'center',
  },
  micIconCompact: {
    fontSize: 18,
  },
  micIconLarge: {
    fontSize: 24,
  },
});