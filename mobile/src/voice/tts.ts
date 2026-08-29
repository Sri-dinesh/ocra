export const ttsService = {
  async speak(text: string, language: string = 'en-IN'): Promise<void> {
    // TODO (AKASH): Implement Bhashini / Expo Speech TTS playback in Phase 5
    console.log(`[TTS speaking (${language})]: ${text}`);
  },
};
