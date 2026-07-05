import type { ReportFormInput, ReportContent } from '../types.js';
import {
  unzipReportTemplate,
  rezip,
  escapeXml,
  makeBodyParagraph,
  makeHeading,
  makeSectionTitle,
  makeListItem,
  makePageBreak,
  slugify,
  makeParagraph,
  makeImageParagraph,
  processTextParagraph,
} from './xmlUtils.js';

function romanize(num: number): string {
  const romans = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  return romans[num] ?? String(num);
}

function makeTableRow(col1: string, col2: string, col3: string): string {
  return `<w:tr w:rsidR="00693395">
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="900" w:type="dxa"/>
        <w:tcBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
        </w:tcBorders>
        <w:tcMar>
          <w:top w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
        </w:tcMar>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:spacing w:after="120"/><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(col1)}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="6500" w:type="dxa"/>
        <w:tcBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
        </w:tcBorders>
        <w:tcMar>
          <w:top w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
        </w:tcMar>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:spacing w:after="120"/><w:jc w:val="left"/></w:pPr><w:r><w:t>${escapeXml(col2)}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="1600" w:type="dxa"/>
        <w:tcBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>
        </w:tcBorders>
        <w:tcMar>
          <w:top w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
        </w:tcMar>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:spacing w:after="120"/><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(col3)}</w:t></w:r></w:p>
    </w:tc>
  </w:tr>`;
}

