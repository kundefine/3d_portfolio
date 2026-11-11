import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ArrowLeft, Move3d, Sparkles } from 'lucide-react';
import { CinematicState, DirectorOverrides } from '../types/cinematic';
import { cosmicAudio } from '../utils/cosmicAudio';

interface SkillsSectionOverlayProps {
  cinematicStateRef: React.MutableRefObject<CinematicState>;
  overridesRef: React.MutableRefObject<DirectorOverrides>;
  onSeekToProgress: (ratio: number) => void;
  onExploreWork?: () => void;
  onContactClick?: () => void;
}

/**
 * MY SKILLS Section Overlay (#skills):
 * - Video overlay removed per user request (replaced by the procedural GLSL Reality Stone
 *   Dual-RenderTarget Post-Processing Wipe in RealityStoneTransitionPass.ts).
 * - All skill cards emptied for now so ONLY the 3D Background Galaxy and the 3D Hovering
 *   Thanos with his Chair Throne are showcased in the viewport.
 */
export const SkillsSectionOverlay: React.FC<SkillsSectionOverlayProps> = ({
  cinematicStateRef,
  onSeekToProgress,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const replayTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    let rafId = 0;

    const syncFrom3DState = () => {
      const state = cinematicStateRef.current;
      const reveal = Math.max(0, Math.min(1, state.skillsRevealProgress || 0));

      if (rootRef.current) {
        const isVisible = reveal > 0.02;
        rootRef.current.style.visibility = isVisible ? 'visible' : 'hidden';
        rootRef.current.style.pointerEvents = reveal > 0.55 ? 'auto' : 'none';
        rootRef.current.style.opacity = reveal.toFixed(3);

        // Reveal #skills header right behind the Reality Stone procedural horizontal seam
        if (reveal > 0.01 && reveal < 0.99) {
          const rightClipPct = Math.min(100, Math.max(0, (1.0 - reveal * 1.15) * 100));
          rootRef.current.style.clipPath = `inset(0px ${rightClipPct.toFixed(1)}% 0px 0px)`;
        } else {
          rootRef.current.style.clipPath = 'none';
        }
      }

      rafId = requestAnimationFrame(syncFrom3DState);
    };

    rafId = requestAnimationFrame(syncFrom3DState);
    return () => {
      cancelAnimationFrame(rafId);
      if (replayTweenRef.current) {
        replayTweenRef.current.kill();
      }
    };
  }, [cinematicStateRef]);

  // Automatic trigger button to test the GLSL Reality Stone procedural wipe without scrolling
  const handleReplayRealityWipe = () => {
    if (replayTweenRef.current) {
      replayTweenRef.current.kill();
    }
    cosmicAudio.playSlideTransitionSound(1);

    const state = cinematicStateRef.current;
    state.aboutRevealProgress = 1.0;
    state.skillsRevealProgress = 0.0;
    state.skillsTransitionProgress = 0.0;

    replayTweenRef.current = gsap.to(state, {
      skillsRevealProgress: 1.0,
      skillsTransitionProgress: 1.0,
      duration: 2.2,
      ease: 'power2.inOut',
      onComplete: () => {
        state.aboutRevealProgress = 0.0;
      },
    });
  };

  return (
    <div
      id="skills"
      ref={rootRef}
      style={{ visibility: 'hidden', pointerEvents: 'none', opacity: 0 }}
      className="fixed inset-0 z-25 flex flex-col justify-between px-5 sm:px-10 lg:px-14 pt-16 pb-14 select-none overflow-hidden"
    >
      {/* Minimal Top Header Row — Center & Viewport Kept 100% Empty to Showcase 3D Galaxy + 3D Hovering Thanos Throne */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs font-mono tracking-wider uppercase text-[#cbd5e1]">
          <span className="w-2 h-2 rounded-full bg-[#ef4444] shadow-[0_0_12px_#ef4444]" />
          <span className="text-white font-semibold">MY SKILLS</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] font-mono text-[#cbd5e1]">
            <Move3d className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Drag 3D Thanos Throne to Tilt in Air</span>
          </div>

          <button
            type="button"
            onClick={handleReplayRealityWipe}
            className="px-3 py-1 rounded-lg bg-[#ef4444]/20 hover:bg-[#ef4444]/35 border border-[#ef4444]/50 text-xs font-medium text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Test the procedural GLSL Reality Stone environment wipe transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#f87171]" />
            <span>Replay Reality Stone Wipe</span>
          </button>

          <button
            type="button"
            onClick={() => onSeekToProgress(0.62)}
            className="px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-medium text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Back · About</span>
          </button>
        </div>
      </div>
    </div>
  );
};
