import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from '@unbrn/ui/Alert';
import { Button } from '@unbrn/ui/Button';
import { AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IntakeForm } from './IntakeForm';
import { ProgressStepper } from './ProgressStepper';
import { generateReport } from './api';
import type { GenerateReportRequest } from './api';
import { THEME_COLOR } from '../../../theme';
import { FeedbackForm } from '../FeedbackForm';
import { logToDiscord } from '../../../logger';

type ToolState = 'form' | 'loading' | 'done' | 'error';

interface InternshipReportPageProps {
  onLoadingStateChange?: (loading: boolean) => void;
}

export default function InternshipReportPage({ onLoadingStateChange }: InternshipReportPageProps) {
  const navigate = useNavigate();
  const [toolState, setToolState] = useState<ToolState>('form');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [downloadFilename, setDownloadFilename] = useState('internship-report.docx');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastRequest, setLastRequest] = useState<GenerateReportRequest | null>(null);
  const [stepperStage, setStepperStage] = useState(0);
  const downloadStarted = useRef(false);

  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(toolState === 'loading');
    }
  }, [toolState, onLoadingStateChange]);

  const handleSubmit = async (data: GenerateReportRequest) => {
    setLastRequest(data);
    setToolState('loading');
    setErrorMessage('');
    downloadStarted.current = false;
    setStepperStage(0);

    logToDiscord({
      toolName: 'Internship Report Creator',
      studentName: data.studentName,
      domain: data.internshipDomain,
      status: 'started',
      details: {
        companyName: data.companyName,
        classDiv: data.classDiv,
        rollNumber: data.rollNumber,
        program: data.program,
        semester: data.semester,
        schoolName: data.schoolName
      }
    });

    try {
      // 1. Start the API call (stepperStage is 0 during this wait)
      const blob = await generateReport(data);
      const slug = data.internshipDomain
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const filename = `${slug || 'internship-report'}.docx`;

      // 2. API succeeded! Advance to Stage 1 (Drafting)
      setStepperStage(1);

      // Stage 1 -> Stage 2 after 3.0 seconds
      setTimeout(() => {
        setStepperStage(2);

        // Stage 2 -> done after 2.5 seconds
        setTimeout(() => {
          setDownloadFilename(filename);
          setResultBlob(blob);
          setToolState('done');

          logToDiscord({
            toolName: 'Internship Report Creator',
            studentName: data.studentName,
            domain: data.internshipDomain,
            status: 'success',
            details: {
              companyName: data.companyName,
              classDiv: data.classDiv,
              rollNumber: data.rollNumber,
              program: data.program,
              semester: data.semester,
              schoolName: data.schoolName
            }
          });
        }, 2500);
      }, 3000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
      setToolState('error');

      logToDiscord({
        toolName: 'Internship Report Creator',
        studentName: data.studentName,
        domain: data.internshipDomain,
        status: 'failed',
        errorMessage: msg,
        details: {
          companyName: data.companyName,
          classDiv: data.classDiv,
          rollNumber: data.rollNumber,
          program: data.program,
          semester: data.semester,
          schoolName: data.schoolName
        }
      });
    }
  };

  const handleRetry = () => {
    if (lastRequest) handleSubmit(lastRequest);
    else setToolState('form');
  };

  const handleReset = () => {
    setToolState('form');
    setResultBlob(null);
    setErrorMessage('');
    setLastRequest(null);
    downloadStarted.current = false;
  };

  // Auto-download
  useEffect(() => {
    if (toolState === 'done' && resultBlob && !downloadStarted.current) {
      downloadStarted.current = true;
      const url = URL.createObjectURL(resultBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, [toolState, resultBlob, downloadFilename]);

  const handleBackAction = () => {
    if (toolState === 'form') navigate('/');
    else handleReset();
  };

  return (
    <div className="wizard-page">
      <div className="wizard-grid-bg" />

      <button className="wizard-home-back" onClick={handleBackAction}>
        <ArrowLeft size={11} />
        {toolState === 'form' ? 'All tools' : 'Start over'}
      </button>

      <div className="wizard-shell">
        {/* Form State */}
        {toolState === 'form' && (
          <IntakeForm onSubmit={handleSubmit} isLoading={false} />
        )}

        {/* Loading State */}
        {toolState === 'loading' && (
          <div className="wizard-step wizard-step-forward">
            <div className="wizard-question-block" style={{ marginBottom: '1.5rem' }}>
              <p className="wizard-sub">generating document</p>
              <h2 className="wizard-question">
                building your <em>report</em>
              </h2>
            </div>
            <ProgressStepper currentStage={stepperStage} />
          </div>
        )}

        {/* Success State */}
        {toolState === 'done' && resultBlob && (
          <div className="wizard-step wizard-step-forward">
            <div className="wizard-question-block" style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <p className="wizard-sub">success</p>
              <h2 className="wizard-question">
                report <em>generated</em>
              </h2>
            </div>

            <div className="premium-file-card">
              <div className="pfc-header">
                <div className="pfc-meta">
                  <h3 className="pfc-filename" title={downloadFilename}>{downloadFilename}</h3>
                  <p className="pfc-filesize">Word Document • JSPM Standard</p>
                </div>
              </div>

              <div className="pfc-divider" />

              <p className="pfc-status-msg">
                Your download should have started automatically. If it didn't, click below.
              </p>

              <div className="pfc-actions">
                <Button
                  variant="filled"
                  size={3}
                  fullWidth
                  accentColor={THEME_COLOR}
                  icon={<Download size={15} />}
                  iconPosition="left"
                  onClick={() => {
                    const url = URL.createObjectURL(resultBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = downloadFilename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  Download Report
                </Button>
                <Button
                  variant="outlined"
                  size={3}
                  fullWidth
                  icon={<ArrowLeft size={15} />}
                  iconPosition="left"
                  onClick={handleReset}
                >
                  Generate Another
                </Button>
              </div>
              <FeedbackForm
                toolName="Internship Report Creator"
                studentName={lastRequest?.studentName}
                domain={lastRequest?.internshipDomain}
              />
            </div>
          </div>
        )}

        {/* Error State */}
        {toolState === 'error' && (
          <div className="wizard-step wizard-step-forward">
            <div className="wizard-question-block" style={{ marginBottom: '1.5rem' }}>
              <p className="wizard-sub">failed</p>
              <h2 className="wizard-question">
                something went <em>wrong</em>
              </h2>
            </div>

            <div className="wizard-error-card">
              <Alert
                variant="duo"
                accentColor={THEME_COLOR}
                icon={<AlertCircle size={20} />}
                title="Generation failed"
                description={errorMessage}
                actions={
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <Button variant="outlined" size={1} onClick={handleRetry}>
                      Try again
                    </Button>
                    <Button variant="ghost" size={1} onClick={handleReset}>
                      Start over
                    </Button>
                  </div>
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
