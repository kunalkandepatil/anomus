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
    title: 'Drafting slide content',
    descriptions: [
      'Structuring your deck…',
      'Writing slide copy…',
      'Organising sections…',
    ],
  },
  {
    title: 'Building presentation',
    descriptions: [
      'Assembling slides…',
      'Applying JSPM template…',
      'Packaging .pptx…',
    ],
  },
];

/** Cycles through description strings for the active stage */
function useRotatingText(strings: string[], active: boolean, intervalMs = 2800) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (!active) { setIdx(0); return; }
    const t = setInterval(() => setIdx(i => (i + 1) % strings.length), intervalMs);
    return () => clearInterval(t);
  }, [active, strings, intervalMs]);
  return strings[idx];
}

/** Elapsed-time counter */
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
      {/* Ambient scanline progress bar */}
      <div className="ps-scanbar">
        <div className="ps-scanbar-fill" />
      </div>

      {/* Steps */}
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

      {/* Elapsed */}
      <div className="ps-footer">
        <span className="ps-elapsed">
          <span className="ps-elapsed-dot" />
          {elapsed}s elapsed
        </span>
        <span className="ps-hint">usually 20–45 seconds</span>
      </div>
    </div>
  );
};

function StageRow({
  stage,
  index,
  isDone,
  isActive,
  isLast,
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
      {/* Marker */}
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

      {/* Content */}
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
