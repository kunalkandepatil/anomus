import type JSZip from 'jszip';
import type { FormInput } from '../types.js';
import { escapeXml } from './xmlUtils.js';

/**
 * Patches slide1.xml in-place with the student's form data.
 */
export async function buildTitleSlide(zip: JSZip, form: FormInput): Promise<void> {
  let xml = await zip.file('ppt/slides/slide1.xml')!.async('string');

  const replaceRun = (from: string, to: string) => {
    xml = xml.replace(`<a:t>${from}</a:t>`, `<a:t>${to}</a:t>`);
  };

  replaceRun('Internship Title', escapeXml(form.internshipTitle));
  replaceRun('Student Name', 'Name');
  replaceRun(': ', `: ${escapeXml(form.studentName)}`);
  replaceRun('PRN:', `PRN: ${escapeXml(form.prn)}`);
  xml = xml.replace(
    '<a:t>Class &amp; Div:</a:t>',
    `<a:t>Class &amp; Div: ${escapeXml(form.classDiv)}</a:t>`,
  );
  xml = xml.replace(
    '<a:t>: (B.Tech- FY/SY/TY-CSE/IT/AIML/DS)/(BSc-FY/SY-CS/DSAI)/BCA(FY/SY)</a:t>',
    `<a:t>: ${escapeXml(form.program)}</a:t>`,
  );

  zip.file('ppt/slides/slide1.xml', xml);
}