function buildContentsTable(modules: { title: string }[], hasCertificate: boolean): string {
  const startPage = hasCertificate ? 10 : 9;
  const rows: string[] = [];
  rows.push(makeTableRow('Sr. No.', 'Particulars', 'Page No.'));
  rows.push(makeTableRow('1.', 'Introduction', String(startPage)));
  // Introduction spans 2 pages, so Methods and Techniques starts at startPage + 2
  rows.push(makeTableRow('2.', 'Methods and Techniques', String(startPage + 2)));
  
  const M = modules.length;
  modules.forEach((mod, idx) => {
    const num = idx + 1;
    const itemNum = idx + 3;
    const title = `Module ${romanize(num)}: ${mod.title}`;
    // Shifted page number calculation due to 2-page Introduction
    const pageNum = String(startPage + 2 + num);
    rows.push(makeTableRow(`${itemNum}.`, title, pageNum));
  });
  
  // Shifted page numbers due to 2-page Introduction
  rows.push(makeTableRow(`${M + 3}.`, 'Results and Discussion', String(startPage + 3 + M)));
  rows.push(makeTableRow(`${M + 4}.`, 'Conclusion', String(startPage + 4 + M)));
  rows.push(makeTableRow(`${M + 5}.`, 'References', String(startPage + 5 + M)));
  
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblCellMar>
        <w:left w:w="10" w:type="dxa"/>
        <w:right w:w="10" w:type="dxa"/>
      </w:tblCellMar>
      <w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="0"/>
    </w:tblPr>
    <w:tblGrid>
      <w:gridCol w:w="900"/>
      <w:gridCol w:w="6500"/>
      <w:gridCol w:w="1600"/>
    </w:tblGrid>
    ${rows.join('')}
  </w:tbl>`;
}

// ─── Cover-page placeholder replacement ───────────────────────────────────────
function fillCoverPage(xml: string, input: ReportFormInput): string {
  const {
    studentName, classDiv, rollNumber, program, schoolName,
    companyName, facultyGuideName, industryGuideName,
    internshipDomain, internshipStartDate, internshipEndDate, semester,
  } = input;

  const guideText = industryGuideName
    ? `${facultyGuideName} &amp; ${industryGuideName}`
    : facultyGuideName;

  const studentInfo = `${studentName}, ${classDiv}, ${rollNumber}`;

  // 1. Cover page fields - BOLDED (using exact literal XML run matching)
  xml = xml.replace(
    '<w:r><w:rPr><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>[Name of the School]</w:t></w:r>',
    `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>${escapeXml(schoolName)}</w:t></w:r>`
  );

  xml = xml.replace(
    '<w:r><w:rPr><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>[Name of the Program]</w:t></w:r>',
    `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>${escapeXml(program)}</w:t></w:r>`
  );

  // Replace the parentheses and "Internship Domain Name" placeholder - BOLDED
  const domainPlaceholder = '<w:r w:rsidR="00CB2708" w:rsidRPr="00CB2708"><w:rPr><w:i/><w:iCs/></w:rPr><w:t>(</w:t></w:r><w:r w:rsidR="00CB2708"><w:rPr><w:i/><w:iCs/></w:rPr><w:t>Internship Domain Name</w:t></w:r><w:r w:rsidR="00CB2708" w:rsidRPr="00CB2708"><w:rPr><w:i/><w:iCs/></w:rPr><w:t>)</w:t></w:r>';
  const domainReplacement = `<w:r><w:rPr><w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t>${escapeXml(internshipDomain)}</w:t></w:r>`;
  xml = xml.replace(domainPlaceholder, domainReplacement);
  xml = xml.replace('Internship Domain Name', escapeXml(internshipDomain));

  // Company name - BOLDED
  xml = xml.replace(
    '<w:r><w:rPr><w:i/><w:iCs/></w:rPr><w:t>(Name – Company offering Internship)</w:t></w:r>',
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(companyName)}</w:t></w:r>`
  );
  xml = xml.replace(
    '<w:r><w:rPr><w:i/><w:iCs/></w:rPr><w:t>(Name &#x2013; Company offering Internship)</w:t></w:r>',
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(companyName)}</w:t></w:r>`
  );
  xml = xml.replace(
    /\(Name [^<]{1,10} Company offering Internship\)/g,
    escapeXml(companyName),
  );

  // Student Info (Name, Class, Roll Number) - BOLDED
  xml = xml.replace(
    '<w:r><w:rPr><w:i/><w:iCs/></w:rPr><w:t>(Name, Class, Roll Number)</w:t></w:r>',
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(studentInfo)}</w:t></w:r>`
  );

  // Guides - BOLDED
  xml = xml.replace(
    '<w:r><w:rPr><w:i/><w:iCs/></w:rPr><w:t>(University Faculty Guide &amp; Industry Guide, if any)</w:t></w:r>',
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(guideText)}</w:t></w:r>`
  );

  // Abstract page title
  xml = xml.replace(
    '<w:t>[Title of Internship]</w:t>',
    `<w:t>${escapeXml(internshipDomain)}</w:t>`,
  );

  // Declaration: "(School and Faculty Name)" on Declaration Page - BOLDED
  xml = xml.replace(
    '<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>(School and Faculty Name)</w:t></w:r>',
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(schoolName)}</w:t></w:r>`
  );

  // Declaration page Student Name replacement (remove label, replace with student's name directly)
  xml = xml.replace(
    '<w:t>Name &amp; Signature of the Student</w:t>',
    `<w:t>${escapeXml(studentName)}</w:t>`
  );

  // 2. Certificate — university certificate sentence with bold filled contents and preserved spaces
  const certOldRun = '<w:r><w:t>This is to certify that Mr. / Miss ______________________________________ has carried out his/her internship on _____ (domain name) __________________ from ___________________________ (Company Name) ___________________ in the period of 11th May 2026 to 4th July 2026 in partial fulfilment of the requirement of the (Degree Name), in the School Name, under the Faculty of Science and Technology, during Sem ________ of the Academic Year 2024–2025.</w:t></w:r>';
  const certNewRuns = `<w:r><w:t xml:space="preserve">This is to certify that </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(studentName)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> has carried out his/her internship on </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(internshipDomain)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> from </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(companyName)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> in the period of </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">${escapeXml(internshipStartDate)} to ${escapeXml(internshipEndDate)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> in partial fulfilment of the requirement of the </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(program)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve">, in </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(schoolName)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve">, under the Faculty of Science and Technology, during Sem </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(semester)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> of the Academic Year 2025–2026.</w:t></w:r>`;
  xml = xml.replace(certOldRun, certNewRuns);

  // 3. Internship Certificate (company-issued page) with bold filled contents and preserved spaces
  const intCertOldRun = '<w:r><w:t>This is to certify that Mr./Ms. ______________________________, student of (Name of Degree) ________________ (A.Y. 2025–26), School ____________________, Faculty of Science and Technology, JSPM University Pune, has successfully completed four / six weeks of internship in our ________________________________ (Name of the Department / Organization) from ______________ to ______________ (date).</w:t></w:r>';
  const intCertNewRuns = `<w:r><w:t xml:space="preserve">This is to certify that </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(studentName)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve">, student of </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(program)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> (A.Y. 2025–26), </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(schoolName)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve">, Faculty of Science and Technology, JSPM University Pune, has successfully completed internship at </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t>${escapeXml(companyName)}</w:t></w:r>` +
    `<w:r><w:t xml:space="preserve"> from </w:t></w:r>` +
    `<w:r><w:rPr><w:b/><w:bCs/></w:rPr><w:t xml:space="preserve">${escapeXml(internshipStartDate)} to ${escapeXml(internshipEndDate)}</w:t></w:r>` +
    `<w:r><w:t>.</w:t></w:r>`;
  xml = xml.replace(intCertOldRun, intCertNewRuns);

  return xml;
}

