import type { FormInput } from './tools/jspm/internship-ppt-creator/types.js';
import type { ReportFormInput } from './tools/jspm/internship-report-creator/types.js';

export function validateName(name: string, fieldName: string, optional = false): string | null {
  const trimmed = name ? name.trim() : '';
  if (!trimmed) {
    if (optional) return null;
    return `${fieldName} is required.`;
  }
  if (trimmed.length < 3 || trimmed.length > 50) {
    return `${fieldName} must be between 3 and 50 characters.`;
  }
  const nameRegex = /^[a-zA-Z\s.']+(?:-[a-zA-Z\s.']+)*$/;
  if (!nameRegex.test(trimmed)) {
    return `${fieldName} must only contain letters, spaces, dots, hyphens, or apostrophes.`;
  }
  return null;
}

export function validatePrn(prn: string, fieldName = 'PRN'): string | null {
  const trimmed = prn ? prn.trim() : '';
  if (!trimmed) {
    return `${fieldName} is required.`;
  }
  const prnRegex = /^\d{10,12}$/;
  if (!prnRegex.test(trimmed)) {
    return `${fieldName} must be a 10 to 12 digit number.`;
  }
  return null;
}

export function validateClassDiv(classDiv: string): string | null {
  const trimmed = classDiv ? classDiv.trim() : '';
  if (!trimmed) {
    return 'Division is required.';
  }
  if (trimmed.length > 10) {
    return 'Division is too long (max 10 characters).';
  }
  const classDivRegex = /^(?:[FST]Y[- ]?|div(?:ision)?[- ]?)?[A-Z]$/i;
  if (!classDivRegex.test(trimmed)) {
    return 'Enter a valid division (e.g. A, B, C, or TY-A).';
  }
  return null;
}

export function validateProgram(program: string): string | null {
  const trimmed = program ? program.trim() : '';
  if (!trimmed) {
    return 'Program is required.';
  }
  if (trimmed.length < 3 || trimmed.length > 100) {
    return 'Program name must be between 3 and 100 characters.';
  }
  const validKeywords = [
    'tech', 'bca', 'mca', 'bsc', 'msc', 'mba', 'bba', 'cse', 'cs', 'it', 'ai', 'ml', 'ds', 'cyber', 'cloud', 'data', 'eng', 'comp', 'sc', 'science', 'computational'
  ];
  const lower = trimmed.toLowerCase();
  const hasKeyword = validKeywords.some(kw => lower.includes(kw));
  if (!hasKeyword) {
    return 'Please enter a valid degree program (e.g., SY B.Tech CSE, BCA, MSc).';
  }
  return null;
}

export function validateTitle(title: string, fieldName = 'Internship Title'): string | null {
  const trimmed = title ? title.trim() : '';
  if (!trimmed) {
    return `${fieldName} is required.`;
  }
  if (trimmed.length < 5 || trimmed.length > 150) {
    return `${fieldName} must be between 5 and 150 characters.`;
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return `${fieldName} must contain letters.`;
  }
  return null;
}

export function validateCompanyName(name: string): string | null {
  const trimmed = name ? name.trim() : '';
  if (!trimmed) {
    return 'Company name is required.';
  }
  if (trimmed.length < 2 || trimmed.length > 100) {
    return 'Company name must be between 2 and 100 characters.';
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return 'Company name must contain letters.';
  }
  return null;
}

export function validateSchoolName(name: string): string | null {
  const trimmed = name ? name.trim() : '';
  if (!trimmed) {
    return 'School name is required.';
  }
  if (trimmed.length < 5 || trimmed.length > 100) {
    return 'School name must be between 5 and 100 characters.';
  }
  if (!/[a-zA-Z]/.test(trimmed)) {
    return 'School name must contain letters.';
  }
  return null;
}

export function validateDate(dateStr: string, fieldName: string): string | null {
  const trimmed = dateStr ? dateStr.trim() : '';
  if (!trimmed) {
    return `${fieldName} is required.`;
  }
  if (trimmed.length < 5 || trimmed.length > 50) {
    return `${fieldName} must be a valid date format.`;
  }
  return null;
}

export function validateSemester(semester: string): string | null {
  const trimmed = semester ? semester.trim() : '';
  if (!trimmed) {
    return 'Semester is required.';
  }
  const semRegex = /^(?:[IVXLCDM]+|\d+)$/i;
  if (!semRegex.test(trimmed)) {
    return 'Semester must be Roman numerals (e.g. III, IV) or digits.';
  }
  if (trimmed.length > 10) {
    return 'Semester is too long.';
  }
  return null;
}

export function validatePptInput(input: FormInput): string | null {
  let err = validateTitle(input.internshipTitle, 'Internship Title');
  if (err) return err;

  err = validateName(input.studentName, 'Student name');
  if (err) return err;

  err = validatePrn(input.prn, 'PRN');
  if (err) return err;

  err = validateClassDiv(input.classDiv);
  if (err) return err;

  err = validateProgram(input.program);
  if (err) return err;

  return null;
}

export function validateReportInput(input: ReportFormInput): string | null {
  let err = validateTitle(input.internshipDomain, 'Internship domain');
  if (err) return err;

  err = validateCompanyName(input.companyName);
  if (err) return err;

  err = validateName(input.studentName, 'Student name');
  if (err) return err;

  err = validateClassDiv(input.classDiv);
  if (err) return err;

  err = validatePrn(input.rollNumber, 'PRN');
  if (err) return err;

  err = validateProgram(input.program);
  if (err) return err;

  err = validateSchoolName(input.schoolName);
  if (err) return err;

  err = validateName(input.facultyGuideName, 'Faculty guide name', true);
  if (err) return err;

  err = validateName(input.industryGuideName, 'Industry guide name', true);
  if (err) return err;

  err = validateDate(input.internshipStartDate, 'Internship start date');
  if (err) return err;

  err = validateDate(input.internshipEndDate, 'Internship end date');
  if (err) return err;

  err = validateSemester(input.semester);
  if (err) return err;

  return null;
}
