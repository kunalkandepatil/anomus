import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ArrowLeft, ChevronRight, SkipForward } from 'lucide-react';
import type { GenerateReportRequest } from './api';


/* ─── Step config ─── */
interface Step {
  id: keyof GenerateReportRequest;
  question: (vals: Partial<GenerateReportRequest>) => React.ReactNode;
  sub: (vals: Partial<GenerateReportRequest>) => string;
  placeholder?: string;
  hint?: string;
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    id: 'internshipDomain',
    question: () => "What's your internship domain?",
    sub: () => 'This becomes the main title on your cover page and certificate.',
    placeholder: 'e.g. Google AI-ML',
    hint: 'A descriptive domain or title sets the tone',
  },
  {
    id: 'companyName',
    question: () => 'Which company did you intern at?',
    sub: () => 'The organization that offered the internship.',
    placeholder: 'e.g. Eduskills, Google, Infosys, TCS',
    hint: 'Enter the official company name',
  },
  {
    id: 'studentName',
    question: () => "What's your full name?",
    sub: () => 'As it appears on your college records.',
    placeholder: 'e.g. 𝕱𝖑𝖆𝖒𝖊',
    hint: 'This goes on your cover page and certificate',
  },
  {
    id: 'classDiv',
    question: (v) => {
      const name = v.studentName?.trim().split(' ')[0] ?? 'there';
      return (
        <>
          Hey <span style={{ color: 'var(--brand-red)' }}>{name}</span>! Your division?
        </>
      );
    },
    sub: () => 'Your section or division.',
    placeholder: 'e.g. H',
    hint: 'Enter division letter (e.g. A, B, C)',
  },
  {
    id: 'rollNumber',
    question: () => 'Your PRN?',
    sub: () => 'Permanent Registration Number.',
    placeholder: 'e.g. 22458020070',
    hint: 'Find it on your college ID or marksheet',
  },
  {
    id: 'program',
    question: () => 'Your degree program?',
    sub: () => 'Enter your year, degree and branch.',
    placeholder: 'e.g. SY B. Tech CSE (AI-ML)',
    hint: 'FY / SY / TY followed by program name (e.g. SY B. Tech CSE (AI-ML))',
  },
  {
    id: 'schoolName',
    question: () => 'Your school name?',
    sub: () => 'The school within JSPM University.',
    placeholder: 'e.g. School of Computational Science',
    hint: 'As it appears on official documents',
  },
  {
    id: 'facultyGuideName',
    question: () => "Faculty guide's name?",
    sub: () => 'Your university-assigned faculty mentor.',
    placeholder: 'e.g. Ms. Shakuntala Devi',
    hint: 'Include title (Prof. / Dr.) if applicable',
    optional: true,
  },
  {
    id: 'industryGuideName',
    question: () => 'Industry guide? (if any)',
    sub: () => 'Your mentor from the company, if assigned.',
    placeholder: 'e.g. Mr. Elon Musk',
    hint: 'Leave blank and skip if no industry guide',
    optional: true,
  },
  {
    id: 'internshipStartDate',
    question: () => 'Internship start date?',
    sub: () => 'When did your internship begin?',
    placeholder: 'e.g. 11th May 2026',
    hint: 'Format: Day Month Year (e.g. 1st June 2026)',
  },
  {
    id: 'internshipEndDate',
    question: () => 'Internship end date?',
    sub: () => 'When did your internship end?',
    placeholder: 'e.g. 4th July 2026',
    hint: 'Format: Day Month Year',
  },
  {
    id: 'semester',
    question: () => 'Which semester?',
    sub: () => 'The semester during which you did this internship.',
    placeholder: 'e.g. IV',
    hint: 'Use Roman numerals (e.g. III, IV, V, VI)',
  },
];

interface IntakeFormProps {
  onSubmit: (data: GenerateReportRequest) => void;
  isLoading: boolean;
}

export const IntakeForm: React.FC<IntakeFormProps> = ({ onSubmit }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey] = useState(0);
  const [values, setValues] = useState<Partial<GenerateReportRequest>>({});
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStep = STEPS[step];
  const total = STEPS.length;
  const isLastStep = step === total - 1;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 420);
    const existing = values[currentStep.id];
    setCurrent(existing ?? '');
    setError('');
    return () => clearTimeout(t);
  }, [step]);

  const advance = useCallback(() => {
    if (!current.trim() && !currentStep.optional) {
      setError('This one is required ↑');
      return;
    }
    const updated = { ...values, [currentStep.id]: current.trim() };
    setValues(updated);

    if (step < total - 1) {
      setDirection('forward');
      setAnimKey(k => k + 1);
      setStep(s => s + 1);
    } else {
      onSubmit(updated as GenerateReportRequest);
    }
  }, [current, values, step, total, currentStep, onSubmit]);

  const skipOptional = useCallback(() => {
    if (!currentStep.optional) return;
    const updated = { ...values, [currentStep.id]: '' };
    setValues(updated);
    setDirection('forward');
    setAnimKey(k => k + 1);
    setStep(s => s + 1);
  }, [values, step, currentStep]);

  const goBack = useCallback(() => {
    if (step === 0) return;
    setDirection('back');
    setAnimKey(k => k + 1);
    setStep(s => s - 1);
  }, [step]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') advance();
  };

  return (
    <div className="wizard-shell">
      {/* ── Nav bar ── */}
      <div className="wizard-nav">
        <button
          className="wizard-back-btn"
          onClick={step === 0 ? undefined : goBack}
          style={{ opacity: step === 0 ? 0.5 : 1, pointerEvents: step === 0 ? 'none' : 'auto' }}
          aria-label="Previous question"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <span className="wizard-step-count">{step + 1} / {total}</span>

        <div className="wizard-step-tracker">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`wizard-tick ${i < step ? 'done' : i === step ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* ── Step content ── */}
      <div
        key={animKey}
        className={`wizard-step wizard-step-${direction}`}
      >
        <div className="wizard-question-block">
          <p className="wizard-sub">{currentStep.sub(values)}</p>
          <h2 className="wizard-question">{currentStep.question(values)}</h2>
        </div>

        <div className="wizard-field">
          <input
            ref={inputRef}
            id={currentStep.id}
            className={`wizard-input ${error ? 'wizard-input-error' : ''}`}
            type="text"
            value={current}
            placeholder={currentStep.placeholder}
            onChange={e => { setCurrent(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <div className="wizard-field-meta">
            {error
              ? <span className="wizard-error">{error}</span>
              : <span className="wizard-hint">{currentStep.hint}</span>
            }
            <span className="wizard-enter-hint">press Enter ↵</span>
          </div>
        </div>

        <div className="wizard-actions">
          <button
            className="wizard-continue"
            onClick={advance}
            disabled={!current.trim() && !currentStep.optional}
            type="button"
          >
            {isLastStep ? (
              <>Generate Report <ChevronRight size={16} /></>
            ) : (
              <>Continue <ArrowRight size={15} /></>
            )}
          </button>

          {currentStep.optional && (
            <button
              className="wizard-skip"
              onClick={skipOptional}
              type="button"
            >
              Skip <SkipForward size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