// ─── Abstract section replacement ─────────────────────────────────────────────
function fillAbstract(xml: string, content: ReportContent): string {
  // Remove the placeholder guidance text block after "Abstract" heading
  // The placeholder paragraph: "(A page explaining the internship work, in a maximum of 150 words)"
  // And the guidelines list: "Guidelines for writing...", "Purpose:...", etc.
  // Replace everything between the Abstract heading run and the next page break with the abstract text

  const abstractPlaceholder = '<w:t>(A page explaining the internship work, in a maximum of 150 words)</w:t>';
  const guidelinesStart = '<w:t>Guidelines for writing a 150-word abstract for an internship report:</w:t>';

  // Find the paragraph containing the abstract placeholder instruction and replace it with the abstract
  // Strategy: replace the italic placeholder paragraph with the actual abstract paragraph
  const placeholderParaStart = xml.indexOf(abstractPlaceholder);
  if (placeholderParaStart !== -1) {
    // Find the start of this paragraph
    const pStart = xml.lastIndexOf('<w:p ', placeholderParaStart);
    // Find the end of this paragraph
    const pEnd = xml.indexOf('</w:p>', placeholderParaStart) + '</w:p>'.length;

    const abstractPara = makeBodyParagraph(content.abstract);
    xml = xml.slice(0, pStart) + abstractPara + xml.slice(pEnd);
  }

  // Remove the guidelines paragraphs (from "Guidelines for writing..." to the page break before Acknowledgement)
  // They span: Guidelines heading + 5 bullet list items + 1 closing para
  // We'll find the guidelines block and remove all those paragraphs
  const guidelinesIdx = xml.indexOf(guidelinesStart);
  if (guidelinesIdx !== -1) {
    const guidelinesParaStart = xml.lastIndexOf('<w:p ', guidelinesIdx);
    // Find the page break that ends this section
    const pageBreakAfterAbstract = xml.indexOf('<w:br w:type="page"/>', guidelinesIdx);
    if (pageBreakAfterAbstract !== -1) {
      const pageBreakParaStart = xml.lastIndexOf('<w:p ', pageBreakAfterAbstract);
      // Remove everything from guidelines para to (but not including) the page break paragraph
      xml = xml.slice(0, guidelinesParaStart) + xml.slice(pageBreakParaStart);
    }
  }

  return xml;
}

// ─── Acknowledgement section replacement ──────────────────────────────────────
function fillAcknowledgement(xml: string, content: ReportContent): string {
  const ackPlaceholder = '<w:t>(There should not be any mistake in name and initials; maximum 1 page.)</w:t>';
  const idx = xml.indexOf(ackPlaceholder);
  if (idx !== -1) {
    const pStart = xml.lastIndexOf('<w:p ', idx);
    const pEnd = xml.indexOf('</w:p>', idx) + '</w:p>'.length;

    // Split acknowledgement into paragraphs by double newlines or build as single block
    const ackParagraphs = content.acknowledgement
      .split(/\n\n+/)
      .filter(p => p.trim())
      .map(p => makeBodyParagraph(p.trim()))
      .join('');

    xml = xml.slice(0, pStart) + ackParagraphs + xml.slice(pEnd);
  }
  return xml;
}

