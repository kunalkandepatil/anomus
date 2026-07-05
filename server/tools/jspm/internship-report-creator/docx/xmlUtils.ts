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

/** Parse inline **bold** text into w:r runs, applying base properties if any */
export function textToRuns(text: string, baseRPrParts: string[] = []): string {
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  const runs: string[] = [];

  const getRPr = (isBoldMatch: boolean) => {
    const parts = [...baseRPrParts];
    if (isBoldMatch) {
      if (!parts.includes('<w:b/><w:bCs/>')) {
        parts.push('<w:b/><w:bCs/>');
      }
    }
    return parts.length ? `<w:rPr>${parts.join('')}</w:rPr>` : '';
  };

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const normalText = text.substring(lastIndex, match.index);
      const needsPreserve = normalText.startsWith(' ') || normalText.endsWith(' ');
      const tAttrib = needsPreserve ? ' xml:space="preserve"' : '';
      runs.push(`<w:r>${getRPr(false)}<w:t${tAttrib}>${escapeXml(normalText)}</w:t></w:r>`);
    }
    const boldText = match[1];
    const needsPreserve = boldText.startsWith(' ') || boldText.endsWith(' ');
    const tAttrib = needsPreserve ? ' xml:space="preserve"' : '';
    runs.push(`<w:r>${getRPr(true)}<w:t${tAttrib}>${escapeXml(boldText)}</w:t></w:r>`);
    
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const normalText = text.substring(lastIndex);
    const needsPreserve = normalText.startsWith(' ') || normalText.endsWith(' ');
    const tAttrib = needsPreserve ? ' xml:space="preserve"' : '';
    runs.push(`<w:r>${getRPr(false)}<w:t${tAttrib}>${escapeXml(normalText)}</w:t></w:r>`);
  }

  return runs.join('');
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

  const pPrParts: string[] = [];
  const spacing: string[] = [];
  if (opts.spaceBefore !== undefined) spacing.push(`w:before="${opts.spaceBefore}"`);
  if (opts.spaceAfter  !== undefined) spacing.push(`w:after="${opts.spaceAfter}"`);
  if (spacing.length) pPrParts.push(`<w:spacing ${spacing.join(' ')}/>`);
  if (opts.center) pPrParts.push('<w:jc w:val="center"/>');
  if (opts.pageBreakBefore) pPrParts.push('<w:pageBreakBefore/>');
  const pPr = pPrParts.length ? `<w:pPr>${pPrParts.join('')}</w:pPr>` : '';

  return `<w:p>${pPr}${textToRuns(text, rPrParts)}</w:p>`;
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
  return `<w:p><w:pPr><w:spacing w:after="160"/><w:jc w:val="both"/></w:pPr>${textToRuns(text)}</w:p>`;
}

/** Build a bullet / numbered list paragraph for References. */
export function makeListItem(text: string): string {
  return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr><w:spacing w:after="140"/></w:pPr>${textToRuns(text)}</w:p>`;
}

/** Parse paragraph content split by newlines, handling subheadings, bullet items, and plain prose */
export function processTextParagraph(paragraphText: string): string {
  const lines = paragraphText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const xmlParts: string[] = [];

  for (const line of lines) {
    if (line.startsWith('### ') || line.startsWith('#### ')) {
      // Subheading
      const headingText = line.replace(/^(###|####)\s+/, '');
      xmlParts.push(makeParagraph(headingText, {
        bold: true,
        fontSize: 24, // 12pt
        spaceBefore: 160,
        spaceAfter: 80,
      }));
    } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ') || line.startsWith('+ ')) {
      // List item
      const itemText = line.replace(/^([-\*•\+])\s+/, '');
      xmlParts.push(makeListItem(itemText));
    } else if (/^\d+\.\s+/.test(line)) {
      // Numbered list item
      const itemText = line.replace(/^\d+\.\s+/, '');
      xmlParts.push(makeListItem(itemText));
    } else {
      // Normal body paragraph
      xmlParts.push(makeBodyParagraph(line));
    }
  }

  return xmlParts.join('');
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

/** Build a paragraph containing a centered full-page image using an embed relationship ID. */
export function makeImageParagraph(relId: string, widthInches: number = 6.2, heightInches: number = 8.8): string {
  const cx = Math.round(widthInches * 914400);
  const cy = Math.round(heightInches * 914400);
  return `<w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="120" w:after="120"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:noProof/>
      </w:rPr>
      <w:drawing>
        <wp:inline distT="0" distB="0" distL="0" distR="0">
          <wp:extent cx="${cx}" cy="${cy}"/>
          <wp:effectExtent l="0" t="0" r="0" b="0"/>
          <wp:docPr id="999" name="Certificate"/>
          <wp:cNvGraphicFramePr>
            <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
          </wp:cNvGraphicFramePr>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="0" name="certificate.png"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip r:embed="${relId}"/>
                  <a:stretch>
                    <a:fillRect/>
                  </a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm>
                    <a:off x="0" y="0"/>
                    <a:ext cx="${cx}" cy="${cy}"/>
                  </a:xfrm>
                  <a:prstGeom prst="rect">
                    <a:avLst/>
                  </a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p>`;
}
