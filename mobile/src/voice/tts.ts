import * as Speech from 'expo-speech';

/**
 * Text-to-Speech (Task A5.3) — expo-speech, device voices.
 * Falls back from a requested Indian language to English if the device has no
 * matching voice pack, so voice output never silently dies.
 */

const VOICE_FALLBACKS: Record<string, string[]> = {
  'ta-IN': ['ta-IN', 'ta', 'en-IN', 'en-US', 'en-GB'],
  'hi-IN': ['hi-IN', 'hi', 'en-IN', 'en-US', 'en-GB'],
  'te-IN': ['te-IN', 'te', 'en-IN', 'en-US', 'en-GB'],
  'en-IN': ['en-IN', 'en-US', 'en-GB'],
};

async function resolveVoice(language: string): Promise<{ language: string; voice: string | null }> {
  const wanted = VOICE_FALLBACKS[language] || ['en-IN', 'en-US'];
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || voices.length === 0) {
      return { language: wanted[0], voice: null };
    }
    const lower = voices.map((v) => (v.language || '').toLowerCase());
    for (const code of wanted) {
      const idx = lower.findIndex((l) => l === code.toLowerCase() || l.startsWith(code.toLowerCase()));
      if (idx >= 0) return { language: code, voice: voices[idx].identifier };
    }
    return { language: wanted[0], voice: null };
  } catch {
    return { language: wanted[0], voice: null };
  }
}

export const ttsService = {
  async speak(text: string, language: string = 'en-IN'): Promise<void> {
    if (!text) return;
    const clean = text.replace(/\s+/g, ' ').trim();
    const resolved = await resolveVoice(language);
    return new Promise<void>((resolve) => {
      try {
        Speech.speak(clean, {
          language: resolved.language,
          voice: resolved.voice ?? undefined,
          pitch: 1.0,
          rate: 0.92,
          onDone: () => resolve(),
          onStopped: () => resolve(),
          onError: () => {
            // Belt & braces: retry once with plain English.
            try {
              Speech.speak(clean, { language: 'en-US', rate: 0.95, onError: () => resolve() });
            } catch {
              resolve();
            }
          },
        });
      } catch {
        resolve();
      }
    });
  },

  stop(): void {
    try {
      Speech.stop();
    } catch {
      /* noop */
    }
  },
};