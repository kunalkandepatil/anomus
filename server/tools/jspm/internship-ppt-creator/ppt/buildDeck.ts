import type { FormInput, Section } from '../types.js';
import { unzipTemplate, insertSlide, rezip } from './xmlUtils.js';
import { buildTitleSlide } from './titleSlide.js';
import { buildTocSlide } from './tocSlide.js';
import { buildContentSlides } from './contentSlide.js';

// ─── Convert AI outline to flat section list ──────────────────────────────────
export interface AIOutline {
  introduction: string[];
  objectives: string[];
  modules: { title: string; bullets: string[] }[];
  architecture: string[];
  resultsAndObservations: string[];
  advantages: string[];
  limitations: string[];
  conclusion: string[];
}

export function toSections(outline: AIOutline): Section[] {
  return [
    { title: 'Introduction', kind: 'intro', bullets: outline.introduction },
    { title: 'Introduction Objectives', kind: 'objectives', bullets: outline.objectives },
    ...outline.modules.map((m, i) => ({
      title: `Module ${i + 1}: ${m.title}`,
      kind: 'module' as const,
      bullets: m.bullets,
    })),
    { title: 'Architecture', kind: 'architecture', bullets: outline.architecture },
    {
      title: 'Results and Observations',
      kind: 'results' as const,
      bullets: outline.resultsAndObservations,
    },
    {
      title: 'Advantages & Limitations',
      kind: 'adv_lim' as const,
      bullets: [
        ...outline.advantages.map((a) => `✓ ${a}`),
        ...outline.limitations.map((l) => `✗ ${l}`),
      ],
    },
    { title: 'Conclusion', kind: 'conclusion' as const, bullets: outline.conclusion },
  ];
}

// ─── Main deck builder ────────────────────────────────────────────────────────
export async function buildDeck(input: FormInput, outline: AIOutline): Promise<Buffer> {
  console.log(`[buildDeck] Starting PowerPoint construction for: "${input.internshipTitle}"`);
  console.log(`[buildDeck] Student: ${input.studentName}, PRN: ${input.prn}, Class: ${input.classDiv}, Program: ${input.program}`);

  const startTime = Date.now();
  const zip = await unzipTemplate();

  // 1. Patch title slide (slide1.xml)
  console.log('[buildDeck] Building title slide...');
  await buildTitleSlide(zip, input);

  // 2. Derive sections and patch TOC slide (slide2.xml)
  const sections = toSections(outline);
  console.log(`[buildDeck] Mapped outline to ${sections.length} logical presentation sections:`);
  sections.forEach((sec, idx) => {
    console.log(`  - Section [${idx + 1}]: "${sec.title}" (${sec.bullets.length} bullets, kind: ${sec.kind})`);
  });

  console.log('[buildDeck] Building Table of Contents slide...');
  await buildTocSlide(zip, sections);

  // 3. Find existing sldId entries to compute max id before any modifications
  let presXml = await zip.file('ppt/presentation.xml')!.async('string');
  const existingIds = [...presXml.matchAll(/p:sldId[^/]*id="(\d+)"/g)].map((m) =>
    parseInt(m[1], 10),
  );
  let currentMaxId = existingIds.length > 0 ? Math.max(...existingIds) : 256;
  console.log(`[buildDeck] Maximum existing slide ID detected in template: ${currentMaxId}`);

  // Temporarily remove the Thank You slide from sldIdLst so we can append it last
  const thankYouMatch = presXml.match(/<p:sldId[^/]*r:id="rId4"\/>/);
  const thankYouEntry = thankYouMatch?.[0] ?? '';
  if (thankYouEntry) {
    console.log('[buildDeck] Temporarily detached Thank You slide from presentation order');
    presXml = presXml.replace(thankYouEntry, '');
    zip.file('ppt/presentation.xml', presXml);
  }

  // 4. Build and insert content slides (indices 4, 5, 6, ...)
  const slideDescriptors = buildContentSlides(sections);
  console.log(`[buildDeck] Segmented sections into ${slideDescriptors.length} physical content slides`);
  let nextSlideIndex = 4;

  for (const desc of slideDescriptors) {
    currentMaxId++;
    console.log(`[buildDeck] Inserting content slide index ${nextSlideIndex} - Title: "${desc.descriptor.title}" with slide ID: ${currentMaxId}`);
    await insertSlide(zip, nextSlideIndex, desc.xml, currentMaxId);
    nextSlideIndex++;
  }

  // 5. Re-append Thank You slide at the end of sldIdLst
  if (thankYouEntry) {
    console.log('[buildDeck] Re-attaching Thank You slide to the end of the presentation list');
    const presXmlAfter = await zip.file('ppt/presentation.xml')!.async('string');
    zip.file(
      'ppt/presentation.xml',
      presXmlAfter.replace('</p:sldIdLst>', `${thankYouEntry}</p:sldIdLst>`),
    );
  }

  console.log('[buildDeck] Packaging and re-zipping deck archive...');
  const buffer = await rezip(zip);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[buildDeck] PPTX deck created successfully in ${elapsed}s. Size: ${buffer.byteLength} bytes.`);
  return buffer;
}
