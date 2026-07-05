import type { Section, SlideDescriptor } from '../types.js';
import { escapeXml } from './xmlUtils.js';

// ─── Overflow detection constants ─────────────────────────────────────────────
const CHARS_PER_LINE: Record<number, number> = {
  20: 65, // Times New Roman 20pt, widescreen body box (~9.14in wide)
  18: 75,
  16: 85,
};
const SPACING_LINES_PER_BULLET = 0.4; // spcBef virtual line

const BUDGET_BY_FONT_SIZE: Record<number, number> = {
  20: 10,
  18: 12,
  16: 15,
};

export function estimateVirtualLines(bullets: string[], fontSize: 20 | 18 | 16): number {
  const cpl = CHARS_PER_LINE[fontSize];
  return bullets.reduce((sum, b) => {
    if (b === 'Advantages' || b === 'Limitations') {
      const extraSpacing = b === 'Limitations' ? 1.0 : 0.0;
      return sum + 1.0 + extraSpacing;
    }
    const cleanText = b.startsWith('- ') ? b.substring(2) : b;
    const textLines = Math.ceil(cleanText.length / cpl);
    return sum + textLines + SPACING_LINES_PER_BULLET;
  }, 0);
}

export function canFit(bullets: string[], fontSize: 20 | 18 | 16): boolean {
  const lines = estimateVirtualLines(bullets, fontSize);
  const budget = BUDGET_BY_FONT_SIZE[fontSize];
  return lines <= budget;
}

export function chooseFontSize(bullets: string[]): 20 | 18 | 16 | null {
  for (const fs of [20, 18, 16] as const) {
    if (canFit(bullets, fs)) return fs;
  }
  return null; // must paginate
}

export function paginateBullets(bullets: string[]): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];

  for (const bullet of bullets) {
    const candidate = [...current, bullet];
    // Only paginate if the candidate cannot fit even at 16pt (the smallest font size)
    if (!canFit(candidate, 16) && current.length > 0) {
      pages.push(current);
      current = [bullet];
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

// ─── Content slide XML builder ────────────────────────────────────────────────
/**
 * Builds a single content slide XML string.
 * Matches slide2's visual language:
 *   - Title: Times New Roman, sz=3200 (32pt), bold, red FF0000
 *   - Body: Times New Roman, sz=param, justified, bullet "•"
 *   - Same position/size as slide2's title (sp id=2) and content box (sp id=4)
 *   - Slide layout: slideLayout12.xml (same as all existing slides)
 */
function buildContentSlideXml(title: string, bullets: string[], fontSize: 20 | 18 | 16): string {
  const sz = fontSize * 100; // OOXML sz is in hundredths of a point
  const isTwoLineTitle = title.length > 35;
  const contentY = isTwoLineTitle ? 2011997 : 1544637;
  const contentHeight = isTwoLineTitle ? 4062232 : 4529592;

  const bulletParas = bullets
    .map((b) => {
      if (b === 'Advantages' || b === 'Limitations') {
        const spacingMarkup = b === 'Limitations' ? '<a:p><a:pPr marL="0" indent="0"><a:buNone/></a:pPr></a:p>' : '';
        const headingPara = `<a:p><a:pPr marL="0" indent="0" algn="l"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="${sz}" b="1" dirty="0"><a:latin typeface="Times New Roman" panose="02020603050405020304" pitchFamily="18" charset="0"/><a:cs typeface="Times New Roman" panose="02020603050405020304" pitchFamily="18" charset="0"/></a:rPr><a:t>${escapeXml(b)}</a:t></a:r></a:p>`;
        return spacingMarkup + headingPara;
      }
      
      const cleanText = b.startsWith('- ') ? b.substring(2) : b;
      return `<a:p><a:pPr marL="571500" indent="-571500" algn="just"><a:buFont typeface="Arial" panose="020B0604020202020204" pitchFamily="34" charset="0"/><a:buChar char="•"/></a:pPr><a:r><a:rPr lang="en-US" sz="${sz}" dirty="0"><a:latin typeface="Times New Roman" panose="02020603050405020304" pitchFamily="18" charset="0"/><a:cs typeface="Times New Roman" panose="02020603050405020304" pitchFamily="18" charset="0"/></a:rPr><a:t>${escapeXml(cleanText)}</a:t></a:r></a:p>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>

      <!-- Title shape — mirrors slide2's subtitle shape position/style -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="subTitle" idx="1"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1600200" y="641124"/>
            <a:ext cx="9144000" cy="719590"/>
          </a:xfrm>
        </p:spPr>
        <p:txBody>
          <a:bodyPr><a:noAutofit/></a:bodyPr>
          <a:lstStyle/>
          <a:p>
            <a:pPr algn="l" marL="0" indent="0"/>
            <a:r>
              <a:rPr lang="en-US" sz="3200" b="1" dirty="0">
                <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
                <a:latin typeface="Times New Roman" panose="02020603050405020304" pitchFamily="18" charset="0"/>
                <a:cs typeface="Times New Roman" panose="02020603050405020304" pitchFamily="18" charset="0"/>
              </a:rPr>
              <a:t>${escapeXml(title)}</a:t>
            </a:r>
          </a:p>
        </p:txBody>
      </p:sp>

      <!-- Content body — mirrors slide2's Shape id=4 textbox position/style -->
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="4" name="Content"/>
          <p:cNvSpPr txBox="1"><a:spLocks/></p:cNvSpPr>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr>
          <a:xfrm>
            <a:off x="1600200" y="${contentY}"/>
            <a:ext cx="9144000" cy="${contentHeight}"/>
          </a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          <a:noFill/>
          <a:ln><a:noFill/></a:ln>
        </p:spPr>
        <p:txBody>
          <a:bodyPr spcFirstLastPara="1" vert="horz" wrap="square" lIns="91425" tIns="45700" rIns="91425" bIns="45700" rtlCol="0" anchor="t" anchorCtr="0">
            <a:noAutofit/>
          </a:bodyPr>
          <a:lstStyle/>
          ${bulletParas}
        </p:txBody>
      </p:sp>

    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

// ─── Public API: build all content slide XMLs ─────────────────────────────────
export function buildContentSlides(
  sections: Section[],
): { xml: string; descriptor: SlideDescriptor }[] {
  const results: { xml: string; descriptor: SlideDescriptor }[] = [];

  for (const section of sections) {
    const pages = paginateBullets(section.bullets);
    const totalPages = pages.length;

    for (let p = 0; p < pages.length; p++) {
      const bullets = pages[p];
      const fontSize = chooseFontSize(bullets) ?? 16;
      const title =
        totalPages > 1 ? `${section.title} (${p + 1}/${totalPages})` : section.title;

      results.push({
        xml: buildContentSlideXml(title, bullets, fontSize),
        descriptor: { title, bullets, fontSize },
      });
    }
  }

  return results;
}
