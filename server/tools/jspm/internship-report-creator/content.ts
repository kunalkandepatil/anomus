import { Type } from '@google/genai';
import type { ReportFormInput, ReportContent } from './types.js';
import { generateContentWithFallback } from '../../../gemini.js';

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

Generate the full, detailed, academic internship report content as JSON based on your deep technical knowledge of the internship domain/title: "${internshipDomain}". Follow these rules strictly to ensure the report looks authentic, highly detailed, and "hand-made" (not like a generic blocky wall of AI prose):

1. **Formatting Rules (use within JSON string values)**:
   - **Bolding**: Highlight important software tools, programming languages, files, metrics, algorithms, database terms, or findings by wrapping them in double asterisks: **key term** (e.g., **React.js**, **Docker**, **94% accuracy**).
   - **Lists**: Present features, steps, advantages, or deliverables using bullet points starting with a hyphen and a space on a new line:
     - First bullet item
     - Second bullet item
   - **Subheadings**: Organize sections into smaller logical topics by putting a subheading starting with ### on a new line:
     ### Subheading Title
   - **Aesthetics**: Avoid perfectly uniform blocky paragraphs. Vary paragraph lengths and mix normal prose paragraphs with subheadings and bullet lists to make the report look naturally structured and hand-made.

2. **abstract**: Exactly ~150 words. Single prose paragraph. Cover purpose, tasks, methods, key results, and conclusion. Do NOT use any bolding, subheadings, or lists in this section.

3. **acknowledgement**: ~250–350 words (roughly 1 page). Single prose block. Sincere tone. Thank the university (JSPM University, Pune), school (${schoolName}), ${thankGuides ? `${thankGuides}, ` : ''}company (${companyName}), and family. First person. Written by ${studentName}. Do NOT use any bolding, subheadings, or lists here.

4. **introduction**: 6–8 detailed, comprehensive paragraph blocks (spanning exactly 2 pages, total of 700–900 words). Must cover: (a) Organization/Company background and industry context, (b) Overview and significance of the internship domain, (c) Detailed scope of the work/project, and (d) Internship objectives. Must include at least two subheadings (e.g., ### Company Profile, ### Internship Objectives) and a structured bulleted list of objectives. Use bolding to highlight key terms.

5. **methodsAndTechniques**: 3 paragraph blocks. Describe the methods, tools, technologies, and techniques used. Include a subheading (e.g., ### Technical Stack and Frameworks) followed by a bulleted list of the tools with bolded names and brief descriptions (e.g., - **Vite**: Used as the frontend build tool...).

6. **modules**: Exactly 5 or 6 modules representing key chronological stages of the internship. Each module has a short descriptive title (2–5 words, NOT "Module 1/2/3") and exactly 5 detailed paragraph/content blocks.
   - To make it look hand-made, do not write plain paragraphs.
   - For each module, generate exactly 5 blocks:
     - Block 1: A highly detailed, normal descriptive paragraph detailing the objectives, planning, and tasks of the module, mentioning specific software design patterns, files, and functions using bolding (approx. 120–150 words).
     - Block 2: A subheading (e.g., ### Configuration and Environment Setup, or ### Installation Checklist) followed by a detailed, step-by-step bulleted/numbered configuration or implementation checklist.
     - Block 3: A dense, technical paragraph detailing the core implementation, outlining the logic, algorithms, databases, libraries, API endpoints, or protocols utilized (approx. 120–150 words).
     - Block 4: A paragraph explaining the validation, testing, debugging, or optimization procedures conducted, highlighting how errors were handled and verified (approx. 100–120 words).
     - Block 5: A final paragraph detailing the integration, deliverables, and concrete outcomes/achievements of the module, linking it to the overall project (approx. 100–120 words).
   - Be extremely technical and specific to "${internshipDomain}". Mention actual API paths, configuration parameters, database models, or components where relevant.

7. **resultsAndDiscussion**: 3 paragraph/content blocks. Present outcomes, achievements, skills developed, and observations. Include a subheading (e.g., ### Key Findings and Performance Metrics) followed by a list of 3-5 specific bullet points detailing actual metrics, speed improvements, or project results.

8. **conclusion**: 3 paragraph blocks. Summarize the internship experience, key takeaways, and future directions. Use bold terms to highlight major lessons or future steps.

9. **references**: 8–12 APA-style references relevant to the internship domain. Format: Author(s). (Year). Title. Source/Publisher. URL if applicable. Do NOT use bolding, bullet points, or subheadings inside references.

Be highly specific to "${internshipDomain}". No generic filler. Use simple, clear, and easy-to-understand language. Avoid overly complex, convoluted, or dense academic jargon. Write in a straightforward style that a typical student can easily read, comprehend, and confidently explain to an examiner. Academic prose style but clear and accessible. Use markdown bolding (**key term**), newlines, subheadings (### heading), and list items (- item) strictly as specified above to create a professional, hand-made, and beautifully structured report. Do not use any other markdown formatting (like links, blockquotes, or code blocks).
`;

  try {
    const response = await generateContentWithFallback({
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
