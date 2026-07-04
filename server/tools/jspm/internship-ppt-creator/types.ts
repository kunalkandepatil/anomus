// ─── Form input from the frontend ────────────────────────────────────────────
export interface FormInput {
  internshipTitle: string;
  studentName: string;
  prn: string;
  classDiv: string;
  program: string;
}

// ─── AI outline (Stage B JSON) ────────────────────────────────────────────────
export interface ModuleSection {
  title: string;
  bullets: string[];
}

export interface Outline {
  introduction: string[];
  objectives: string[];
  modules: ModuleSection[];
  architecture: string[];
  resultsAndObservations: string[];
  advantages: string[];
  limitations: string[];
  conclusion: string[];
}

// ─── Derived flat section list (used for TOC + slide generation) ──────────────
export type SectionKind =
  | 'intro'
  | 'objectives'
  | 'module'
  | 'architecture'
  | 'results'
  | 'adv_lim'
  | 'conclusion';

export interface Section {
  title: string;
  kind: SectionKind;
  bullets: string[];
}

// ─── Single slide render descriptor (post-pagination) ────────────────────────
export interface SlideDescriptor {
  title: string;
  bullets: string[];
  fontSize: 20 | 18 | 16;
}
