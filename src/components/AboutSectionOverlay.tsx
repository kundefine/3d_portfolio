import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Layers,
  Move3d,
  Sparkles,
} from 'lucide-react';
import { CinematicState, DirectorOverrides } from '../types/cinematic';
import { cosmicAudio } from '../utils/cosmicAudio';

interface AboutSectionOverlayProps {
  cinematicStateRef: React.MutableRefObject<CinematicState>;
  overridesRef: React.MutableRefObject<DirectorOverrides>;
  onSeekToProgress: (ratio: number) => void;
  onExploreWork: () => void;
  onContactClick: () => void;
}

interface AboutSlideItem {
  id: number;
  eraCode: string;
  eraSubtitle: string;
  releaseTag: string;
  releaseValue: string;
  displayLines: string[];
  bodyParagraph: string;
  domains: string[];
  accentHex: string;
  scrollRatio: number;
  rockYawTarget: number;
}

const ABOUT_SLIDES: AboutSlideItem[] = [
  {
    id: 0,
    eraCode: 'ERA — 01',
    eraSubtitle: 'Core Full-Stack Craft',
    releaseTag: 'Experience',
    releaseValue: '6+ Years Production',
    displayLines: [
      'Scalable web apps,',
      'efficient APIs,',
      'complex logic',
      '& modern full-stack',
      'for a new era.',
    ],
    bodyParagraph:
      'I am a passionate Software Engineer with over 6 years of professional experience building scalable web applications and backend systems. I specialize in designing efficient APIs, handling complex business logic, and working with modern full-stack technologies.',
    domains: [
      '6+ Years Experience',
      'Scalable Web Apps',
      'Backend Systems',
      'Efficient APIs',
    ],
    accentHex: '#2dd4bf', // Teal crystal accent
    scrollRatio: 0.74,
    rockYawTarget: -0.15,
  },
  {
    id: 1,
    eraCode: 'ERA — 02',
    eraSubtitle: 'Technonext & Enterprise Scale',
    releaseTag: 'Current Role',
    releaseValue: 'Technonext',
    displayLines: [
      'E-commerce,',
      'ticketing systems,',
      'exam platforms',
      '& high-performance',
      'reliable systems.',
    ],
    bodyParagraph:
      'Currently working at Technonext, I have contributed to multiple real-world projects including e-commerce platforms, ticketing systems, exam platforms, and service-based applications. I enjoy solving challenging problems, optimizing performance, and building systems that are reliable and maintainable.',
    domains: [
      'Technonext',
      'E-Commerce',
      'Ticketing Systems',
      'Exam Platforms',
      'Performance Optimization',
    ],
    accentHex: '#c084fc', // Amethyst crystal accent
    scrollRatio: 0.87,
    rockYawTarget: 0.55,
  },
  {
    id: 2,
    eraCode: 'ERA — 03',
    eraSubtitle: 'System-Level & Real-Time',
    releaseTag: 'Focus Horizon',
    releaseValue: 'VoIP · SIP · Real-Time',
    displayLines: [
      'System-level tech,',
      'VoIP architecture,',
      'SIP servers',
      '& real-time',
      'communication.',
    ],
    bodyParagraph:
      'Beyond coding, I have a growing interest in system-level technologies like VoIP, SIP servers, and real-time communication systems.',
    domains: [
      'VoIP Technologies',
      'SIP Servers',
      'Real-Time Communication',
      'System-Level Engineering',
    ],
    accentHex: '#00f2fe', // Cyan-teal accent
    scrollRatio: 0.98,
    rockYawTarget: 1.25,
  },
];

