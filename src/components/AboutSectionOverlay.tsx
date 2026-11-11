import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
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
  displayLines: [string, string];
  bodyParagraph: string;
  domains: string[];
  accentHex: string;
  scrollRatio: number;
  rockYawDeg: number;
}

const ABOUT_SLIDES: AboutSlideItem[] = [
  {
    id: 0,
    eraCode: 'ERA — 01',
    eraSubtitle: 'Core Full-Stack Craft',
    releaseTag: 'Experience',
    releaseValue: '6+ Years Production',
    displayLines: [
      'Scalable web applications, efficient APIs',
      '& modern full-stack architecture.',
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
    scrollRatio: 0.53,
    rockYawDeg: -12,
  },
  {
    id: 1,
    eraCode: 'ERA — 02',
    eraSubtitle: 'Technonext & Enterprise Scale',
    releaseTag: 'Current Role',
    releaseValue: 'Technonext',
    displayLines: [
      'E-commerce, ticketing & exam platforms',
      'engineered for high-performance scale.',
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
    scrollRatio: 0.62,
    rockYawDeg: 32,
  },
  {
    id: 2,
    eraCode: 'ERA — 03',
    eraSubtitle: 'System-Level & Real-Time',
    releaseTag: 'Focus Horizon',
    releaseValue: 'VoIP · SIP · Real-Time',
    displayLines: [
      'System-level engineering, VoIP protocols,',
      'SIP servers & real-time communication.',
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
    scrollRatio: 0.71,
    rockYawDeg: 76,
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
  const holoScanBarRef = useRef<HTMLDivElement | null>(null);

  // Refs for GSAP slider transition animations (Zigzag + Concentric Ripple + 3D Tilt)
  const headlineWrapperRef = useRef<HTMLHeadingElement | null>(null);
  const cardPlaneRef = useRef<HTMLDivElement | null>(null);
  const cardShimmerRef = useRef<HTMLDivElement | null>(null);
  const rippleContainerRef = useRef<HTMLDivElement | null>(null);
  const zigzagSvgRef = useRef<SVGSVGElement | null>(null);
  const paragraphTextRef = useRef<HTMLParagraphElement | null>(null);
  const domainTagsRef = useRef<HTMLDivElement | null>(null);

  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [showAllParagraphs, setShowAllParagraphs] = useState<boolean>(false);
  const [rockAngleDeg, setRockAngleDeg] = useState<number>(0);
  const [isScrubbingSlider, setIsScrubbingSlider] = useState<boolean>(false);

  const lastSyncedSlideRef = useRef<number>(0);
  const slideDirRef = useRef<number>(1);
  const isFirstRenderRef = useRef<boolean>(true);

  // Run Slide Sound + 3D Zigzag & Concentric Ripple Animation whenever activeSlideIdx changes
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const dir = slideDirRef.current;

    // Play the holographic slide swoosh + zigzag/ripple chime whenever switching slides
    if ((cinematicStateRef.current.aboutRevealProgress || 0) > 0.25) {
      cosmicAudio.playSlideTransitionSound(dir);
    }

    if (showAllParagraphs || overridesRef.current.reducedMotion) return;

    const ctx = gsap.context(() => {
      // 1. Electric Zigzag + 3D perspective flip on the headline lines
      if (headlineWrapperRef.current) {
        const lines = headlineWrapperRef.current.querySelectorAll('[data-headline-line]');
        gsap.fromTo(
          lines,
          {
            opacity: 0,
            y: 12 * dir,
            rotateX: -32 * dir,
            filter: 'blur(3px)',
          },
          {
             keyframes: [
              { opacity: 0.65, x: 16 * dir, skewX: 9 * dir, y: 6 * dir, rotateX: -14 * dir, duration: 0.08 },
              { opacity: 0.9, x: -11 * dir, skewX: -6 * dir, y: -3 * dir, rotateX: 6 * dir, duration: 0.08 },
              { opacity: 1, x: 5 * dir, skewX: 3 * dir, y: 0, rotateX: 0, duration: 0.07 },
              { opacity: 1, x: 0, skewX: 0, y: 0, rotateX: 0, filter: 'blur(0px)', duration: 0.09 },
            ],
            stagger: 0.035,
            ease: 'power2.out',
            clearProps: 'filter,transform',
          }
        );
      }

      // 2. 3D Card Zigzag Oscillation & Ripple Bounce
      if (cardPlaneRef.current) {
        gsap.fromTo(
          cardPlaneRef.current,
          {
            rotateY: dir * 12,
            rotateX: -dir * 5,
            scale: 0.95,
          },
          {
            keyframes: [
              { x: -12 * dir, y: 6 * dir, rotateY: dir * 7, scale: 1.015, duration: 0.08 },
              { x: 9 * dir, y: -4 * dir, rotateY: -dir * 4, scale: 0.99, duration: 0.08 },
              { x: -4 * dir, y: 2 * dir, rotateY: dir * 2, scale: 1.005, duration: 0.07 },
              { x: 0, y: 0, rotateY: 0, rotateX: 0, scale: 1, duration: 0.1 },
            ],
            ease: 'power2.out',
          }
        );
      }

      // 3. Concentric Holographic Ripple Shockwave Rings expanding across the card
      if (rippleContainerRef.current) {
        const rings = rippleContainerRef.current.querySelectorAll('[data-ripple-ring]');
        gsap.fromTo(
          rings,
          { scale: 0.08, opacity: 0.9 },
          {
            scale: 2.45,
            opacity: 0,
            duration: 0.58,
            stagger: 0.075,
            ease: 'power2.out',
          }
        );
      }

      // 4. Electric Zigzag Neon Laser Trace sweeping across the card
      if (zigzagSvgRef.current) {
        const poly = zigzagSvgRef.current.querySelector('[data-zigzag-line]');
        gsap.fromTo(
          zigzagSvgRef.current,
          { opacity: 0.95 },
          { opacity: 0, duration: 0.48, ease: 'power2.out' }
        );
        if (poly) {
          gsap.fromTo(
            poly,
            { strokeDashoffset: dir > 0 ? 640 : -640 },
            {
              strokeDashoffset: 0,
              duration: 0.36,
              ease: 'power3.out',
            }
          );
        }
      }

      // 5. Fast holographic shimmer sweep across the card
      if (cardShimmerRef.current) {
        gsap.fromTo(
          cardShimmerRef.current,
          { xPercent: -120, opacity: 0.85 },
          {
            xPercent: 220,
            opacity: 0,
            duration: 0.42,
            ease: 'power2.out',
          }
        );
      }

      // 6. Paragraph & domain tags crisp reveal
      if (paragraphTextRef.current) {
        gsap.fromTo(
          paragraphTextRef.current,
          { opacity: 0.3, y: 6 },
          { opacity: 1, y: 0, duration: 0.24, ease: 'power2.out' }
        );
      }

      if (domainTagsRef.current) {
        const tags = domainTagsRef.current.querySelectorAll('[data-domain-tag]');
        gsap.fromTo(
          tags,
          { opacity: 0, y: 5, x: 6 * dir },
          {
            opacity: 1,
            y: 0,
            x: 0,
            duration: 0.22,
            stagger: 0.025,
            ease: 'power2.out',
          }
        );
      }
    });

    return () => ctx.revert();
  }, [activeSlideIdx, showAllParagraphs, overridesRef, cinematicStateRef]);

  useEffect(() => {
    let rafId = 0;

    const syncFrom3DState = () => {
      const state = cinematicStateRef.current;
      const reducedMotion = overridesRef.current.reducedMotion;
      const reveal = Math.max(0, Math.min(1, state.aboutRevealProgress || 0));
      const holoP = Math.max(0, Math.min(1, state.holoTransitionProgress || 0));
      const realityWipe = Math.max(0, Math.min(1, state.skillsRevealProgress || 0));

      if (rootRef.current) {
        const isVisible = (reveal > 0.01 || holoP > 0.02) && realityWipe < 0.99;
        rootRef.current.style.visibility = isVisible ? 'visible' : 'hidden';
        rootRef.current.style.pointerEvents =
          reveal > 0.45 && realityWipe < 0.25 ? 'auto' : 'none';
        rootRef.current.style.opacity = (reveal * (1 - Math.pow(realityWipe, 2.2))).toFixed(3);

        // Synchronize #about HTML overlay with the Reality Stone procedural horizontal wipe!
        // As the red energy wave sweeps from left (0%) to right (100%), clip the left side of #about
        if (realityWipe > 0.005) {
          const clipLeftPct = Math.min(100, Math.max(0, (realityWipe * 1.18 - 0.06) * 100));
          rootRef.current.style.clipPath = `inset(0px 0px 0px ${clipLeftPct.toFixed(1)}%)`;
        } else {
          rootRef.current.style.clipPath = 'none';
        }
      }

      if (holoScanBarRef.current) {
        const scanAlpha = Math.min(1, holoP * 0.95);
        holoScanBarRef.current.style.opacity = scanAlpha.toFixed(3);
        const scanY = (1 - reveal) * 85 + 8;
        holoScanBarRef.current.style.top = `${scanY.toFixed(1)}%`;
      }

      if (leftColumnRef.current) {
        const inv = 1 - reveal;
        const translateY = reducedMotion ? 0 : inv * 34;
        const translateZ = reducedMotion ? 0 : -inv * 90;
        const rotY = reducedMotion ? 0 : inv * 10;
        leftColumnRef.current.style.transform = `perspective(1200px) translate3d(0, ${translateY.toFixed(
          1
        )}px, ${translateZ.toFixed(1)}px) rotateY(${rotY.toFixed(2)}deg)`;

        if (!reducedMotion && realityWipe > 0.01 && realityWipe < 0.98) {
          const seamGlow = Math.sin(realityWipe * Math.PI);
          leftColumnRef.current.style.filter = `drop-shadow(${(seamGlow * 14).toFixed(
            1
          )}px 0 ${(seamGlow * 22).toFixed(1)}px rgba(255, 38, 12, ${(
            seamGlow * 0.85
          ).toFixed(2)}))`;
        } else if (!reducedMotion && holoP > 0.05) {
          leftColumnRef.current.style.filter = `drop-shadow(0 0 ${(holoP * 16).toFixed(
            1
          )}px rgba(0, 242, 254, ${(holoP * 0.5).toFixed(2)}))`;
        } else {
          leftColumnRef.current.style.filter = 'none';
        }
      }

      if (bottomMetaRef.current) {
        const inv = 1 - reveal;
        const translateY = reducedMotion ? 0 : inv * 20;
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
          slideDirRef.current = chapterIdx > lastSyncedSlideRef.current ? 1 : -1;
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
    const dir = clamped >= activeSlideIdx ? 1 : -1;
    slideDirRef.current = dir;
    if (clamped === activeSlideIdx) {
      cosmicAudio.playSlideTransitionSound(dir);
    }
    setActiveSlideIdx(clamped);
    lastSyncedSlideRef.current = clamped;

    const targetSlide = ABOUT_SLIDES[clamped];
    setRockAngleDeg(targetSlide.rockYawDeg);
    gsap.to(cinematicStateRef.current, {
      aboutRockUserYaw: (targetSlide.rockYawDeg * Math.PI) / 180,
      duration: 0.45,
      ease: 'power3.out',
    });

    // Smoothly scrub the 3D scroll timeline to that slide's position in 3D space
    onSeekToProgress(targetSlide.scrollRatio);
  };

  const handleRockSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const deg = parseFloat(e.target.value);
    setRockAngleDeg(deg);
    cinematicStateRef.current.aboutRockUserYaw = (deg * Math.PI) / 180;

    // Live 3D card micro-tilt feedback while sliding the slider!
    if (cardPlaneRef.current && !overridesRef.current.reducedMotion) {
      const norm = deg / 180; // -1 to +1
      gsap.to(cardPlaneRef.current, {
        rotateY: norm * 8,
        rotateX: -Math.abs(norm) * 2.5,
        duration: 0.2,
        overwrite: 'auto',
      });
    }

    // Automatically snap/highlight corresponding chapter when scrubbing across ranges
    const mappedSlide = deg < -35 ? 0 : deg <= 45 ? 1 : 2;
    if (mappedSlide !== activeSlideIdx && !showAllParagraphs) {
      slideDirRef.current = mappedSlide > activeSlideIdx ? 1 : -1;
      lastSyncedSlideRef.current = mappedSlide;
      setActiveSlideIdx(mappedSlide);
    }
  };

  const handleSliderRelease = () => {
    setIsScrubbingSlider(false);
    if (cardPlaneRef.current) {
      gsap.to(cardPlaneRef.current, {
        rotateY: 0,
        rotateX: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.6)',
      });
    }
  };

  const activeSlide = ABOUT_SLIDES[activeSlideIdx] || ABOUT_SLIDES[0];
  const sliderFillPct = ((rockAngleDeg + 180) / 360) * 100;

  return (
    <div
      ref={rootRef}
      style={{ visibility: 'hidden', pointerEvents: 'none', opacity: 0 }}
      className="fixed inset-0 z-20 flex flex-col justify-between px-5 sm:px-10 lg:px-14 pt-16 pb-14 select-none overflow-hidden"
    >
      {/* Subtle Left-Side Readability Scrim (Leaves Right-Side 3D Obsidian & Crystal Rock 100% Unobstructed) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-[54%] bg-gradient-to-r from-[#0b0c10]/95 via-[#0b0c10]/70 to-transparent -z-10"
      />

      {/* Synchronized Holographic Scanline Bar sweeping across the Left Editorial Column during 3D transition */}
      <div
        ref={holoScanBarRef}
        aria-hidden="true"
        style={{ opacity: 0, top: '50%' }}
        className="pointer-events-none absolute left-0 w-full lg:w-[52%] h-[2px] bg-gradient-to-r from-[#00f2fe] via-[#2dd4bf] to-transparent shadow-[0_0_24px_4px_rgba(0,242,254,0.65)] z-30"
      />

      {/* Top Row: Compact Section Header & Quick Return to Galactus Hero */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs font-mono tracking-wider uppercase text-[#cbd5e1]">
          <span
            className="w-2 h-2 rounded-full transition-colors duration-300"
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
          <span aria-hidden="true" className="text-white/30 hidden sm:inline">
            ·
          </span>
          <span className="text-[#5eead4] hidden sm:inline">
            {activeSlide.eraSubtitle}
          </span>
        </div>

        {/* Interactive 3D Rock Spin Hint & Back to Galactus Stage Button */}
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[#cbd5e1]">
            <Move3d className="w-3.5 h-3.5 text-[#00f2fe]" />
            <span>Drag 3D Iron Man Hologram to Spin</span>
          </div>

          <button
            type="button"
            onClick={() => onSeekToProgress(0.41)}
            className="px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-medium text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Scroll up or click to glide back to Galactus in 3D space"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#2dd4bf]" />
            <span>Scroll Up · Galactus Hero</span>
          </button>

          <button
            type="button"
            onClick={() => onSeekToProgress(0.88)}
            className="px-3 py-1 rounded-lg bg-[#ef4444]/15 hover:bg-[#ef4444]/25 border border-[#ef4444]/40 text-xs font-medium text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            title="Scroll down or click to transition to MY SKILLS (3D Thanos Throne)"
          >
            <span>Next · MY SKILLS</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#f87171]" />
          </button>
        </div>
      </div>

      {/* Center-Left Compact Title + Biography Content Card + Interactive 3D Slider Controls */}
      <div
        ref={leftColumnRef}
        style={{ willChange: 'transform, opacity' }}
        className="my-auto w-full max-w-[560px] flex flex-col justify-center gap-3"
      >
        {!showAllParagraphs ? (
          <div className="relative" style={{ perspective: '1100px' }}>
            {/* Compact 2-Line Editorial Display Title (Sized so content & slider below are 100% visible) */}
            <h2
              ref={headlineWrapperRef}
              className="font-serif font-normal tracking-tight text-white text-xl sm:text-2xl lg:text-[1.75rem] leading-[1.2] mb-2.5"
              style={{ perspective: '600px' }}
            >
              {activeSlide.displayLines.map((line, i) => (
                <span
                  key={i}
                  data-headline-line="true"
                  className="block origin-bottom"
                >
                  {line}
                </span>
              ))}
            </h2>

            {/* User's Exact About Me Paragraph in a 3D Animated Glass Card Plane */}
            <div
              ref={cardPlaneRef}
              style={{
                transformStyle: 'preserve-3d',
                borderColor: isScrubbingSlider
                  ? `${activeSlide.accentHex}88`
                  : 'rgba(255,255,255,0.15)',
              }}
              className="relative overflow-hidden rounded-2xl bg-[#101218]/85 backdrop-blur-md border p-4 sm:p-5 shadow-[0_18px_45px_rgba(0,0,0,0.55)] transition-colors duration-300"
            >
              {/* Animated Holographic Shimmer Sweep Bar */}
              <div
                ref={cardShimmerRef}
                aria-hidden="true"
                style={{ opacity: 0 }}
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-[#00f2fe]/25 to-transparent"
              />

              {/* Concentric Holographic Ripple Shockwave Rings on Slide Transition */}
              <div
                ref={rippleContainerRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
              >
                {[0, 1, 2].map((rIdx) => (
                  <span
                    key={rIdx}
                    data-ripple-ring="true"
                    style={{
                      opacity: 0,
                      borderColor: activeSlide.accentHex,
                      boxShadow: `0 0 22px ${activeSlide.accentHex}66`,
                    }}
                    className="absolute w-36 h-36 rounded-full border-2"
                  />
                ))}
              </div>

              {/* Electric Zigzag Neon Laser Trace on Slide Transition */}
              <svg
                ref={zigzagSvgRef}
                aria-hidden="true"
                viewBox="0 0 560 180"
                preserveAspectRatio="none"
                style={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 w-full h-full"
              >
                <polyline
                  data-zigzag-line="true"
                  fill="none"
                  stroke={activeSlide.accentHex}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="640"
                  strokeDashoffset="640"
                  points="0,95 65,32 130,145 205,28 280,152 355,36 430,142 500,45 560,92"
                  style={{
                    filter: `drop-shadow(0 0 8px ${activeSlide.accentHex})`,
                  }}
                />
              </svg>

              <p
                ref={paragraphTextRef}
                className="relative z-10 text-xs sm:text-sm md:text-[15px] text-[#e2e8f0] leading-relaxed font-normal"
              >
                {activeSlide.bodyParagraph}
              </p>

              {/* Unboxed typographic domain tags with · separators */}
              <div
                ref={domainTagsRef}
                className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-[#94a3b8]"
              >
                {activeSlide.domains.map((domain, idx) => (
                  <React.Fragment key={domain}>
                    <span
                      data-domain-tag="true"
                      className="inline-block"
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
            className="rounded-2xl bg-[#101218]/90 backdrop-blur-xl border border-white/15 p-4 sm:p-5 max-h-[46vh] overflow-y-auto space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h2 className="font-serif text-lg sm:text-xl text-white">
                Md. Kajal Mia — Complete Biography
              </h2>
              <span className="text-[11px] font-mono text-[#2dd4bf]">
                6+ Years · Technonext · VoIP
              </span>
            </div>
            {ABOUT_SLIDES.map((slide, idx) => (
              <div key={slide.id} className="space-y-0.5">
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

        {/* Interactive 3D Chapter Slider & Animated 3D Rock Orbit Scrub Bar */}
        <div
          data-no-rock-drag="true"
          className="flex flex-col gap-2.5 rounded-xl bg-[#0e1017]/90 backdrop-blur-md border border-white/15 p-3 shadow-xl"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* 3 Chapter Slide Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      isCurrent
                        ? 'bg-white text-[#090a0f] font-semibold shadow-[0_0_16px_rgba(255,255,255,0.35)] scale-[1.03]'
                        : 'bg-white/[0.05] text-[#cbd5e1] hover:bg-white/[0.12] hover:text-white'
                    }`}
                  >
                    0{idx + 1} ·{' '}
                    {idx === 0
                      ? 'Experience'
                      : idx === 1
                      ? 'Technonext'
                      : 'VoIP & SIP'}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowAllParagraphs((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
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
                    (activeSlideIdx - 1 + ABOUT_SLIDES.length) %
                      ABOUT_SLIDES.length
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

          {/* Interactive 3D Crystal Rock & Story Slider with Animated Track & Action Links */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
            <label className="flex items-center gap-2.5 text-[#cbd5e1] font-mono text-[11px] flex-1 min-w-[190px]">
              <Layers
                className={`w-3.5 h-3.5 text-[#2dd4bf] shrink-0 transition-transform duration-300 ${
                  isScrubbingSlider ? 'scale-125 rotate-12 text-[#00f2fe]' : ''
                }`}
              />
              <span className="whitespace-nowrap">3D Slider:</span>
              <div className="relative flex-1 flex items-center">
                <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#2dd4bf] via-[#00f2fe] to-[#c084fc] transition-all duration-75"
                    style={{ width: `${sliderFillPct.toFixed(1)}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={rockAngleDeg}
                  onPointerDown={() => setIsScrubbingSlider(true)}
                  onPointerUp={handleSliderRelease}
                  onBlur={handleSliderRelease}
                  onChange={handleRockSliderChange}
                  className="relative z-10 w-full accent-[#00f2fe] cursor-pointer h-1.5 bg-transparent appearance-none"
                />
              </div>
              <span className="tabular-nums text-[#2dd4bf] w-10 text-right">
                {rockAngleDeg > 0 ? `+${rockAngleDeg}°` : `${rockAngleDeg}°`}
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExploreWork}
                className="px-3 py-1 rounded-lg bg-[#2dd4bf] hover:bg-[#5eead4] text-[#040809] font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Selected Works</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onContactClick}
                className="px-3 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/15 font-medium text-xs transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3 text-[#c084fc]" />
                <span>Talk to an Expert</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-Right Editorial Metadata Readout (Positioned above the bottom-right Scroll & Sound indicators) */}
      <div
        ref={bottomMetaRef}
        className="pointer-events-none hidden sm:flex items-end justify-end gap-10 text-right ml-auto mb-6"
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
