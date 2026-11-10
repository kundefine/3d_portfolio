import React, { useEffect, useRef } from 'react';
import { ArrowDownRight, Sparkles } from 'lucide-react';
import { CinematicState, DirectorOverrides } from '../types/cinematic';
import { cosmicAudio } from '../utils/cosmicAudio';

interface IntroductionTextProps {
  cinematicStateRef: React.MutableRefObject<CinematicState>;
  overridesRef: React.MutableRefObject<DirectorOverrides>;
  onScrollToAbout: () => void;
  onExploreWork: () => void;
  onContactClick: () => void;
}

const INTRO_STRING = 'Hi, My name is Md Kajal Mia';
const INTRO_CHARS = Array.from(INTRO_STRING);
const MAX_GLYPH_DASH = 360;

export const IntroductionText: React.FC<IntroductionTextProps> = ({
  cinematicStateRef,
  overridesRef,
  onScrollToAbout,
  onExploreWork,
  onContactClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Invisible DOM measurement spans so 3D multicolor eye lasers track exact screen coordinates
  const measureCharRefs = useRef<Array<HTMLSpanElement | null>>([]);
  // SVG <tspan> refs for Layer 1 (wireframe blueprint), Layer 2 (drawn outline), Layer 3 (running laser dash)
  const blueprintTspanRefs = useRef<Array<SVGTSpanElement | null>>([]);
  const primaryOutlineTspanRefs = useRef<Array<SVGTSpanElement | null>>([]);
  const runningLaserTspanRefs = useRef<Array<SVGTSpanElement | null>>([]);

  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const ctaGroupRef = useRef<HTMLDivElement | null>(null);
  const reflectionGlowRef = useRef<HTMLDivElement | null>(null);
  const lastHalfStrokeIdxRef = useRef<number>(-1);
  const completedSoundPlayedRef = useRef<boolean>(false);

  useEffect(() => {
    let rafId = 0;
    const startTime = performance.now();

    const updateWireframeTypography = (now: number) => {
      const elapsedSec = (now - startTime) * 0.001;
      const state = cinematicStateRef.current;
      const reducedMotion = overridesRef.current.reducedMotion;

      const introP = state.introRevealProgress;
      const subP = state.subtitleRevealProgress;
      const beamP = state.beamProgress;
      const exitP = Math.max(0, Math.min(1, state.heroTextExitProgress || 0));
      const exitAlpha = 1 - exitP;

      if (containerRef.current) {
        const isVisible = (beamP > 0.25 || introP > 0.002) && exitAlpha > 0.01;
        containerRef.current.style.visibility = isVisible ? 'visible' : 'hidden';
        containerRef.current.style.pointerEvents =
          introP > 0.65 && exitP < 0.35 ? 'auto' : 'none';
        containerRef.current.style.opacity = exitAlpha.toFixed(3);
        const exitY = reducedMotion ? 0 : -exitP * 95;
        const exitScale = reducedMotion ? 1 : 1 - exitP * 0.12;
        containerRef.current.style.transform = `translate3d(0, ${exitY.toFixed(1)}px, 0) scale(${exitScale.toFixed(3)})`;
      }

      const totalChars = INTRO_CHARS.length;
      const exactCharFloat = introP * totalChars;
      const activeIdx = Math.min(totalChars - 1, Math.max(0, Math.floor(exactCharFloat)));

      // Trigger Futuristic HUD Telemetry Ticks & Data-Readout Blips (ref: S2kymv60ndQ) as the laser draws
      if (introP > 0.005 && introP < 0.99) {
        const hudReadoutStep = Math.floor(exactCharFloat * 3);
        if (hudReadoutStep !== lastHalfStrokeIdxRef.current) {
          lastHalfStrokeIdxRef.current = hudReadoutStep;
          const strokeSubStep = hudReadoutStep % 3;
          cosmicAudio.playLaserWriteStroke(
            activeIdx,
            INTRO_CHARS[activeIdx] || '',
            strokeSubStep
          );
        }
        completedSoundPlayedRef.current = false;
      } else if (introP >= 0.99 && !completedSoundPlayedRef.current) {
        completedSoundPlayedRef.current = true;
        cosmicAudio.playLaserWriteComplete();
      } else if (introP <= 0.005) {
        lastHalfStrokeIdxRef.current = -1;
        completedSoundPlayedRef.current = false;
      }

      // Update each character's SVG wireframe outline stroke-dashoffset & running multicolor dash
      for (let i = 0; i < totalChars; i++) {
        const bpSpan = blueprintTspanRefs.current[i];
        const outSpan = primaryOutlineTspanRefs.current[i];
        const runSpan = runningLaserTspanRefs.current[i];

        // Each character draws over a 1.8-character window for smooth continuous laser contour sketching
        const charProgress = Math.max(0, Math.min(1, (exactCharFloat - i) / 1.4));

        if (bpSpan) {
          // Faint wireframe CAD mesh outline appears first as the laser approaches
          const bpAlpha = Math.max(0, Math.min(1, (exactCharFloat - (i - 0.6)) / 1.0));
          bpSpan.style.opacity = (bpAlpha * 0.45).toFixed(2);
        }

        if (outSpan) {
          // Stroke-dashoffset animates from MAX_GLYPH_DASH (undrawn) -> 0 (fully drawn wireframe outline)
          const dashOffset = (1 - charProgress) * MAX_GLYPH_DASH;
          outSpan.style.strokeDasharray = `${MAX_GLYPH_DASH}`;
          outSpan.style.strokeDashoffset = `${dashOffset.toFixed(1)}`;
          outSpan.style.opacity = charProgress > 0.01 ? '1' : '0';

          // Subtle translucent holographic fill fades in only after the wireframe outline is traced
          const fillProgress = Math.max(0, Math.min(1, (charProgress - 0.65) / 0.35));
          const isNamePart = i >= 15;
          outSpan.style.fill = isNamePart
            ? `rgba(244, 114, 182, ${(fillProgress * 0.22).toFixed(3)})`
            : `rgba(244, 240, 255, ${(fillProgress * 0.14).toFixed(3)})`;
        }

        if (runSpan) {
          // Running multicolor laser wireframe dash animation (signature outline-text-animation look)
          if (charProgress > 0.15) {
            runSpan.style.opacity = Math.min(1, (charProgress - 0.15) * 1.4).toFixed(2);
            runSpan.style.strokeDasharray = '28 68';
            const animOffset = reducedMotion ? 0 : -(elapsedSec * 65 + i * 14);
            runSpan.style.strokeDashoffset = `${animOffset.toFixed(1)}`;
          } else {
            runSpan.style.opacity = '0';
          }
        }
      }

      // Measure the exact screen position of the active wireframe letter so the 36 3D multicolor
      // eye laser lines trace the exact character contour on screen!
      const targetCharEl = measureCharRefs.current[activeIdx];
      if (targetCharEl && window.innerWidth > 0 && window.innerHeight > 0) {
        const rect = targetCharEl.getBoundingClientRect();
        const charCenterX = rect.left + rect.width * 0.5;
        const charCenterY = rect.top + rect.height * 0.5;

        const ndcX = (charCenterX / window.innerWidth) * 2 - 1;
        const ndcY = -(charCenterY / window.innerHeight) * 2 + 1;

        state.activeCharNormalizedX = ndcX;
        state.activeCharNormalizedY = ndcY;
      }

      // Subtitle reveal: "Senior Software Engineer | Full-Stack Developer"
      if (subtitleRef.current) {
        const easedSub = 1 - Math.pow(1 - Math.max(0, Math.min(1, subP)), 3);
        const subY = reducedMotion ? 0 : (1 - easedSub) * 14;
        subtitleRef.current.style.opacity = easedSub.toFixed(3);
        subtitleRef.current.style.transform = `translate3d(0, ${subY.toFixed(1)}px, 0)`;
      }

      // CTA Actions reveal
      if (ctaGroupRef.current) {
        const ctaP = Math.max(0, Math.min(1, (subP - 0.2) / 0.8));
        const easedCta = 1 - Math.pow(1 - ctaP, 3);
        const ctaY = reducedMotion ? 0 : (1 - easedCta) * 12;
        ctaGroupRef.current.style.opacity = easedCta.toFixed(3);
        ctaGroupRef.current.style.transform = `translate3d(0, ${ctaY.toFixed(1)}px, 0)`;
      }

      // Multicolor laser underline bar grows with the wireframe outline progress
      if (reflectionGlowRef.current) {
        const glowAlpha = Math.max(0, Math.min(1, introP * 1.15));
        reflectionGlowRef.current.style.opacity = glowAlpha.toFixed(3);
        reflectionGlowRef.current.style.transform = `scaleX(${Math.max(0.02, introP).toFixed(3)})`;
      }

      rafId = requestAnimationFrame(updateWireframeTypography);
    };

    rafId = requestAnimationFrame(updateWireframeTypography);
    return () => cancelAnimationFrame(rafId);
  }, [cinematicStateRef, overridesRef]);

  return (
    <div
      ref={containerRef}
      style={{ visibility: 'hidden', pointerEvents: 'none' }}
      className="absolute inset-x-0 bottom-[13vh] sm:bottom-[14vh] z-20 flex flex-col items-center justify-end px-4 sm:px-6 text-center"
    >
      {/* Contrast scrim behind the wireframe text stage */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-8 -top-20 -bottom-16 bg-gradient-to-t from-[#040208] via-[#040208]/85 to-transparent -z-10"
      />

      {/* Wrapper holding both the SVG Wireframe Outline Text Animation and invisible DOM measurement spans */}
      <div className="relative w-full max-w-5xl flex items-center justify-center">
        {/* Invisible character-measurement layer (matches SVG width/position so 3D lasers lock onto exact letters) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center font-display font-extrabold tracking-tight text-[clamp(1.5rem,4.1vw,4.0rem)] leading-none opacity-0 select-none whitespace-nowrap"
        >
          {INTRO_CHARS.map((char, idx) => (
            <span
              key={idx}
              ref={(el) => {
                measureCharRefs.current[idx] = el;
              }}
              className="inline-block"
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>

        {/* SVG Outline Wireframe Text Animation ("Hi, My name is Md Kajal Mia") */}
        <svg
          viewBox="0 0 1180 120"
          className="w-full h-auto max-h-28 overflow-visible select-none drop-shadow-[0_0_18px_rgba(0,242,254,0.28)]"
          role="img"
          aria-label={INTRO_STRING}
        >
          <defs>
            {/* Primary Multicolor Laser Wireframe Stroke Gradient */}
            <linearGradient id="multicolorLaserGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f2fe" />
              <stop offset="22%" stopColor="#10b981" />
              <stop offset="45%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#ff2a85" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>

            {/* Secondary High-Contrast Animated Wireframe Contour Gradient */}
            <linearGradient id="runningWireframeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#00f2fe" />
              <stop offset="68%" stopColor="#ff2a85" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* LAYER 1: Faint Dashed Wireframe CAD Blueprint Mesh */}
          <text
            x="50%"
            y="68%"
            textAnchor="middle"
            className="font-display font-extrabold text-[72px] tracking-tight"
            fill="transparent"
            stroke="rgba(168, 85, 247, 0.35)"
            strokeWidth="1"
            strokeDasharray="4 6"
          >
            {INTRO_CHARS.map((char, idx) => (
              <tspan
                key={`bp-${idx}`}
                ref={(el) => {
                  blueprintTspanRefs.current[idx] = el;
                }}
                style={{ opacity: 0 }}
              >
                {char}
              </tspan>
            ))}
          </text>

          {/* LAYER 2: Laser-Engraved Progressive Wireframe Outline (stroke-dashoffset driven by scroll) */}
          <text
            x="50%"
            y="68%"
            textAnchor="middle"
            className="font-display font-extrabold text-[72px] tracking-tight"
            fill="transparent"
            stroke="url(#multicolorLaserGradient)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {INTRO_CHARS.map((char, idx) => (
              <tspan
                key={`out-${idx}`}
                ref={(el) => {
                  primaryOutlineTspanRefs.current[idx] = el;
                }}
                style={{ opacity: 0 }}
              >
                {char}
              </tspan>
            ))}
          </text>

          {/* LAYER 3: Running Multicolor Laser Dash Stream Around the Letter Outlines */}
          <text
            x="50%"
            y="68%"
            textAnchor="middle"
            className="font-display font-extrabold text-[72px] tracking-tight"
            fill="transparent"
            stroke="url(#runningWireframeGradient)"
            strokeWidth="2.8"
            strokeLinecap="round"
          >
            {INTRO_CHARS.map((char, idx) => (
              <tspan
                key={`run-${idx}`}
                ref={(el) => {
                  runningLaserTspanRefs.current[idx] = el;
                }}
                style={{ opacity: 0 }}
              >
                {char}
              </tspan>
            ))}
          </text>
        </svg>
      </div>

      {/* Multicolor laser underline bar synchronized with outline drawing */}
      <div
        ref={reflectionGlowRef}
        aria-hidden="true"
        style={{ opacity: 0, transformOrigin: 'left center' }}
        className="w-64 sm:w-[32rem] h-[2px] mt-2 mb-3.5 bg-gradient-to-r from-[#00f2fe] via-[#10b981] via-[#fbbf24] to-[#ff2a85] shadow-[0_0_20px_3px_rgba(0,242,254,0.55)]"
      />

      {/* Professional subtitle */}
      <p
        ref={subtitleRef}
        style={{ opacity: 0, willChange: 'transform, opacity' }}
        className="text-sm sm:text-lg md:text-xl font-medium tracking-wide text-[#e2d4f0] max-w-2xl"
      >
        Senior Software Engineer <span className="text-[#00f2fe] mx-1.5">|</span> Full-Stack Developer
      </p>

      {/* Clean interactive actions once the wireframe outline completes */}
      <div
        ref={ctaGroupRef}
        style={{ opacity: 0, willChange: 'transform, opacity' }}
        className="mt-6 flex flex-wrap items-center justify-center gap-3.5"
      >
        <button
          type="button"
          onClick={onScrollToAbout}
          className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#05020a] bg-[#00f2fe] hover:bg-[#5eead4] rounded-lg transition-colors inline-flex items-center gap-2 shadow-[0_0_24px_rgba(0,242,254,0.4)] cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>Explore About Section</span>
          <ArrowDownRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onExploreWork}
          className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#ec4899] hover:bg-[#db2777] rounded-lg transition-colors inline-flex items-center gap-2 shadow-[0_0_24px_rgba(236,72,153,0.4)] cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>View Selected Works</span>
          <ArrowDownRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onContactClick}
          className="px-5 py-2.5 text-xs sm:text-sm font-medium text-[#f4f0ff] bg-[#140a24]/90 hover:bg-[#23123d] border border-white/15 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#00f2fe]" />
          <span>Get in Touch</span>
        </button>
      </div>
    </div>
  );
};