export const AboutSectionOverlay: React.FC<AboutSectionOverlayProps> = ({
  cinematicStateRef,
  overridesRef,
  onSeekToProgress,
  onExploreWork,
  onContactClick,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const leftColumnRef = useRef<HTMLDivElement | null>(null);
  const bottomMetaRef = useRef<HTMLDivElement | null>(null);

  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [showAllParagraphs, setShowAllParagraphs] = useState<boolean>(false);
  const [rockAngleDeg, setRockAngleDeg] = useState<number>(0);
  const lastSyncedSlideRef = useRef<number>(0);

  useEffect(() => {
    let rafId = 0;

    const syncFrom3DState = () => {
      const state = cinematicStateRef.current;
      const reducedMotion = overridesRef.current.reducedMotion;
      const reveal = Math.max(0, Math.min(1, state.aboutRevealProgress || 0));

      if (rootRef.current) {
        const isVisible = reveal > 0.01;
        rootRef.current.style.visibility = isVisible ? 'visible' : 'hidden';
        rootRef.current.style.pointerEvents = reveal > 0.45 ? 'auto' : 'none';
        rootRef.current.style.opacity = reveal.toFixed(3);
      }

      if (leftColumnRef.current) {
        const inv = 1 - reveal;
        const translateY = reducedMotion ? 0 : inv * 46;
        const translateZ = reducedMotion ? 0 : -inv * 110;
        const rotY = reducedMotion ? 0 : inv * 12;
        leftColumnRef.current.style.transform = `perspective(1200px) translate3d(0, ${translateY.toFixed(
          1
        )}px, ${translateZ.toFixed(1)}px) rotateY(${rotY.toFixed(2)}deg)`;
      }

      if (bottomMetaRef.current) {
        const inv = 1 - reveal;
        const translateY = reducedMotion ? 0 : inv * 24;
        bottomMetaRef.current.style.transform = `translate3d(0, ${translateY.toFixed(
          1
        )}px, 0)`;
      }

      // Sync active slide with continuous scroll chapter progress (0 -> 2)
      if (reveal > 0.35) {
        const chapterIdx = Math.min(
          2,
          Math.max(0, Math.round(state.aboutChapterProgress))
        );
        if (chapterIdx !== lastSyncedSlideRef.current) {
          lastSyncedSlideRef.current = chapterIdx;
          setActiveSlideIdx(chapterIdx);
        }
      }

      rafId = requestAnimationFrame(syncFrom3DState);
    };

    rafId = requestAnimationFrame(syncFrom3DState);
    return () => cancelAnimationFrame(rafId);
  }, [cinematicStateRef, overridesRef]);

  const handleSelectSlide = (idx: number) => {
    const clamped = Math.max(0, Math.min(ABOUT_SLIDES.length - 1, idx));
    setActiveSlideIdx(clamped);
    lastSyncedSlideRef.current = clamped;
    const targetSlide = ABOUT_SLIDES[clamped];
    // Smoothly scrub the 3D scroll timeline to that slide's position in 3D space
    onSeekToProgress(targetSlide.scrollRatio);
    cosmicAudio.playClickSound();
  };

  const handleRockSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const deg = parseFloat(e.target.value);
    setRockAngleDeg(deg);
    cinematicStateRef.current.aboutRockUserYaw = (deg * Math.PI) / 180;
  };

  const activeSlide = ABOUT_SLIDES[activeSlideIdx] || ABOUT_SLIDES[0];

  return (
    <div
      ref={rootRef}
      style={{ visibility: 'hidden', pointerEvents: 'none', opacity: 0 }}
      className="fixed inset-0 z-20 flex flex-col justify-between px-6 sm:px-12 lg:px-16 pt-20 pb-20 select-none overflow-hidden"
    >
      {/* Subtle Left-Side Readability Scrim (Leaves Right-Side 3D Obsidian & Crystal Rock 100% Unobstructed) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[58%] bg-gradient-to-r from-[#0b0c10]/95 via-[#0b0c10]/70 to-transparent -z-10"
      />

      {/* Top Row: Section Indicator & Quick Return to Galactus Hero */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs font-mono tracking-wider uppercase text-[#cbd5e1]">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: activeSlide.accentHex,
              boxShadow: `0 0 12px ${activeSlide.accentHex}`,
            }}
          />
          <span className="text-white font-semibold">About Md. Kajal Mia</span>
          <span aria-hidden="true" className="text-white/30">
            ·
          </span>
          <span className="text-[#94a3b8]">{activeSlide.eraCode}</span>
          <span aria-hidden="true" className="text-white/30">
            ·
          </span>
          <span className="text-[#5eead4]">{activeSlide.eraSubtitle}</span>
        </div>

        {/* Interactive 3D Rock Spin Hint & Back to Galactus Stage Button */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[#cbd5e1]">
            <Move3d className="w-3.5 h-3.5 text-[#2dd4bf]" />
            <span>Drag 3D Crystal Rock to Spin</span>
          </div>

          <button
            type="button"
            onClick={() => onSeekToProgress(0.56)}
            className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-medium text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Scroll up or click to glide back to Galactus in 3D space"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#2dd4bf]" />
            <span>Scroll Up · Galactus Hero</span>
          </button>
        </div>
      </div>

      {/* Center-Left Editorial Typography & Interactive 3D Perspective Slider (Matching about_eac5ce94.jpeg) */}
      <div
        ref={leftColumnRef}
        style={{ willChange: 'transform, opacity' }}
        className="my-auto w-full max-w-[600px] flex flex-col justify-center"
      >
        {/* 3D Perspective Slider Stage */}
        {!showAllParagraphs ? (
          <div className="relative" style={{ perspective: '1100px' }}>
            {/* Editorial Display Headline (Inspired by DFFRNT ERA reference image) */}
            <h2
              key={`headline-${activeSlide.id}`}
              className="font-serif font-light tracking-tight text-white text-[clamp(1.85rem,3.6vw,3.35rem)] leading-[1.08] mb-5 transition-all duration-500"
            >
              {activeSlide.displayLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h2>

            {/* User's Exact About Me Paragraph in a 3D Glass Card Plane */}
            <div className="rounded-2xl bg-[#101218]/80 backdrop-blur-md border border-white/15 p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.55)] transition-all duration-500">
              <p className="text-sm sm:text-base text-[#e2e8f0] leading-relaxed font-normal">
                {activeSlide.bodyParagraph}
              </p>

              {/* Unboxed typographic domain tags with · separators */}
              <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono text-[#94a3b8]">
                {activeSlide.domains.map((domain, idx) => (
                  <React.Fragment key={domain}>
                    <span
                      style={{
                        color: idx === 0 ? activeSlide.accentHex : undefined,
                      }}
                    >
                      {domain}
                    </span>
                    {idx < activeSlide.domains.length - 1 && (
                      <span aria-hidden="true" className="text-white/25">
                        ·
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Full Biography View: All 3 Exact Paragraphs Visible Together */
          <div
            data-scrollable-overlay="true"
            className="rounded-2xl bg-[#101218]/90 backdrop-blur-xl border border-white/15 p-5 sm:p-6 max-h-[54vh] overflow-y-auto space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="font-serif text-xl sm:text-2xl text-white">
                Md. Kajal Mia — Complete Biography
              </h2>
              <span className="text-xs font-mono text-[#2dd4bf]">
                6+ Years · Technonext · VoIP
              </span>
            </div>
            {ABOUT_SLIDES.map((slide, idx) => (
              <div key={slide.id} className="space-y-1">
                <div className="text-[11px] font-mono text-[#c084fc]">
                  0{idx + 1}. {slide.eraSubtitle}
                </div>
                <p className="text-xs sm:text-sm text-[#e2e8f0] leading-relaxed">
                  {slide.bodyParagraph}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Interactive 3D Chapter Slider & 3D Rock Rotation Scrub Bar */}
        <div
          data-no-rock-drag="true"
          className="mt-5 flex flex-col gap-3 rounded-xl bg-[#0e1017]/85 backdrop-blur-md border border-white/15 p-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* 3 Chapter Slide Buttons */}
            <div className="flex items-center gap-1.5">
              {ABOUT_SLIDES.map((slide, idx) => {
                const isCurrent = !showAllParagraphs && activeSlideIdx === idx;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => {
                      setShowAllParagraphs(false);
                      handleSelectSlide(idx);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap ${
                      isCurrent
                        ? 'bg-white text-[#090a0f] font-semibold shadow-sm'
                        : 'bg-white/[0.05] text-[#cbd5e1] hover:bg-white/[0.12] hover:text-white'
                    }`}
                  >
                    0{idx + 1} · {idx === 0 ? 'Experience' : idx === 1 ? 'Technonext' : 'VoIP & SIP'}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowAllParagraphs((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  showAllParagraphs
                    ? 'bg-[#2dd4bf] text-[#05080a] font-semibold'
                    : 'bg-white/[0.05] text-[#cbd5e1] hover:bg-white/[0.12] hover:text-white'
                }`}
                title="View all 3 About Me paragraphs together"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{showAllParagraphs ? '3D Slider' : 'Read All'}</span>
              </button>
            </div>

            {/* Prev / Next 3D Slide Arrows */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setShowAllParagraphs(false);
                  handleSelectSlide(
                    (activeSlideIdx - 1 + ABOUT_SLIDES.length) % ABOUT_SLIDES.length
                  );
                }}
                aria-label="Previous About slide"
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.15] text-white border border-white/10 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAllParagraphs(false);
                  handleSelectSlide((activeSlideIdx + 1) % ABOUT_SLIDES.length);
                }}
                aria-label="Next About slide"
                className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.15] text-white border border-white/10 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive 3D Crystal Rock Orbit Slider + Action Links */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/10 text-xs">
            <label className="flex items-center gap-2.5 text-[#cbd5e1] font-mono text-[11px] flex-1 min-w-[180px]">
              <Layers className="w-3.5 h-3.5 text-[#2dd4bf] shrink-0" />
              <span className="whitespace-nowrap">3D Rock Orbit:</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rockAngleDeg}
                onChange={handleRockSliderChange}
                className="w-full accent-[#2dd4bf] cursor-pointer h-1.5 bg-white/15 rounded-lg"
              />
              <span className="tabular-nums text-[#2dd4bf] w-10 text-right">
                {rockAngleDeg > 0 ? `+${rockAngleDeg}°` : `${rockAngleDeg}°`}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExploreWork}
                className="px-3 py-1.5 rounded-lg bg-[#2dd4bf] hover:bg-[#5eead4] text-[#040809] font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Selected Works</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onContactClick}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/15 font-medium text-xs transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3 text-[#c084fc]" />
                <span>Talk to an Expert</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Editorial Metadata Readout (Matching bottom-right of /assets/aistudio/about_eac5ce94.jpeg) */}
      <div
        ref={bottomMetaRef}
        className="pointer-events-none hidden sm:flex items-end justify-end gap-10 text-right ml-auto"
      >
        <div>
          <div className="text-xs font-mono tracking-wider text-white">
            {activeSlide.eraCode}
          </div>
          <div className="text-xs font-serif text-[#94a3b8]">
            {activeSlide.eraSubtitle}
          </div>
        </div>
        <div>
          <div className="text-xs font-mono tracking-wider text-white">
            {activeSlide.releaseTag}
          </div>
          <div className="text-xs font-serif text-[#94a3b8]">
            {activeSlide.releaseValue}
          </div>
        </div>
      </div>
    </div>
  );
};
