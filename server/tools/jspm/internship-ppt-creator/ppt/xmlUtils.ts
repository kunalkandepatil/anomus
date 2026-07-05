import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';

const TEMPLATE_PATH = path.resolve(process.cwd(), 'template/PPTFormat.pptx');

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function unzipTemplate(): Promise<JSZip> {
  if (!_templateBytes) {
    _templateBytes = fs.readFileSync(TEMPLATE_PATH);
  }
  return await JSZip.loadAsync(_templateBytes);
}

let _templateBytes: Buffer | null = null;

export async function insertSlide(
  zip: JSZip,
  slideIndex: number,
  slideXml: string,
  slideId: number,
): Promise<void> {
  const slideFilename = `slide${slideIndex}.xml`;
  const slidePartName = `/ppt/slides/${slideFilename}`;

  zip.file(`ppt/slides/${slideFilename}`, slideXml);

  const contentTypesRaw = await zip.file('[Content_Types].xml')!.async('string');
  const slideContentType =
    'application/vnd.openxmlformats-officedocument.presentationml.slide+xml';
  const newOverride = `<Override PartName="${slidePartName}" ContentType="${slideContentType}"/>`;
  const updatedContentTypes = contentTypesRaw.replace(
    '</Types>',
    `${newOverride}</Types>`,
  );
  zip.file('[Content_Types].xml', updatedContentTypes);

  const presRelsRaw = await zip.file('ppt/_rels/presentation.xml.rels')!.async('string');
  const existingRIds = [...presRelsRaw.matchAll(/Id="rId(\d+)"/g)].map((m) =>
    parseInt(m[1], 10),
  );
  const nextRId = existingRIds.length > 0 ? Math.max(...existingRIds) + 1 : 100;
  const rId = `rId${nextRId}`;
  const slideRelType =
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';
  const newPresRel = `<Relationship Id="${rId}" Type="${slideRelType}" Target="slides/${slideFilename}"/>`;
  const updatedPresRels = presRelsRaw.replace(
    '</Relationships>',
    `${newPresRel}</Relationships>`,
  );
  zip.file('ppt/_rels/presentation.xml.rels', updatedPresRels);

  const layoutRelType =
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout';
  const slideRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="${layoutRelType}" Target="../slideLayouts/slideLayout12.xml"/>
</Relationships>`;
  zip.file(`ppt/slides/_rels/${slideFilename}.rels`, slideRels);

  const presXmlRaw = await zip.file('ppt/presentation.xml')!.async('string');
  const newSldId = `<p:sldId id="${slideId}" r:id="${rId}"/>`;
  const updatedPresXml = presXmlRaw.replace(
    '</p:sldIdLst>',
    `${newSldId}</p:sldIdLst>`,
  );
  zip.file('ppt/presentation.xml', updatedPresXml);
}

export async function rezip(zip: JSZip): Promise<Buffer> {
  const arrayBuffer = await zip.generateAsync({
    type: 'arraybuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return Buffer.from(arrayBuffer);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function updateAppProps(zip: JSZip, slideTitles: string[]): Promise<void> {
  const totalSlides = slideTitles.length;
  const vectorSize = 7 + totalSlides; // 6 fonts + 1 theme + N slide titles
  
  const fontsAndTheme = [
    'Aptos',
    'Aptos Display',
    'Arial',
    'Calibri',
    'Cambria',
    'Times New Roman',
    'Office Theme'
  ];

  const partItems = [
    ...fontsAndTheme.map(f => `<vt:lpstr>${escapeXml(f)}</vt:lpstr>`),
    ...slideTitles.map(t => `<vt:lpstr>${escapeXml(t)}</vt:lpstr>`)
  ].join('');

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <TotalTime>3874</TotalTime>
  <Words>80</Words>
  <Application>Microsoft Office PowerPoint</Application>
  <PresentationFormat>Widescreen</PresentationFormat>
  <Paragraphs>20</Paragraphs>
  <Slides>${totalSlides}</Slides>
  <Notes>1</Notes>
  <HiddenSlides>0</HiddenSlides>
  <MMClips>0</MMClips>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs>
    <vt:vector size="6" baseType="variant">
      <vt:variant><vt:lpstr>Fonts Used</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>6</vt:i4></vt:variant>
      <vt:variant><vt:lpstr>Theme</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>1</vt:i4></vt:variant>
      <vt:variant><vt:lpstr>Slide Titles</vt:lpstr></vt:variant>
      <vt:variant><vt:i4>${totalSlides}</vt:i4></vt:variant>
    </vt:vector>
  </HeadingPairs>
  <TitlesOfParts>
    <vt:vector size="${vectorSize}" baseType="lpstr">${partItems}</vt:vector>
  </TitlesOfParts>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>`;

  zip.file('docProps/app.xml', appXml.replace(/\n\s*/g, ''));
}
