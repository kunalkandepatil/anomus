import { Type } from '@google/genai';
import { generateContentWithFallback } from '../../../gemini.js';

const outlineSchema = {
  type: Type.OBJECT,
  properties: {
    introduction: { type: Type.ARRAY, items: { type: Type.STRING } },
    objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title', 'bullets'],
      },
    },
    architecture: { type: Type.ARRAY, items: { type: Type.STRING } },
    resultsAndObservations: { type: Type.ARRAY, items: { type: Type.STRING } },
    advantages: { type: Type.ARRAY, items: { type: Type.STRING } },
    limitations: { type: Type.ARRAY, items: { type: Type.STRING } },
    conclusion: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'introduction',
    'objectives',
    'modules',
    'architecture',
    'resultsAndObservations',
    'advantages',
    'limitations',
    'conclusion',
  ],
};

export async function buildOutline(
  internshipTitle: string,
): Promise<{
  introduction: string[];
  objectives: string[];
  modules: { title: string; bullets: string[] }[];
  architecture: string[];
  resultsAndObservations: string[];
  advantages: string[];
  limitations: string[];
  conclusion: string[];
}> {
  console.log(`[buildOutline] Generating outline for: "${internshipTitle}"...`);
  const startTime = Date.now();
  try {
    const response = await generateContentWithFallback({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are an expert technical researcher and presentation outline creator. 
Generate a comprehensive, professional, slide-ready presentation outline for an internship presentation on the topic: "${internshipTitle}".

Using your deep domain knowledge about "${internshipTitle}", construct the outline adhering to the following strict guidelines:
1. Keep the language simple, clear, and easy to understand. Avoid overly complex or convoluted technical jargon. Ensure that a student can easily comprehend, explain, and prepare every bullet point during a presentation.
2. Every section must have highly specific, realistic, and detailed bullets related to "${internshipTitle}". Do not use generic placeholders, placeholders like "[Insert name]", or boilerplate text.
3. Structure the presentation slides exactly matching the schema.
4. "introduction": 4-6 concise bullets about the internship field, context, and standard scope.
5. "objectives": 4-6 concise bullets outlining key objectives and goals of the internship project/system.
6. "modules": Exactly 5 or 6 modules representing sequential/logical technical phases or stages of the internship work (e.g., Requirements & Analysis, System Design, Backend/Frontend Development, Testing/Integration, Deployment). Each module must have a title (short technical phrase of 2-5 words, not "Module X") and 4-6 detailed, factual bullets explaining the work done.
7. "architecture": 4-6 bullets describing the system architecture, technologies used, data flow, or components.
8. "resultsAndObservations": 4-6 bullets describing typical results, outputs, performance metrics, or observations from the project.
9. "advantages": 3-5 bullets, maximum 12 words per bullet, describing the benefits or positive outcomes of the system.
10. "limitations": 3-5 bullets, maximum 12 words per bullet, highlighting real-world constraints, challenges, or scope limitations of the system.
11. "conclusion": 4-6 bullets summarizing the learnings, future scope, and final takeaway.

CRITICAL FORMATTING RULES:
- Every bullet point in "introduction", "objectives", "modules.bullets", "architecture", "resultsAndObservations", and "conclusion" MUST be concise (STRICT MAX 6 bullets per section) and at most 15 words. Write tight, factual, PowerPoint-style bullet points, not paragraphs.
- Every bullet point in "advantages" and "limitations" MUST be at most 12 words.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: outlineSchema
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const text = response.text ?? '{}';
    console.log(`[buildOutline] Gemini Raw Response:\n`, text);
    const parsed = JSON.parse(text);
    console.log(
      `[buildOutline] Outline generated successfully in ${elapsed}s. Modules: ${parsed.modules?.length ?? 0}, Intro bullets: ${parsed.introduction?.length ?? 0}`
    );
    return parsed;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[buildOutline] Failed to generate outline after ${elapsed}s:`, error);
    throw error;
  }
}
