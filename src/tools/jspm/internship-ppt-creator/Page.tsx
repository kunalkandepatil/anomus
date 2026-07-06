import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from '@unbrn/ui/Alert';
import { Button } from '@unbrn/ui/Button';
import { AlertCircle, ArrowLeft, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IntakeForm } from './IntakeForm';
import { ProgressStepper } from './ProgressStepper';
import { generatePpt } from './api';
import type { GenerateRequest } from './api';
import { THEME_COLOR } from '../../../theme';
import { FeedbackForm } from '../FeedbackForm';
import { logToDiscord } from '../../../logger';

type ToolState = 'form' | 'loading' | 'done' | 'error';

interface InternshipGeneratorPageProps {
  onLoadingStateChange?: (loading: boolean) => void;
}

export default function InternshipGeneratorPage({ onLoadingStateChange }: InternshipGeneratorPageProps) {
  const navigate = useNavigate();
  const [toolState, setToolState] = useState<ToolState>('form');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [downloadFilename, setDownloadFilename] = useState('internship-presentation.pptx');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastRequest, setLastRequest] = useState<GenerateRequest | null>(null);
  const [stepperStage, setStepperStage] = useState(0);
  const downloadStarted = useRef(false);

  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(toolState === 'loading');
    }
  }, [toolState, onLoadingStateChange]);

  const handleSubmit = async (data: GenerateRequest) => {
    setLastRequest(data);
    setToolState('loading');
    setErrorMessage('');
    setStepperStage(0);

    logToDiscord({
      toolName: 'Internship PPT Creator',
      studentName: data.studentName,
      domain: data.internshipTitle,
      status: 'started',
      details: {
        prn: data.prn,
        classDiv: data.classDiv,
        program: data.program
      }
    });

    try {
      // 1. Start the API call (stepperStage is 0 during this wait)
      const blob = await generatePpt(data);
      const slug = data.internshipTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const filename = `${slug || 'internship'}.pptx`;

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
            toolName: 'Internship PPT Creator',
            studentName: data.studentName,
            domain: data.internshipTitle,
            status: 'success',
            details: {
              prn: data.prn,
              classDiv: data.classDiv,
              program: data.program
            }
          });
        }, 2500);
      }, 3000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setErrorMessage(msg);
      setToolState('error');

      logToDiscord({
        toolName: 'Internship PPT Creator',
        studentName: data.studentName,
        domain: data.internshipTitle,
        status: 'failed',
        errorMessage: msg,
        details: {
          prn: data.prn,
          classDiv: data.classDiv,
          program: data.program
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

  // Auto-download helper
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
    if (toolState === 'form') {
      navigate('/');
    } else {
      handleReset();
    }
  };

  return (
    <div className="wizard-page">
      {/* ── Background Grid Accent ── */}
      <div className="wizard-grid-bg" />

      {/* ── Top floating back navigation ── */}
      <button className="wizard-home-back" onClick={handleBackAction}>
        <ArrowLeft size={11} />
        {toolState === 'form' ? 'All tools' : 'Start over'}
      </button>

      {/* ── Main content wrapper ── */}
      <div className="wizard-shell">
        {/* Form State */}
        {toolState === 'form' && (
          <IntakeForm onSubmit={handleSubmit} isLoading={false} />
        )}

        {/* Loading State */}
        {toolState === 'loading' && (
          <div className="wizard-step wizard-step-forward">
            <div className="wizard-question-block" style={{ marginBottom: '1.5rem' }}>
              <p className="wizard-sub">generating slides</p>
              <h2 className="wizard-question">
                building your <em>presentation</em>
              </h2>
            </div>
            <ProgressStepper currentStage={stepperStage} />
          </div>
        )}

        {/* Success/Done State */}
        {toolState === 'done' && resultBlob && (
          <div className="wizard-step wizard-step-forward">
            <div className="wizard-question-block" style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <p className="wizard-sub">success</p>
              <h2 className="wizard-question">
                presentation <em>generated</em>
              </h2>
            </div>

            {/* Premium File Dashboard Card */}
            <div className="premium-file-card">
              <div className="pfc-header">
                <div className="pfc-meta">
                  <h3 className="pfc-filename" title={downloadFilename}>{downloadFilename}</h3>
                  <p className="pfc-filesize">PowerPoint Presentation • JSPM Standard</p>
                </div>
              </div>

              <div className="pfc-divider" />

              <p className="pfc-status-msg">
                Your download should have started automatically. If it didn't, click the download button below.
              </p>

              {/* Action buttons embedded inside the card */}
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
                  Download Presentation
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
                toolName="Internship PPT Creator"
                studentName={lastRequest?.studentName}
                domain={lastRequest?.internshipTitle}
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
