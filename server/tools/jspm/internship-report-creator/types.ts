// ─── Form input from the frontend ────────────────────────────────────────────
export interface ReportFormInput {
  internshipDomain: string;
  companyName: string;
  studentName: string;
  classDiv: string;
  rollNumber: string;
  program: string;
  schoolName: string;
  facultyGuideName: string;
  industryGuideName: string; // may be empty string if none
  internshipStartDate: string;
  internshipEndDate: string;
  semester: string;
}

// ─── AI-generated report content (Stage B JSON) ───────────────────────────────
export interface ReportModule {
  title: string;
  paragraphs: string[];
}

export interface ReportContent {
  abstract: string; // ~150 words, single block
  acknowledgement: string; // ~1 page, single block
  introduction: string[]; // 2-3 paragraphs
  methodsAndTechniques: string[]; // paragraphs
  modules: ReportModule[]; // 2-3 modules
  resultsAndDiscussion: string[]; // paragraphs
  conclusion: string[]; // paragraphs
  references: string[]; // APA-style list items
}
