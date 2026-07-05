import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowRight, Presentation, FileText } from 'lucide-react';
import { LumenBeam } from '@unbrn/ui/LumenBeam';
import InternshipGeneratorPage from './tools/jspm/internship-ppt-creator/Page';
import InternshipReportPage from './tools/jspm/internship-report-creator/Page';
import colleges from './colleges.json';
import { THEME_COLOR } from './theme';

/* ─── Types ─── */
interface Tool {
  id: string;
  name: string;
  description: string;
  tags: string[];
  path: string;
  status: 'live' | 'coming-soon';
}

interface College {
  id: string;
  shortName: string;
  fullName: string;
  color: string;
  tools: Tool[];
}

/* ─── Tool Card ─── */
function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  const navigate = useNavigate();
  const isLive = tool.status === 'live';

  return (
    <div
      className="tool-card"
      onClick={() => isLive && navigate(tool.path)}
      role="button"
      tabIndex={isLive ? 0 : -1}
      onKeyDown={(e) => e.key === 'Enter' && isLive && navigate(tool.path)}
      aria-label={isLive ? `Open ${tool.name}` : `${tool.name} — coming soon`}
      style={!isLive ? { opacity: 0.38, cursor: 'default', pointerEvents: 'none' } : undefined}
    >
      <div className="tool-card-top">
        <span className="tool-card-num">{String(index + 1).padStart(2, '0')}</span>
        <div className="tool-card-tags">
          {tool.tags.map((tag, i) => (
            <span
              key={tag}
              className={`tool-tag ${i === 0 ? 'tool-tag-red' : 'tool-tag-muted'}`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="tool-card-body">
        <h2 className="tool-card-name">{tool.name}</h2>
        <div className="tool-card-divider" />
        <p className="tool-card-description">{tool.description}</p>
      </div>

      <div className="tool-card-footer">
        <span className="tool-card-link" style={!isLive ? { color: 'var(--text-subtle)' } : undefined}>
          {isLive ? (
            <>Open tool <ArrowRight size={13} className="tool-card-link-arrow" /></>
          ) : (
            'Coming soon'
          )}
        </span>
      </div>
    </div>
  );
}

/* ─── College Group ─── */
function CollegeGroup({ college }: { college: College }) {
  return (
    <div className="college-group fade-in-stagger visible">
      <div className="college-label">
        <span className="college-label-tag tool-tag tool-tag-red">{college.shortName}</span>
        <span className="college-label-name">{college.fullName}</span>
      </div>
      <div className="tools-grid">
        {college.tools.map((tool, i) => (
          <ToolCard key={tool.id} tool={tool} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ─── Home Page ─── */
function HomePage() {
  const [globalStats, setGlobalStats] = useState<{ ppt: number; report: number; total: number } | null>(null);

  useEffect(() => {
    fetch('/api/global-stats')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setGlobalStats(data))
      .catch(err => console.error('Failed to fetch global stats:', err));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.05 }
    );
    document.querySelectorAll('.fade-in, .fade-in-stagger').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="site-content">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-eyebrow fade-in visible">
          <a
            href="https://www.instagram.com/unbrntech/?utm_source=anomus"
            target="_blank"
            rel="noopener noreferrer"
            className="instagram-link"
          >
            follow @unbrntech
            <svg className="instagram-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <h1 className="hero-title fade-in visible">
          busy doing<br />
          <em>nothing?</em>
        </h1>

        <div className="hero-quote-container fade-in visible">
          <blockquote className="hero-subtitle">
            We know you're extremely occupied scrolling reels, grinding rank, and doing literally anything except your college work. don't worry, <em>anomus</em> will handle the reports and PPTs so you can get back to wasting your time.
          </blockquote>
          <cite className="hero-quote-author">— Every Student Ever</cite>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="tools-section">
        <div className="tools-section-header">
          <span className="tools-section-label">Available Tools</span>
          <div className="tools-section-line" />
        </div>

        {(colleges as College[]).map(college => (
          <CollegeGroup key={college.id} college={college} />
        ))}

        {globalStats !== null && (
          <div className="global-stats-simple fade-in visible">
            <span className="stats-number-only">{globalStats.total}</span>
            <span className="stats-label-only">unique documents generated by students so far</span>
          </div>
        )}
      </section>
    </main>
  );
}

/* ─── Header ─── */
interface HeaderProps {
  stats: { count: number; limit: number } | null;
}

function Header({ stats }: HeaderProps) {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="top-header">
      <div className="header-left">
        {isHome && (
          <Link to="/" className="header-logo">
            anomus<span className="logo-dot">.</span>
          </Link>
        )}
      </div>

      <div className="header-right">
        {stats && typeof stats.count === 'number' && typeof stats.limit === 'number' && (
          <span className="stats-text-simple">
            {stats.count}/{stats.limit} USED
          </span>
        )}
      </div>
    </header>
  );
}

/* ─── Root with Router ─── */
export default function App() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [beamSpeed, setBeamSpeed] = useState(0.3);
  const [intensity, setIntensity] = useState(0.5);
  const [beamWidth, setBeamWidth] = useState(3.0);
  const [stats, setStats] = useState<{ count: number; limit: number } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Apply theme color globally to all HTML elements and CSS variables
  useEffect(() => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = THEME_COLOR.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      document.documentElement.style.setProperty('--brand-red', THEME_COLOR);
      document.documentElement.style.setProperty('--brand-red-rgb', `${r}, ${g}, ${b}`);
    }
  }, []);

  const currentSpeedRef = useRef(0.3);
  const currentIntensityRef = useRef(0.5);
  const currentWidthRef = useRef(3.0);

  // Fetch initial stats
  useEffect(() => {
    fetchStats();
  }, []);

  // Refetch when generation completes (isGenerating false -> true -> false)
  const prevIsGenerating = useRef(isGenerating);
  useEffect(() => {
    if (prevIsGenerating.current && !isGenerating) {
      setTimeout(fetchStats, 1000);
    }
    prevIsGenerating.current = isGenerating;
  }, [isGenerating]);

  // Smooth transition of rotation speed, intensity, and beamWidth
  useEffect(() => {
    const targetSpeed = isGenerating ? 2.0 : 0.3;
    const targetIntensity = isGenerating ? 1.0 : 0.5;
    const targetWidth = isGenerating ? 5.0 : 3.0;

    const initialSpeed = currentSpeedRef.current;
    const initialIntensity = currentIntensityRef.current;
    const initialWidth = currentWidthRef.current;

    let start: number | null = null;
    const duration = 2000; // 2 seconds to ramp up/down
    let animId: number;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);

      // easeInOutQuad easing
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const currentSpeed = initialSpeed + (targetSpeed - initialSpeed) * easeProgress;
      currentSpeedRef.current = currentSpeed;
      setBeamSpeed(currentSpeed);

      const currentIntensity = initialIntensity + (targetIntensity - initialIntensity) * easeProgress;
      currentIntensityRef.current = currentIntensity;
      setIntensity(currentIntensity);

      const currentWidth = initialWidth + (targetWidth - initialWidth) * easeProgress;
      currentWidthRef.current = currentWidth;
      setBeamWidth(currentWidth);

      if (progress < 1) {
        animId = requestAnimationFrame(animate);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isGenerating]);

  return (
    <BrowserRouter>
      <div className="site-container">
        <LumenBeam
          topColor={THEME_COLOR}
          bottomColor="#0c0c0e"
          backgroundColor="#00000000"
          intensity={intensity}
          rotationSpeed={beamSpeed}
          interactive={false}
          glowAmount={0.002}
          beamWidth={beamWidth}
          beamHeight={0.25}
          noiseIntensity={0.5}
          beamRotation={245}
          mixBlendMode="normal"
          twist={0.2}
          pulseSpeed={0.4}
          className="homepage-lumen-beam"
        />

        <Header stats={stats} />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/jspm/internship-ppt-creator"
            element={<InternshipGeneratorPage onLoadingStateChange={setIsGenerating} />}
          />
          <Route
            path="/jspm/internship-report-creator"
            element={<InternshipReportPage onLoadingStateChange={setIsGenerating} />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
