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
import { colors, spacing, radius, typography } from '../../theme/theme';

interface Props {
  onRecordingComplete?: (audioUri: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export const PushToTalkButton: React.FC<Props> = ({ onRecordingComplete, isProcessing, disabled }) => {
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

  const idle = !isRecording && !isProcessing;

  return (
    <View style={styles.wrap}>
      <PulseRing color={isRecording ? colors.alertDanger : colors.aqua} active={isRecording} />
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Push to talk"
        accessibilityState={{ busy: isProcessing, selected: isRecording, disabled: disabled || isProcessing }}
        disabled={disabled || isProcessing}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          isRecording ? styles.recording : styles.idle,
          (disabled || isProcessing) && styles.disabled,
        ]}
      >
        <Text style={styles.micIcon}>{isRecording ? '🔴' : '🎙️'}</Text>
      </PressableScale>
      <Text style={[styles.label, isRecording && styles.labelRecording]}>
        {isProcessing ? 'Sagaradristi is thinking…' : isRecording ? 'Listening…' : idle ? 'Hold to speak' : 'Wait…'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  idle: {
    backgroundColor: colors.card,
    borderColor: colors.accent,
  },
  recording: {
    backgroundColor: colors.alertDangerBg,
    borderColor: colors.alertDanger,
  },
  disabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
    opacity: 0.7,
  },
  micIcon: {
    fontSize: 26,
  },
  label: {
    marginTop: spacing.xs,
    ...typography.caption,
    color: colors.textMuted,
  },
  labelRecording: {
    color: colors.alertDanger,
    fontWeight: '800',
  },
});