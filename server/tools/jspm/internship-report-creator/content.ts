import { GoogleGenAI, Type } from '@google/genai';
import type { ReportFormInput, ReportContent } from './types.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const reportSchema = {
  type: Type.OBJECT,
  properties: {
    abstract: { type: Type.STRING },
    acknowledgement: { type: Type.STRING },
    introduction: { type: Type.ARRAY, items: { type: Type.STRING } },
    methodsAndTechniques: { type: Type.ARRAY, items: { type: Type.STRING } },
    modules: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          paragraphs: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title', 'paragraphs'],
      },
    },
    resultsAndDiscussion: { type: Type.ARRAY, items: { type: Type.STRING } },
    conclusion: { type: Type.ARRAY, items: { type: Type.STRING } },
    references: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'abstract',
    'acknowledgement',
    'introduction',
    'methodsAndTechniques',
    'modules',
    'resultsAndDiscussion',
    'conclusion',
    'references',
  ],
};

export async function buildContent(
  input: ReportFormInput,
): Promise<ReportContent> {
  const { internshipDomain, companyName, studentName, facultyGuideName, industryGuideName, schoolName, program } = input;

  console.log(`[report/buildContent] Generating structured report content for: "${internshipDomain}" at "${companyName}"...`);
  const startTime = Date.now();

  const guidesList: string[] = [];
  if (facultyGuideName) guidesList.push(`Faculty Guide: ${facultyGuideName}`);
  if (industryGuideName) guidesList.push(`Industry Guide: ${industryGuideName}`);
  const guideInfo = guidesList.length ? `- Guides: ${guidesList.join(', ')}` : '';

  const thankGuides = [
    facultyGuideName ? `faculty guide (${facultyGuideName})` : null,
    industryGuideName ? `industry guide (${industryGuideName})` : null,
  ].filter(Boolean).join(' and ');

  const prompt = `
You are an academic writer generating an internship report for a university student.

Student Details:
- Name: ${studentName}
- Program: ${program}
- School: ${schoolName}
- Internship Domain/Title: "${internshipDomain}"
- Company: ${companyName}
${guideInfo ? `${guideInfo}\n` : ''}

Generate the full, detailed, academic internship report content as JSON based on your deep technical knowledge of the internship domain/title: "${internshipDomain}". Follow these rules strictly:

1. **abstract**: Exactly ~150 words. Single prose paragraph. Cover purpose, tasks, methods, key results, and conclusion. No bullets.

2. **acknowledgement**: ~250–350 words (roughly 1 page). Single prose block. Thank the university (JSPM University, Pune), school (${schoolName}), ${thankGuides ? `${thankGuides}, ` : ''}company (${companyName}), and family. First person, sincere tone. Written by ${studentName}.

3. **introduction**: 3–4 paragraphs. Cover the organization/company background, the domain of the internship, its scope, and the objectives. Each paragraph 100–130 words. Make this highly specific to "${internshipDomain}".

4. **methodsAndTechniques**: 3 paragraphs. Describe the methods, tools, technologies, and techniques used during the internship. Each paragraph 100–120 words. Make this highly specific to "${internshipDomain}".

5. **modules**: Exactly 5 or 6 modules representing key chronological stages of the internship. Each module has a short descriptive title (2–5 words, NOT "Module 1/2/3") and exactly 3 paragraphs of detailed technical content describing what was done in that module. Each paragraph 100–120 words.

6. **resultsAndDiscussion**: 3 paragraphs. Present outcomes, achievements, skills developed, and observations. Each paragraph 100–120 words.

7. **conclusion**: 3 paragraphs. Summarize the internship experience, key takeaways, and future directions. Each paragraph 80–100 words.

8. **references**: 8–12 APA-style references relevant to the internship domain. Format: Author(s). (Year). Title. Source/Publisher. URL if applicable.

Be highly specific to "${internshipDomain}". No generic filler. Use simple, clear, and easy-to-understand language. Avoid overly complex, convoluted, or dense academic jargon. Write in a straightforward style that a typical student can easily read, comprehend, and confidently explain to an examiner. Academic prose style but clear and accessible. No markdown formatting in the text.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: reportSchema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const text = response.text ?? '{}';
    console.log(`[report/buildContent] Gemini Raw Response:\n`, text);
    const parsed = JSON.parse(text) as ReportContent;
    console.log(
      `[report/buildContent] Content generated in ${elapsed}s. ` +
      `Modules: ${parsed.modules?.length ?? 0}, References: ${parsed.references?.length ?? 0}`
    );
    return parsed;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`[report/buildContent] Failed after ${elapsed}s:`, error);
    throw error;
  }
}