// ─── Content section replacements ─────────────────────────────────────────────
/**
 * Replace a bracketed placeholder like `[Begin the Introduction chapter here…]`
 * with the provided paragraphs. Optionally sets the heading paragraph to start on a new page.
 */
function replaceContentSection(
  xml: string,
  bracketedPlaceholder: string,
  paragraphs: string[],
  addPageBreak: boolean = false,
): string {
  const escaped = escapeXml(bracketedPlaceholder);
  let idx = xml.indexOf(`<w:t>${escaped}</w:t>`);

  // Try without escaping (sometimes it's stored literally)
  if (idx === -1) {
    idx = xml.indexOf(`<w:t>${bracketedPlaceholder}</w:t>`);
  }

  if (idx === -1) {
    console.warn(`[buildReport] Placeholder not found: "${bracketedPlaceholder.slice(0, 60)}"`);
    return xml;
  }

  const pStart = xml.lastIndexOf('<w:p ', idx);
  const pEnd = xml.indexOf('</w:p>', idx) + '</w:p>'.length;

  const content = paragraphs.map(p => processTextParagraph(p)).join('');
  const headingStart = addPageBreak ? xml.lastIndexOf('<w:p ', pStart - 1) : -1;

  xml = xml.slice(0, pStart) + content + xml.slice(pEnd);

  if (addPageBreak && headingStart !== -1) {
    const pPrEnd = xml.indexOf('</w:pPr>', headingStart);
    const headingPEnd = xml.indexOf('</w:p>', headingStart);
    if (pPrEnd !== -1 && pPrEnd < headingPEnd) {
      xml = xml.slice(0, pPrEnd) + '<w:pageBreakBefore/>' + xml.slice(pPrEnd);
    } else {
      const headingOpenEnd = xml.indexOf('>', headingStart);
      xml = xml.slice(0, headingOpenEnd + 1) + '<w:pPr><w:pageBreakBefore/></w:pPr>' + xml.slice(headingOpenEnd + 1);
    }
  }

  return xml;
}

