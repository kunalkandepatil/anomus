import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ArrowLeft, Check, ChevronRight } from 'lucide-react';
import type { GenerateRequest } from './api';
import { validateTitle, validateName, validatePrn, validateClassDiv, validateProgram } from '../../../validation';


/* ─── Config ─── */
interface Step {
  id: keyof GenerateRequest;
  question: (vals: Partial<GenerateRequest>) => React.ReactNode;
  sub: (vals: Partial<GenerateRequest>) => string;
  placeholder?: string | ((vals: Partial<GenerateRequest>) => string);
  hint?: string | ((vals: Partial<GenerateRequest>) => string);
  type: 'text' | 'select';
}

const STEPS: Step[] = [
  {
    id: 'internshipTitle',
    question: () => "What's your internship about?",
    sub: () => 'This becomes the title of your presentation.',
    placeholder: 'e.g. 	Google AI-ML',
    hint: 'Be specific — a good title sets the tone',
    type: 'text',
  },
  {
    id: 'studentName',
    question: () => "What's your full name?",
    sub: () => 'As it appears on your college records.',
    placeholder: 'e.g. 𝕱𝖑𝖆𝖒𝖊',
    hint: 'This goes on your cover slide',
    type: 'text',
  },
  {
    id: 'prn',
    question: (v) => {
      const name = v.studentName?.trim().split(' ')[0] ?? 'there';
      return (
        <>
          Hey <span style={{ color: 'var(--brand-red)' }}>{name}</span>! Your PRN?
        </>
      );
    },
    sub: () => 'Permanent Registration Number.',
    placeholder: (v) => {
      const name = v.studentName || '';
      if (/vikrant|akanksha/i.test(name)) {
        return 'e.g. 22458020066';
      }
      return 'e.g. 22458020070';
    },
    hint: 'Find it on your college ID or marksheet',
    type: 'text',
  },
  {
    id: 'classDiv',
    question: () => 'Which division?',
    sub: () => 'Your section or division.',
    placeholder: 'e.g. H',
    hint: 'Enter division letter (e.g. A, B, C)',
    type: 'text',
  },
  {
    id: 'program',
    question: () => 'Almost done! Your program?',
    sub: () => 'Enter your year, degree and branch.',
    placeholder: 'e.g. SY B. Tech CSE (AI-ML)',
    hint: 'FY / SY / TY followed by program name (e.g. SY B. Tech CSE (AI-ML))',
    type: 'text',
  },
];

interface IntakeFormProps {
  onSubmit: (data: GenerateRequest) => void;
  isLoading: boolean;
}

export const IntakeForm: React.FC<IntakeFormProps> = ({ onSubmit }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey] = useState(0);
  const [values, setValues] = useState<Partial<GenerateRequest>>({});
  const [current, setCurrent] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStep = STEPS[step];
  const total = STEPS.length;
  const isLastStep = step === total - 1;

  // Focus input on step change
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 420);
    // Pre-fill if already answered
    const existing = values[currentStep.id];
    setCurrent(existing ?? '');
    setError('');
    return () => clearTimeout(t);
  }, [step]);

  const advance = useCallback(() => {
    const val = current.trim();
    if (!val) {
      setError('This one is required ↑');
      return;
    }

    let validationError: string | null = null;
    switch (currentStep.id) {
      case 'internshipTitle':
        validationError = validateTitle(val, 'Internship title');
        break;
      case 'studentName':
        validationError = validateName(val, 'Student name');
        break;
      case 'prn':
        validationError = validatePrn(val, 'PRN');
        break;
      case 'classDiv':
        validationError = validateClassDiv(val);
        break;
      case 'program':
        validationError = validateProgram(val);
        break;
      default:
        break;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    const updated = { ...values, [currentStep.id]: val };
    setValues(updated);

    if (step < total - 1) {
      setDirection('forward');
      setAnimKey(k => k + 1);
      setStep(s => s + 1);
    } else {
      onSubmit(updated as GenerateRequest);
    }
  }, [current, values, step, total, currentStep, onSubmit]);

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

        {/* Text input */}
        {currentStep.type === 'text' && (
          <div className="wizard-field">
            <input
              ref={inputRef}
              id={currentStep.id}
              className={`wizard-input ${error ? 'wizard-input-error' : ''}`}
              type="text"
              value={current}
              placeholder={typeof currentStep.placeholder === 'function' ? currentStep.placeholder(values) : currentStep.placeholder}
              onChange={e => { setCurrent(e.target.value); setError(''); }}
              onKeyDown={handleKey}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <div className="wizard-field-meta">
              {error
                ? <span className="wizard-error">{error}</span>
                : <span className="wizard-hint">
                    {typeof currentStep.hint === 'function' ? currentStep.hint(values) : currentStep.hint}
                  </span>
              }
              <span className="wizard-enter-hint">press Enter ↵</span>
            </div>
          </div>
        )}

        {/* Continue */}
        <div className="wizard-actions">
          <button
            className="wizard-continue"
            onClick={advance}
            disabled={!current.trim()}
            type="button"
          >
            {isLastStep ? (
              <>Generate PPT <ChevronRight size={16} /></>
            ) : (
              <>Continue <ArrowRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
