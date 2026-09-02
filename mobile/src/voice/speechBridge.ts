import { Platform } from 'react-native';
import { API_BASE_URL } from '../api/client';
import { ttsService } from './tts';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Speech-to-Text + text-to-speech bridge (Task A5.x).
 * Recording (expo-av) is captured by the PTT button; this module converts the
 * recorded clip into a query and orchestrates spoken replies.
 */

/**
 * Transcribe a recorded audio clip into text.
 * Live transcription requires a Bhashini / Google STT key (see .env.example).
 * Until a key is configured we return a deterministic demo transcript so the
 * voice-first flow remains fully demonstrable end-to-end.
 */
const VOICE_DEMO_QUERIES = [
  'What are the wave height and wind speed at my location?',
  'Can I go fishing tomorrow morning near Kakinada?',
  'Plot the safest route to the fishing grounds 25 nm east.',
  'Any cyclone warning for the coast tonight?',
  'What is the sea surface temperature near Vizag?',
];
let voiceQueryIndex = 0;

export const sttService = {
  async transcribe(audioUri: string, language: string = 'en-IN'): Promise<string> {
    try {
      console.log('[STT] Uploading audio clip for transcription:', audioUri);
      const formData = new FormData();
      
      const fileData: any = {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'voice_input.m4a',
      };
      formData.append('file', fileData);
      formData.append('language', language);

      const baseUrl = API_BASE_URL;
      const res = await fetch(`${baseUrl}/api/v1/voice/stt`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text && data.text.trim()) {
          console.log('[STT] Successfully transcribed speech:', data.text.trim());
          return data.text.trim();
        }
        if (data.status === 'empty' || !data.text) {
          console.log('[STT] No speech detected in audio.');
          return '';
        }
      } else {
        const errText = await res.text();
        console.warn(`[STT] Backend returned status ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn('[STT] Live voice transcription upload failed:', err);
    }

    return '';
  },
};

/** Autoplay an assistant reply through TTS when enabled in settings. */
export async function speakReply(reply: string, lang?: string): Promise<void> {
  const { autoVoicePlayback, language: defaultLang } = useSettingsStore.getState();
  if (!autoVoicePlayback) return;
  await ttsService.speak(reply, lang || defaultLang);
}