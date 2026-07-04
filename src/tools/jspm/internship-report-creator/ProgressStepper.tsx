import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

interface ProgressStepperProps {
  currentStage: number;
}

const STAGES = [
  {
    title: 'Researching topic',
    descriptions: [
      'Searching the web…',
      'Reading sources…',
      'Extracting key concepts…',
    ],
  },
  {
    title: 'Drafting report content',
    descriptions: [
      'Structuring sections…',
      'Writing academic prose…',
      'Generating modules & references…',
    ],
  },
  {
    title: 'Building document',
    descriptions: [
      'Filling DOCX template…',
      'Applying JSPM formatting…',
      'Packaging .docx…',
    ],
  },
];

function useRotatingText(strings: string[], active: boolean, intervalMs = 2800) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) { setIdx(0); return; }
    const t = setInterval(() => setIdx(i => (i + 1) % strings.length), intervalMs);
    return () => clearInterval(t);
  }, [active, strings, intervalMs]);
  return strings[idx];
}

function useElapsed() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return secs;
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({ currentStage }) => {
  const elapsed = useElapsed();

  return (
    <div className="ps-root">
      <div className="ps-scanbar">
        <div className="ps-scanbar-fill" />
      </div>

      <div className="ps-steps">
        {STAGES.map((stage, i) => {
          const isDone = i < currentStage;
          const isActive = i === currentStage;
          return (
            <StageRow
              key={stage.title}
              stage={stage}
              index={i}
              isDone={isDone}
              isActive={isActive}
              isLast={i === STAGES.length - 1}
            />
          );
        })}
      </div>

      <div className="ps-footer">
        <span className="ps-elapsed">
          <span className="ps-elapsed-dot" />
          {elapsed}s elapsed
        </span>
        <span className="ps-hint">usually 45–90 seconds</span>
      </div>
    </div>
  );
};

function StageRow({
  stage, index, isDone, isActive, isLast,
}: {
  stage: typeof STAGES[0];
  index: number;
  isDone: boolean;
  isActive: boolean;
  isLast: boolean;
}) {
  const rotatedDesc = useRotatingText(stage.descriptions, isActive);

  return (
    <div className={`ps-row ${isDone ? 'ps-done' : isActive ? 'ps-active' : 'ps-pending'}`}>
      <div className="ps-marker-col">
        <div className="ps-marker">
          {isDone ? (
            <span className="ps-check"><Check size={11} strokeWidth={3} /></span>
          ) : isActive ? (
            <>
              <span className="ps-marker-num">{index + 1}</span>
              <span className="ps-spinner" />
            </>
          ) : (
            <span className="ps-marker-num">{index + 1}</span>
          )}
        </div>
        {!isLast && <div className={`ps-connector ${isDone ? 'ps-connector-done' : ''}`} />}
      </div>

      <div className="ps-content">
        <p className="ps-title">{stage.title}</p>
        {isActive && (
          <p className="ps-desc" key={rotatedDesc}>
            {rotatedDesc}
          </p>
        )}
        {isDone && (
          <p className="ps-desc ps-desc-done">Done</p>
        )}
      </div>
    </div>
  );
}
