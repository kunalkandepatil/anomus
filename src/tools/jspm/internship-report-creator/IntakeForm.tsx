import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ArrowLeft, ChevronRight, SkipForward } from 'lucide-react';
import type { GenerateReportRequest } from './api';
import { Dropzone } from '@unbrn/ui/Dropzone';
import { validateTitle, validateName, validatePrn, validateClassDiv, validateProgram, validateCompanyName, validateSchoolName, validateDate, validateSemester } from '../../../validation';


/* ─── Step config ─── */
interface Step {
  id: keyof GenerateReportRequest;
  question: (vals: Partial<GenerateReportRequest>) => React.ReactNode;
  sub: (vals: Partial<GenerateReportRequest>) => string;
  placeholder?: string | ((vals: Partial<GenerateReportRequest>) => string);
  hint?: string | ((vals: Partial<GenerateReportRequest>) => string);
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
    placeholder: (vals) => {
      const name = vals.studentName || '';
      if (/vikrant|akanksha/i.test(name)) {
        return 'e.g. 22458020066';
      }
      return 'e.g. 22458020070';
    },
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
  {
    id: 'certificateImage',
    question: () => 'Upload Internship Certificate',
    sub: () => 'Upload your certificate (PDF or Image) to attach it to the report.',
    hint: 'Supported formats: PDF, PNG, JPG, JPEG (PDF pages are auto-converted to images)',
    optional: true,
  },
];

const loadPdfJs = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjs);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js library from CDN.'));
    document.head.appendChild(script);
  });
};

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
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStep = STEPS[step];
  const total = STEPS.length;
  const isLastStep = step === total - 1;

  useEffect(() => {
    const t = setTimeout(() => {
      if (currentStep.id !== 'certificateImage') {
        inputRef.current?.focus();
      }
    }, 420);
    const existing = values[currentStep.id];
    setCurrent(existing ?? '');
    setError('');
    setIsProcessingFile(false);
    return () => clearTimeout(t);
  }, [step]);

  const processFile = async (file: File) => {
    setError('');
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      setError('Only PDF or Image files are supported.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setIsProcessingFile(true);

    try {
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
            setCurrent(result);
            setIsProcessingFile(false);
          } else {
            setError('Failed to read image file.');
            setIsProcessingFile(false);
          }
        };
        reader.onerror = () => {
          setError('Error reading image file.');
          setIsProcessingFile(false);
        };
        reader.readAsDataURL(file);
      } else {
        const pdfjs = await loadPdfJs();
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

            if (pdf.numPages === 0) {
              setError('The PDF file is empty.');
              setIsProcessingFile(false);
              return;
            }

            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
              setError('Could not initialize canvas context.');
              setIsProcessingFile(false);
              return;
            }

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise;

            const base64Png = canvas.toDataURL('image/png');
            setCurrent(base64Png);
            setIsProcessingFile(false);
          } catch (err: any) {
            console.error(err);
            setError('Failed to render PDF page. Make sure the PDF is not password protected.');
            setIsProcessingFile(false);
          }
        };
        reader.onerror = () => {
          setError('Error reading PDF file.');
          setIsProcessingFile(false);
        };
        reader.readAsArrayBuffer(file);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during file processing.');
      setIsProcessingFile(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleRemoveFile = () => {
    setCurrent('');
    setError('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (isProcessingFile) return;
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  };

  const advance = useCallback(() => {
    const val = current.trim();
    if (!val && !currentStep.optional) {
      setError('This one is required ↑');
      return;
    }

    let validationError: string | null = null;
    if (val || !currentStep.optional) {
      switch (currentStep.id) {
        case 'internshipDomain':
          validationError = validateTitle(val, 'Internship domain');
          break;
        case 'companyName':
          validationError = validateCompanyName(val);
          break;
        case 'studentName':
          validationError = validateName(val, 'Student name');
          break;
        case 'classDiv':
          validationError = validateClassDiv(val);
          break;
        case 'rollNumber':
          validationError = validatePrn(val, 'PRN');
          break;
        case 'program':
          validationError = validateProgram(val);
          break;
        case 'schoolName':
          validationError = validateSchoolName(val);
          break;
        case 'facultyGuideName':
          validationError = validateName(val, 'Faculty guide name', true);
          break;
        case 'industryGuideName':
          validationError = validateName(val, 'Industry guide name', true);
          break;
        case 'internshipStartDate':
          validationError = validateDate(val, 'Internship start date');
          break;
        case 'internshipEndDate':
          validationError = validateDate(val, 'Internship end date');
          break;
        case 'semester':
          validationError = validateSemester(val);
          break;
        default:
          break;
      }
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
          {currentStep.id === 'certificateImage' ? (
            <div className="wizard-file-upload">
              <input
                type="file"
                id="cert-file-input"
                accept="application/pdf,image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={isProcessingFile}
              />
              {isProcessingFile ? (
                <div className="file-upload-loader">
                  <div className="spinner" />
                  <p>Processing certificate...</p>
                </div>
              ) : current ? (
                <div className="file-preview-container">
                  <div className="file-preview-card">
                    <img src={current} alt="Certificate preview" className="file-preview-image" />
                    <div className="file-preview-overlay">
                      <button
                        type="button"
                        className="file-remove-btn"
                        onClick={handleRemoveFile}
                      >
                        Remove file
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Dropzone
                  accept="application/pdf,image/*"
                  multiple={false}
                  maxSize={10 * 1024 * 1024}
                  label="Upload Certificate"
                  description="PDF or Image up to 10MB"
                  onFilesDrop={(droppedFiles: File[]) => {
                    if (droppedFiles && droppedFiles[0]) {
                      processFile(droppedFiles[0]);
                    }
                  }}
                  accentColor="#0c8f00"
                />
              )}
            </div>
          ) : (
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
          )}
          <div className="wizard-field-meta">
            {error
              ? <span className="wizard-error">{error}</span>
              : <span className="wizard-hint">
                {typeof currentStep.hint === 'function' ? currentStep.hint(values) : currentStep.hint}
              </span>
            }
            {currentStep.id !== 'certificateImage' && (
              <span className="wizard-enter-hint">press Enter ↵</span>
            )}
          </div>
        </div>

        <div className="wizard-actions">
          <button
            className="wizard-continue"
            onClick={advance}
            disabled={isProcessingFile || (!current.trim() && !currentStep.optional)}
            type="button"
          >
            {isLastStep ? (
              <>Generate <ChevronRight size={16} /></>
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
