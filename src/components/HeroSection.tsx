import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  Eye,
  Layers,
  Play,
  Pause,
  Sliders,
} from 'lucide-react';
import {
  CinematicState,
  DirectorOverrides,
  INITIAL_CINEMATIC_STATE,
  SCENE_CHAPTERS,
  SceneStage,
} from '../types/cinematic';
import { GalactusScene } from './three/GalactusScene';
import { ScrollAnimationController } from './ScrollAnimationController';
import { IntroductionText } from './IntroductionText';
import { AboutSectionOverlay } from './AboutSectionOverlay';
import { cosmicAudio } from '../utils/cosmicAudio';

interface HeroSectionProps {
  onExploreWork: () => void;
  onContactClick: () => void;
  externalJumpSceneRef?: React.MutableRefObject<((stage: SceneStage) => void) | null>;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreWork,
  onContactClick,
  externalJumpSceneRef,
}) => {
  const heroPinRef = useRef<HTMLElement | null>(null);
  const heroStageRef = useRef<HTMLDivElement | null>(null);
  const revealCurtainRef = useRef<HTMLDivElement | null>(null);
  const narrativeReadoutRef = useRef<HTMLDivElement | null>(null);
  const bottomDockRef = useRef<HTMLDivElement | null>(null);
  const cinematicStateRef = useRef<CinematicState>({ ...INITIAL_CINEMATIC_STATE });
  const seekToProgressRef = useRef<((targetRatio: number) => void) | null>(null);
  const prevStageRef = useRef<SceneStage>(1);

  const [overrides, setOverrides] = useState<DirectorOverrides>(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    return {
      reliefMultiplier: 1.0,
      beamBrightness: 1.0,
      particleDensity: 1.0,
      autoPlayDemo: false,
      reducedMotion: Boolean(prefersReduced),
      showWireframeOverlay: false,
    };
  });

  const overridesRef = useRef<DirectorOverrides>(overrides);
  useEffect(() => {
    overridesRef.current = overrides;
  }, [overrides]);

  const [activeStage, setActiveStage] = useState<SceneStage>(1);
  const [scrollProgressPct, setScrollProgressPct] = useState<number>(0);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [showTuningDrawer, setShowTuningDrawer] = useState<boolean>(false);

  // Audio state synced with CosmicAudioEngine (starts muted by default)
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(
    () => cosmicAudio.getState().isMuted
  );
  const [audioVolume, setAudioVolume] = useState<number>(
    () => cosmicAudio.getState().masterVolume
  );

  useEffect(() => {
    return cosmicAudio.subscribe((muted, volume) => {
      setIsAudioMuted(muted);
      setAudioVolume(volume);
    });
  }, []);

  const handleStageChange = useCallback((stage: SceneStage, progress: number) => {
    if (stage !== prevStageRef.current) {
      prevStageRef.current = stage;
      cosmicAudio.playStageChime(stage);
    }
    setActiveStage(stage);
    setScrollProgressPct(Math.round(progress * 100));
  }, []);

  const seekToProgress = useCallback((ratio: number) => {
    if (seekToProgressRef.current) {
      seekToProgressRef.current(ratio);
    }
  }, []);

  const jumpToScene = useCallback((stage: SceneStage) => {
    const chapter = SCENE_CHAPTERS.find((c) => c.stage === stage);
    if (!chapter) return;
    if (seekToProgressRef.current) {
      seekToProgressRef.current(chapter.scrollTargetRatio);
    }
  }, []);

  useEffect(() => {
    if (externalJumpSceneRef) {
      externalJumpSceneRef.current = jumpToScene;
    }
  }, [externalJumpSceneRef, jumpToScene]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1.5-second GSAP cinematic entrance animation on initial mount
  useEffect(() => {
    if (overridesRef.current.reducedMotion) return;

    const ctx = gsap.context(() => {
      const entranceTl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      // Scale and reveal the main 3D hero content over 1.5 seconds
      if (heroStageRef.current) {
        entranceTl.fromTo(
          heroStageRef.current,
          { scale: 1.08, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 1.5,
            clearProps: 'transform',
          },
          0
        );
      }

      // Fade out deep-space entrance aperture curtain
      if (revealCurtainRef.current) {
        entranceTl.fromTo(
          revealCurtainRef.current,
          { opacity: 1 },
          {
            opacity: 0,
            duration: 1.35,
            ease: 'power2.inOut',
          },
          0
        );
      }

      // Fade and slide in the top-left narrative spec readout
      if (narrativeReadoutRef.current) {
        entranceTl.fromTo(
          narrativeReadoutRef.current,
          { opacity: 0, y: -14 },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            clearProps: 'transform',
          },
          0.3
        );
      }

      // Fade and slide up the bottom control dock over the 1.5s window
      if (bottomDockRef.current) {
        entranceTl.fromTo(
          bottomDockRef.current,
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 1.15,
          },
          0.35
        );
      }
    }, heroPinRef);

    return () => ctx.revert();
  }, []);

  const currentChapter =
    SCENE_CHAPTERS.find((c) => c.stage === activeStage) || SCENE_CHAPTERS[0];

  return (
    <section
      ref={heroPinRef}
      id="hero-experience"
      className="relative w-full h-screen overflow-hidden bg-[#040208]"
    >
      {/* Virtual-Scroll GSAP Timeline Controller */}
      <ScrollAnimationController
        cinematicStateRef={cinematicStateRef}
        overridesRef={overridesRef}
        seekToProgressRef={seekToProgressRef}
        onStageChange={handleStageChange}
      />

      {/* Main Hero Content Wrapper (Scaled & Revealed over 1.5s on mount) */}
      <div ref={heroStageRef} className="absolute inset-0 z-0 origin-center">
        {/* Full-Viewport 3D Three.js Galactus Scene (100% unobstructed center) */}
        <div className="absolute inset-0 z-0">
          <GalactusScene
            cinematicStateRef={cinematicStateRef}
            overridesRef={overridesRef}
          />
        </div>

        {/* Screen 1: SVG Outline Wireframe Text Animation ("Hi, My name is Md Kajal Mia") */}
        <IntroductionText
          cinematicStateRef={cinematicStateRef}
          overridesRef={overridesRef}
          onScrollToAbout={() => jumpToScene(7)}
          onExploreWork={onExploreWork}
          onContactClick={onContactClick}
        />

        {/* Screen 2: About Section Editorial Typography & 3D Perspective Slider in the same 3D space */}
        <AboutSectionOverlay
          cinematicStateRef={cinematicStateRef}
          overridesRef={overridesRef}
          onSeekToProgress={seekToProgress}
          onExploreWork={onExploreWork}
          onContactClick={onContactClick}
        />
      </div>

      {/* Cinematic Entrance Reveal Vignette Curtain */}
      <div
        ref={revealCurtainRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-[#040208] opacity-0"
      />

      {/* Subtle top-left minimal narrative spec readout during Galactus Hero scenes (Stages 1-6) */}
      {activeStage < 7 && (
        <div
          ref={narrativeReadoutRef}
          className="pointer-events-none absolute top-20 left-6 z-20 hidden sm:flex flex-col gap-1 max-w-md"
        >
          <div className="flex items-center gap-2 text-xs font-mono text-[#c4b5fd]">
            <span>{currentChapter.title}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{String(scrollProgressPct).padStart(2, '0')}%</span>
          </div>
          <p className="text-xs text-[#a394b8] leading-relaxed">
            {currentChapter.subtitle}
          </p>
        </div>
      )}

      {/* Animated "Scroll to Navigate" Indicator with Mouse Wheel & Chevrons */}
      <button
        type="button"
        onClick={() => {
          const nextStage = (activeStage < 7 ? activeStage + 1 : 1) as SceneStage;
          jumpToScene(nextStage);
        }}
        title="Scroll with mouse wheel, touch, or arrow keys — or click to advance to the next 3D stage"
        className="fixed left-6 bottom-20 sm:bottom-6 z-30 group flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-xl border border-white/15 hover:border-[#00f2fe]/50 shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-300 cursor-pointer"
      >
        {/* Animated Mouse Wheel Shell */}
        <div className="relative flex flex-col items-center justify-start w-5 h-8 rounded-full border-2 border-[#00f2fe]/80 pt-1.5 shrink-0">
          <span className="w-1 h-2 rounded-full bg-[#00f2fe] animate-bounce" />
        </div>

        <div className="flex flex-col items-start text-left">
          <span className="text-xs font-semibold tracking-wide text-white group-hover:text-[#00f2fe] transition-colors whitespace-nowrap">
            {activeStage === 6
              ? 'Scroll to 3D About Section'
              : activeStage === 7
              ? 'Scroll Up for Galactus · Down for Slides'
              : 'Scroll to Navigate'}
          </span>
          <span className="text-[11px] font-mono text-[#c4b5fd] whitespace-nowrap">
            {scrollProgressPct === 0
              ? 'Wheel · Touch · Arrows'
              : `Scene 0${activeStage} / 07 · ${scrollProgressPct}%`}
          </span>
        </div>

        {/* Animated Cascading Downward Chevrons */}
        <ChevronsDown className="w-4 h-4 text-[#ec4899] animate-bounce ml-0.5 shrink-0" />
      </button>

      {/* Unified Collapsible Bottom Control Dock (<= 15% viewport height, solid rgba surface) */}
      <div
        ref={bottomDockRef}
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-[min(960px,95vw)] flex flex-col items-center pointer-events-none"
      >
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          className="pointer-events-auto px-3.5 py-1 text-[11px] font-mono text-[#d8b4fe] bg-[#0b0518]/95 hover:bg-[#170b2e] border border-b-0 border-white/15 rounded-t-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          title="Toggle Controls (Shortcut: H)"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-[#00f2fe]" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-[#00f2fe]" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full bg-[#090414]/95 border border-white/15 rounded-xl px-4 py-2.5 shadow-2xl flex flex-col gap-2.5">
            {showTuningDrawer && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1 pb-2.5 border-b border-white/10 text-xs">
                <label className="flex flex-col gap-1 text-[#d8b4fe]">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>2.5D Relief Depth</span>
                    <span className="tabular-nums">{overrides.reliefMultiplier.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.8"
                    step="0.05"
                    value={overrides.reliefMultiplier}
                    onChange={(e) =>
                      setOverrides((prev) => ({
                        ...prev,
                        reliefMultiplier: parseFloat(e.target.value),
                      }))
                    }
                    className="accent-[#00f2fe] cursor-pointer h-1.5 bg-[#1e1035] rounded-lg"
                  />
                </label>

                <label className="flex flex-col gap-1 text-[#d8b4fe]">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>Multicolor Laser Energy</span>
                    <span className="tabular-nums">{overrides.beamBrightness.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="1.8"
                    step="0.05"
                    value={overrides.beamBrightness}
                    onChange={(e) =>
                      setOverrides((prev) => ({
                        ...prev,
                        beamBrightness: parseFloat(e.target.value),
                      }))
                    }
                    className="accent-[#00f2fe] cursor-pointer h-1.5 bg-[#1e1035] rounded-lg"
                  />
                </label>

                <label className="flex flex-col gap-1 text-[#d8b4fe]">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span>Cosmic Audio Volume</span>
                    <span className="tabular-nums">{Math.round(audioVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioVolume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      cosmicAudio.setMasterVolume(val);
                      if (val > 0 && isAudioMuted) {
                        cosmicAudio.setMuted(false);
                      }
                    }}
                    className="accent-[#ec4899] cursor-pointer h-1.5 bg-[#1e1035] rounded-lg"
                  />
                </label>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOverrides((prev) => ({
                        ...prev,
                        showWireframeOverlay: !prev.showWireframeOverlay,
                      }))
                    }
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                      overrides.showWireframeOverlay
                        ? 'bg-[#ec4899] text-white'
                        : 'bg-[#170c2b] text-[#d8b4fe] hover:bg-[#241342]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Mesh Wireframe</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOverrides((prev) => ({
                        ...prev,
                        reducedMotion: !prev.reducedMotion,
                      }))
                    }
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                      overrides.reducedMotion
                        ? 'bg-[#a855f7] text-white'
                        : 'bg-[#170c2b] text-[#d8b4fe] hover:bg-[#241342]'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reduced Motion</span>
                  </button>
                </div>
              </div>
            )}

            {/* Primary Dock Row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1 bg-[#130926] p-1 rounded-lg overflow-x-auto max-w-full">
                {[
                  { stage: 1 as SceneStage, label: '01. Face Right' },
                  { stage: 2 as SceneStage, label: '02. Head Turn' },
                  { stage: 3 as SceneStage, label: '03. Prism Lasers' },
                  { stage: 4 as SceneStage, label: '04. Outline Trace' },
                  { stage: 5 as SceneStage, label: '05. Name Wireframe' },
                  { stage: 6 as SceneStage, label: '06. Hero Reveal' },
                  { stage: 7 as SceneStage, label: '07. About (3D Rocks)' },
                ].map((item) => {
                  const isActive = activeStage === item.stage;
                  return (
                    <button
                      key={item.stage}
                      type="button"
                      onClick={() => jumpToScene(item.stage)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#ec4899] text-white shadow-sm'
                          : 'text-[#c4b5fd] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() =>
                    setOverrides((prev) => ({
                      ...prev,
                      autoPlayDemo: !prev.autoPlayDemo,
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    overrides.autoPlayDemo
                      ? 'bg-[#ec4899] text-white'
                      : 'bg-[#160b29] text-[#e9d5ff] hover:bg-[#231240] border border-white/10'
                  }`}
                >
                  {overrides.autoPlayDemo ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Tour</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Auto-Scroll</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowTuningDrawer((prev) => !prev)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    showTuningDrawer
                      ? 'bg-[#9333ea] text-white'
                      : 'bg-[#160b29] text-[#e9d5ff] hover:bg-[#231240] border border-white/10'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>3D Parameters</span>
                </button>

                <span className="hidden md:inline-block font-mono text-xs text-[#c4b5fd] tabular-nums pl-1">
                  {String(scrollProgressPct).padStart(3, ' ')}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