// ─── Main builder ─────────────────────────────────────────────────────────────
export async function buildReport(
  input: ReportFormInput,
  content: ReportContent,
): Promise<Buffer> {
  console.log(`[buildReport] Starting DOCX construction for: "${input.internshipDomain}"`);
  const startTime = Date.now();

  const zip = await unzipReportTemplate();
  let xml = await zip.file('word/document.xml')!.async('string');

  // 1. Cover page + certificate placeholders
  console.log('[buildReport] Filling cover page and certificate fields...');
  xml = fillCoverPage(xml, input);

  // 1.2 Insert uploaded certificate if provided
  let hasCertificate = false;
  if (input.certificateImage) {
    console.log('[buildReport] Certificate image uploaded, embedding...');
    try {
      const base64Data = input.certificateImage.split(',')[1] || input.certificateImage;
      const imgBuffer = Buffer.from(base64Data, 'base64');
      
      // Save image to zip
      zip.file('word/media/certificate.png', imgBuffer);

      // Register PNG Content Type in [Content_Types].xml
      let contentTypesXml = await zip.file('[Content_Types].xml')!.async('string');
      if (!contentTypesXml.includes('Extension="png"') && !contentTypesXml.includes('Extension="PNG"')) {
        const pngDefault = '<Default Extension="png" ContentType="image/png"/>';
        contentTypesXml = contentTypesXml.replace('</Types>', `${pngDefault}</Types>`);
        zip.file('[Content_Types].xml', contentTypesXml);
      }

      // Register relationship in word/_rels/document.xml.rels
      let relsXml = await zip.file('word/_rels/document.xml.rels')!.async('string');
      const matchIds = relsXml.match(/Id="rId(\d+)"/g);
      let maxId = 18;
      if (matchIds) {
        const ids = matchIds.map(m => parseInt(m.match(/\d+/)![0], 10));
        maxId = Math.max(...ids);
      }
      const imageRelId = `rId${maxId + 1}`;
      const newRel = `<Relationship Id="${imageRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/certificate.png"/>`;
      relsXml = relsXml.replace('</Relationships>', `${newRel}</Relationships>`);
      zip.file('word/_rels/document.xml.rels', relsXml);

      // Insert image into word/document.xml after Page 2
      const declIdx = xml.indexOf('DECLARATION BY STUDENT');
      if (declIdx !== -1) {
        const brIdx = xml.lastIndexOf('<w:br w:type="page"/>', declIdx);
        if (brIdx !== -1) {
          const pStart = xml.lastIndexOf('<w:p ', brIdx);
          const pEnd = xml.indexOf('</w:p>', brIdx) + '</w:p>'.length;
          
          if (pStart !== -1 && pEnd !== -1 && pStart < pEnd) {
            const certImgXml = makeImageParagraph(imageRelId);
            const replacement = `<w:p><w:r><w:br w:type="page"/></w:r></w:p>${certImgXml}<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
            xml = xml.slice(0, pStart) + replacement + xml.slice(pEnd);
            hasCertificate = true;
            console.log('[buildReport] Successfully inserted certificate image page after Page 2.');
          }
        }
      }
    } catch (err) {
      console.error('[buildReport] Failed to embed uploaded certificate image:', err);
    }
  }

  // 1.5 Replace Contents Table (second Table in document)
  console.log('[buildReport] Rebuilding Contents table...');
  const firstTblStart = xml.indexOf('<w:tbl>');
  const contentsTblStart = xml.indexOf('<w:tbl>', firstTblStart + 1);
  if (contentsTblStart !== -1) {
    const contentsTblEnd = xml.indexOf('</w:tbl>', contentsTblStart) + '</w:tbl>'.length;
    const newTblXml = buildContentsTable(content.modules, hasCertificate);
    xml = xml.slice(0, contentsTblStart) + newTblXml + xml.slice(contentsTblEnd);
  }

  // 2. Abstract
  console.log('[buildReport] Inserting abstract...');
  xml = fillAbstract(xml, content);

  // 3. Acknowledgement
  console.log('[buildReport] Inserting acknowledgement...');
  xml = fillAcknowledgement(xml, content);

  // 4. Introduction
  console.log('[buildReport] Inserting Introduction...');
  xml = replaceContentSection(
    xml,
    '[Begin the Introduction chapter here — 2 to 3 pages, describing the organization, the domain of the internship, and its objectives.]',
    content.introduction,
    true,
  );

  // 5. Methods and Techniques
  console.log('[buildReport] Inserting Methods and Techniques...');
  xml = replaceContentSection(
    xml,
    '[Describe the methods, tools, and techniques used during the internship.]',
    content.methodsAndTechniques,
    true,
  );

  // 6. Modules — Module I, II only (template only has 2 module placeholders)
  const modulePlaceholders = [
    '[Module I content.]',
    '[Module II content.]',
  ];
  content.modules.slice(0, 2).forEach((mod, i) => {
    const placeholder = modulePlaceholders[i];
    console.log(`[buildReport] Inserting ${mod.title} (Module ${i + 1})...`);
    // Build: module sub-heading + paragraphs
    const titlePara = makeSectionTitle(mod.title);
    const bodyParas = mod.paragraphs.map(p => processTextParagraph(p)).join('');
    const escaped = escapeXml(placeholder);
    let idx = xml.indexOf(`<w:t>${escaped}</w:t>`);
    if (idx === -1) idx = xml.indexOf(`<w:t>${placeholder}</w:t>`);
    if (idx !== -1) {
      const pStart = xml.lastIndexOf('<w:p ', idx);
      const pEnd = xml.indexOf('</w:p>', idx) + '</w:p>'.length;
      
      const headingStart = xml.lastIndexOf('<w:p ', pStart - 1);
      
      xml = xml.slice(0, pStart) + titlePara + bodyParas + xml.slice(pEnd);

      if (headingStart !== -1) {
        const pPrEnd = xml.indexOf('</w:pPr>', headingStart);
        const headingPEnd = xml.indexOf('</w:p>', headingStart);
        if (pPrEnd !== -1 && pPrEnd < headingPEnd) {
          xml = xml.slice(0, pPrEnd) + '<w:pageBreakBefore/>' + xml.slice(pPrEnd);
        } else {
          const headingOpenEnd = xml.indexOf('>', headingStart);
          xml = xml.slice(0, headingOpenEnd + 1) + '<w:pPr><w:pageBreakBefore/></w:pPr>' + xml.slice(headingOpenEnd + 1);
        }
      }
    } else {
      console.warn(`[buildReport] Placeholder not found for module ${i + 1}`);
    }
  });

  // If there are more modules, append them in order before the Results heading!
  const M = content.modules.length;
  if (content.modules.length >= 3) {
    const extraModules = content.modules.slice(2);
    extraModules.forEach((mod, idx) => {
      const moduleNum = idx + 3;
      console.log(`[buildReport] Appending extra module: ${mod.title} (Module ${moduleNum})...`);
      
      const resultIdx = xml.indexOf('<w:t>[Present and discuss the results/outcomes of the internship work.]</w:t>');
      if (resultIdx !== -1) {
        const resultParaStart = xml.lastIndexOf('<w:p ', resultIdx);
        const headingStart = xml.lastIndexOf('<w:p ', resultParaStart - 1);
        
        const chapterNum = moduleNum + 2;
        const mainHeading = `${chapterNum}. Module ${romanize(moduleNum)}`;
        
        const mainHeadingPara = `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:spacing w:before="300" w:after="200"/><w:pageBreakBefore/></w:pPr><w:r><w:rPr><w:b/><w:bCs/><w:color w:val="000000"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>${mainHeading}</w:t></w:r></w:p>`;
        
        const titlePara = makeSectionTitle(mod.title);
        const bodyParas = mod.paragraphs.map(p => processTextParagraph(p)).join('');
        
        xml = xml.slice(0, headingStart) + mainHeadingPara + titlePara + bodyParas + xml.slice(headingStart);
      }
    });
  }

  // Rename subsequent headings to have dynamic chapter numbers
  xml = xml.replace('5. Results and Discussion', `${3 + M}. Results and Discussion`);
  xml = xml.replace('6. Conclusion', `${4 + M}. Conclusion`);
  xml = xml.replace('7. References', `${5 + M}. References`);

  // 7. Results and Discussion
  console.log('[buildReport] Inserting Results and Discussion...');
  xml = replaceContentSection(
    xml,
    '[Present and discuss the results/outcomes of the internship work.]',
    content.resultsAndDiscussion,
    true,
  );

  // 8. Conclusion
  console.log('[buildReport] Inserting Conclusion...');
  xml = replaceContentSection(
    xml,
    '[Summarize the skills developed and achievements from the internship.]',
    content.conclusion,
    true,
  );

  // 9. References
  console.log('[buildReport] Inserting References...');
  const refsIdx = xml.indexOf('<w:t>[List references in APA style.]</w:t>');
  if (refsIdx !== -1) {
    const pStart = xml.lastIndexOf('<w:p ', refsIdx);
    const pEnd = xml.indexOf('</w:p>', refsIdx) + '</w:p>'.length;
    
    const headingStart = xml.lastIndexOf('<w:p ', pStart - 1);
    const refItems = content.references.map(ref => makeListItem(ref)).join('');
    
    xml = xml.slice(0, pStart) + refItems + xml.slice(pEnd);

    if (headingStart !== -1) {
      const pPrEnd = xml.indexOf('</w:pPr>', headingStart);
      const headingPEnd = xml.indexOf('</w:p>', headingStart);
      if (pPrEnd !== -1 && pPrEnd < headingPEnd) {
        xml = xml.slice(0, pPrEnd) + '<w:pageBreakBefore/>' + xml.slice(pPrEnd);
      } else {
        const headingOpenEnd = xml.indexOf('>', headingStart);
        xml = xml.slice(0, headingOpenEnd + 1) + '<w:pPr><w:pageBreakBefore/></w:pPr>' + xml.slice(headingOpenEnd + 1);
      }
    }
  } else {
    console.warn('[buildReport] References placeholder not found');
  }

  // Save updated document.xml
  zip.file('word/document.xml', xml);

  console.log('[buildReport] Packaging DOCX...');
  const buffer = await rezip(zip);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[buildReport] DOCX created in ${elapsed}s. Size: ${buffer.byteLength} bytes.`);
  return buffer;
}

export { slugify };
