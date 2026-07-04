import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve template path relative to project root (5 levels up from this file)
const TEMPLATE_PATH = path.resolve(__dirname, '../../../../../template/Internship_Report_Format.docx');

// ─── Load template ─────────────────────────────────────────────────────────────
export async function unzipReportTemplate(): Promise<JSZip> {
  const buffer = fs.readFileSync(TEMPLATE_PATH);
  return JSZip.loadAsync(buffer);
}

// ─── Re-zip to buffer ──────────────────────────────────────────────────────────
export async function rezip(zip: JSZip): Promise<Buffer> {
  return zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// ─── XML helpers ───────────────────────────────────────────────────────────────
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Build a standard body paragraph `<w:p>` with given text and optional formatting. */
export function makeParagraph(text: string, opts: {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  center?: boolean;
  fontSize?: number;        // half-points (e.g. 24 = 12pt)
  spaceBefore?: number;     // twips
  spaceAfter?: number;      // twips
  pageBreakBefore?: boolean;
} = {}): string {
  const rPrParts: string[] = [];
  if (opts.bold)      rPrParts.push('<w:b/><w:bCs/>');
  if (opts.italic)    rPrParts.push('<w:i/><w:iCs/>');
  if (opts.underline) rPrParts.push('<w:u w:val="single"/>');
  if (opts.fontSize)  rPrParts.push(`<w:sz w:val="${opts.fontSize}"/><w:szCs w:val="${opts.fontSize}"/>`);
  const rPr = rPrParts.length ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : '';

  const pPrParts: string[] = [];
  const spacing: string[] = [];
  if (opts.spaceBefore !== undefined) spacing.push(`w:before="${opts.spaceBefore}"`);
  if (opts.spaceAfter  !== undefined) spacing.push(`w:after="${opts.spaceAfter}"`);
  if (spacing.length) pPrParts.push(`<w:spacing ${spacing.join(' ')}/>`);
  if (opts.center) pPrParts.push('<w:jc w:val="center"/>');
  if (opts.pageBreakBefore) pPrParts.push('<w:pageBreakBefore/>');
  const pPr = pPrParts.length ? `<w:pPr>${pPrParts.join('')}</w:pPr>` : '';

  const safeText = escapeXml(text);
  const needsPreserve = text.startsWith(' ') || text.endsWith(' ');
  const tAttrib = needsPreserve ? ' xml:space="preserve"' : '';

  return `<w:p>${pPr}<w:r>${rPr}<w:t${tAttrib}>${safeText}</w:t></w:r></w:p>`;
}

/** Build a section heading paragraph (bold, underlined, centered, 15pt ≈ sz30). */
export function makeHeading(text: string): string {
  return makeParagraph(text, {
    bold: true,
    underline: true,
    center: true,
    fontSize: 30,
    spaceAfter: 200,
  });
}

/** Build a numbered section heading (left-aligned, bold, e.g. "1. Introduction"). */
export function makeSectionTitle(text: string, pageBreakBefore: boolean = false): string {
  return makeParagraph(text, {
    bold: true,
    fontSize: 26,
    spaceAfter: 160,
    pageBreakBefore,
  });
}

/** Build a plain body paragraph (justified, 12pt = sz24, 1.5 line = spacing 360). */
export function makeBodyParagraph(text: string): string {
  return `<w:p><w:pPr><w:spacing w:after="160"/><w:jc w:val="both"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

/** Build a bullet / numbered list paragraph for References. */
export function makeListItem(text: string): string {
  return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr><w:spacing w:after="140"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}
/** Build a page break paragraph. */
export function makePageBreak(): string {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

/** Slugify a string for use as a filename. */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
