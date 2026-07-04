import type JSZip from 'jszip';
import type { Section } from '../types.js';
import { escapeXml } from './xmlUtils.js';

function tocFontSize(entryCount: number): number {
  if (entryCount <= 10) return 2000;
  if (entryCount <= 12) return 1800;
  if (entryCount <= 14) return 1600;
  return 1400;
}

function makeTocBullet(text: string, sz: number): string {
  return `<a:p><a:pPr marL="571500" indent="-571500" algn="just"><a:buFont typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US" sz="${sz}" dirty="0"><a:latin typeface="Times New Roman" panose="02020603050405020304" pitchFamily="18" charset="0"/><a:cs typeface="Times New Roman" panose="02020603050405020304" pitchFamily="18" charset="0"/></a:rPr><a:t>${escapeXml(text)}</a:t></a:r></a:p>`;
}

export async function buildTocSlide(zip: JSZip, sections: Section[]): Promise<void> {
  let xml = await zip.file('ppt/slides/slide2.xml')!.async('string');
  // Left-align the Table of Contents slide title and override default margins
  xml = xml.replace('<a:pPr algn="l"/>', '<a:pPr algn="l" marL="0" indent="0"/>');

  const sz = tocFontSize(sections.length);
  const bulletParagraphs = sections.map((s) => makeTocBullet(s.title, sz)).join('');

  const lstStyleEnd = '</a:lstStyle>';
  const txBodyEnd = '</p:txBody></p:sp></p:spTree>';

  const startIdx = xml.indexOf(lstStyleEnd);
  if (startIdx === -1) throw new Error('Could not find lstStyle in slide2.xml');

  const afterLstStyle = xml.indexOf(txBodyEnd, startIdx);
  if (afterLstStyle === -1) throw new Error('Could not find txBody end in slide2.xml');

  const before = xml.slice(0, startIdx + lstStyleEnd.length);
  const after = xml.slice(afterLstStyle);

  xml = before + bulletParagraphs + after;
  zip.file('ppt/slides/slide2.xml', xml);
}
