import { GoogleGenAI } from '@google/genai';

let currentKeyIndex = 1;

function getAIClient(): GoogleGenAI {
  const key = currentKeyIndex === 1 
    ? process.env.GEMINI_API_KEY 
    : (process.env.GEMINI_API_KEY_2 || process.env.GEMINI_API_KEY);
    
  return new GoogleGenAI({ apiKey: key });
}

const isQuotaError = (error: any): boolean => {
  const msg = String(error.message || error).toLowerCase();
  return (
    msg.includes('exhausted') ||
    msg.includes('quota') ||
    msg.includes('limit') ||
    msg.includes('429') ||
    msg.includes('403')
  );
};

export async function generateContentWithFallback(config: any): Promise<any> {
  let attempts = 0;
  const maxAttempts = 3;
  let delay = 2000;

  while (attempts < maxAttempts) {
    try {
      const ai = getAIClient();
      return await ai.models.generateContent(config);
    } catch (error: any) {
      attempts++;
      const isQuota = isQuotaError(error);

      // If it's a quota/exhaustion error, check if we can switch to key 2
      if (isQuota && currentKeyIndex === 1 && process.env.GEMINI_API_KEY_2) {
        console.warn('[Gemini Quota] Key 1 exhausted or rate limited. Switching to Key 2 failover...');
        currentKeyIndex = 2;
        attempts = 0; // Reset attempts for the new key
        delay = 2000;  // Reset delay
        continue;
      }

      // If we've run out of attempts on the active key
      if (attempts >= maxAttempts) {
        if (currentKeyIndex === 1 && process.env.GEMINI_API_KEY_2) {
          console.warn('[Gemini Failover] All attempts failed on Key 1. Trying Key 2...');
          currentKeyIndex = 2;
          attempts = 0;
          delay = 2000;
          continue;
        }
        
        // If both keys failed
        if (isQuota) {
          throw new Error('Daily generation limit reached. Please try again tomorrow.');
        }
        throw error;
      }

      // Wait with backoff before retrying
      console.warn(`[Gemini Retry] Attempt ${attempts} failed. Retrying in ${delay}ms...`, error.message || error);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error('Failed to generate content after all retries.');
}
