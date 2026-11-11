import React, { useEffect } from 'react';
import gsap from 'gsap';
import {
  CinematicState,
  DirectorOverrides,
  INITIAL_CINEMATIC_STATE,
  SceneStage,
} from '../types/cinematic';
import { cosmicAudio } from '../utils/cosmicAudio';

interface ScrollAnimationControllerProps {
  cinematicStateRef: React.MutableRefObject<CinematicState>;
  overridesRef: React.MutableRefObject<DirectorOverrides>;
  seekToProgressRef: React.MutableRefObject<((targetRatio: number) => void) | null>;
  onStageChange: (stage: SceneStage, progress: number) => void;
}

const VIRTUAL_SCROLL_DISTANCE = 3600;

export const ScrollAnimationController: React.FC<ScrollAnimationControllerProps> = ({
  cinematicStateRef,
  overridesRef,
  seekToProgressRef,
  onStageChange,
}) => {
  useEffect(() => {
    Object.assign(cinematicStateRef.current, INITIAL_CINEMATIC_STATE);
    const state = cinematicStateRef.current;

    let lastReportedStage: SceneStage = 1;
    let lastReportedPct = -1;
    let wasInAboutZone = false;

    const computeStageFromProgress = (p: number): SceneStage => {
      if (p < 0.08) return 1;
      if (p < 0.16) return 2;
      if (p < 0.23) return 3;
      if (p < 0.33) return 4;
      if (p < 0.41) return 5;
      if (p < 0.48) return 6;
      if (p < 0.78) return 7;
      return 8;
    };

    // Paused 100-unit master GSAP timeline driven by virtual wheel/touch progress
    // Screen 1 (0 -> 45): Galactus Hero Stage
    // Transition 1 (44 -> 51): Galactus dissolves in 3D space & 3D Iron Man Blue Neon Hologram emerges
    // Screen 2 (51 -> 74): About Section 3D Iron Man Hologram + 3D Text Slider
    // Transition 2 (74 -> 82): Reality Stone Crimson Wave (about_to_skills_animation.mp4)
    // Screen 3 (82 -> 100): MY SKILLS Section (3D Galaxy + 3D Hovering Thanos Chair Throne)
    const tl = gsap.timeline({ paused: true });

    // =========================================================================
    // STAGE 1 & 2 (0 -> 14): Galactus stands comfortably back in deep space.
    // Only his HEAD rotates from facing toward the right (+0.78 rad) to facing
    // directly front (0.0 rad) on scroll, while the body and shoulders stay still.
    // =========================================================================
    tl.fromTo(
      state,
      {
        galactusYaw: 0.78, // Head faces strongly toward the right (~45 deg)
        cameraLookX: 0.22,
        cameraZ: 11.5,
        cameraY: 0.15,
        cameraLookY: 0.08,
        cameraFov: 44,
        galactusZ: -0.75,
        galactusScale: 0.82,
        galactusPitch: 0.02,
        depthRelief: 0.75,
        rimLightIntensity: 1.25,
        atmosphereIntensity: 0.40,
        particleWarpSpeed: 0.2,
        eyeGlowIntensity: 0.12,
        galactusOpacity: 1.0,
        heroTextExitProgress: 0.0,
        holoTransitionProgress: 0.0,
        galactusHoloDissolve: 0.0,
        aboutRevealProgress: 0.0,
        aboutChapterProgress: 0.0,
        skillsTransitionProgress: 0.0,
        skillsRevealProgress: 0.0,
      },
      {
        galactusYaw: 0.0, // Head smoothly turns to face directly forward
        cameraLookX: 0.0,
        cameraZ: 10.65,
        cameraY: 0.15,
        cameraLookY: 0.08,
        cameraFov: 43,
        galactusZ: -0.45,
        galactusScale: 0.86,
        galactusPitch: 0.0,
        depthRelief: 0.85,
        rimLightIntensity: 1.45,
        atmosphereIntensity: 0.55,
        particleWarpSpeed: 0.4,
        eyeGlowIntensity: 0.24,
        duration: 14,
        ease: 'power2.inOut',
      },
      0
    );

    // =========================================================================
    // STAGE 3 (12 -> 19): Comfortable Eye Glow & Multicolor Line Laser Barrage
    // =========================================================================
    tl.to(
      state,
      {
        eyeGlowIntensity: 0.42,
        eyeFlareScale: 0.45,
        rimLightIntensity: 1.65,
        duration: 5.5,
        ease: 'power2.in',
      },
      12
    );

    tl.to(
      state,
      {
        beamIntensity: 1.05,
        beamProgress: 1.0,
        beamWidth: 0.95,
        laserSpread: 0.35,
        pedestalGlowIntensity: 0.42,
        duration: 5.5,
        ease: 'power2.out',
      },
      13.5
    );

    // =========================================================================
    // STAGE 4 & 5 (18 -> 39): Continuous Wireframe Outline Laser Tracing of
    // "Hi, My name is Md Kajal Mia"
    // =========================================================================
    tl.to(
      state,
      {
        introRevealProgress: 1.0,
        pedestalGlowIntensity: 0.85,
        laserTrailIntensity: 0.9,
        laserDropProgress: 1.0,
        cameraZ: 10.45,
        cameraLookY: -0.1,
        characterDimming: 0.88,
        duration: 21,
        ease: 'none',
      },
      18
    );

    // =========================================================================
    // STAGE 6 (38 -> 44): Reveal Subtitle & Hold Final 3D Hero Composition
    // =========================================================================
    tl.to(
      state,
      {
        subtitleRevealProgress: 1.0,
        beamIntensity: 0.42,
        eyeGlowIntensity: 0.30,
        eyeFlareScale: 0.30,
        pedestalGlowIntensity: 0.72,
        duration: 5,
        ease: 'power2.out',
      },
      38
    );

    // =========================================================================
    // TRANSITION 1 (44 -> 51): Hero (Galactus) -> About (3D Iron Man Hologram)
    // =========================================================================
    tl.to(
      state,
      {
        holoTransitionProgress: 1.0,
        heroTextExitProgress: 1.0,
        beamIntensity: 0.0,
        eyeGlowIntensity: 0.0,
        eyeFlareScale: 0.0,
        pedestalGlowIntensity: 0.0,
        laserTrailIntensity: 0.0,
        particleWarpSpeed: 2.35,
        duration: 3.5,
        ease: 'power2.inOut',
      },
      44
    );

    tl.to(
      state,
      {
        galactusHoloDissolve: 1.0,
        galactusOpacity: 0.0,
        galactusZ: -7.5,
        galactusScale: 0.46,
        characterDimming: 0.0,
        cameraZ: 10.2,
        cameraY: 0.05,
        cameraLookX: 0.15,
        cameraLookY: 0.02,
        duration: 6,
        ease: 'power2.inOut',
      },
      44.5
    );

    tl.to(
      state,
      {
        aboutRevealProgress: 1.0,
        particleWarpSpeed: 0.32,
        rimLightIntensity: 1.35,
        duration: 5.5,
        ease: 'power3.out',
      },
      46
    );

    tl.to(
      state,
      {
        holoTransitionProgress: 0.0,
        duration: 3.5,
        ease: 'power2.out',
      },
      48
    );

    // =========================================================================
    // STAGE 7 (51 -> 74): Screen 2 — About Section 3D Iron Man Blue Neon Hologram
    // =========================================================================
    tl.to(
      state,
      {
        aboutChapterProgress: 2.0,
        cameraZ: 9.85,
        cameraLookX: 0.22,
        duration: 23,
        ease: 'none',
      },
      51
    );

    // =========================================================================
    // TRANSITION 2 (73 -> 85): About (Scene A) -> MY SKILLS (Scene B)
    // Driven by the Dual-RenderTarget Reality Stone Procedural GLSL Wipe Shader!
    // =========================================================================
    tl.to(
      state,
      {
        skillsTransitionProgress: 1.0,
        skillsRevealProgress: 1.0,
        cameraZ: 10.05,
        cameraY: 0.06,
        cameraLookX: 0.0,
        cameraLookY: 0.04,
        particleWarpSpeed: 1.45,
        duration: 12,
        ease: 'none',
      },
      73
    );

    tl.to(
      state,
      {
        aboutRevealProgress: 0.0,
        particleWarpSpeed: 0.28,
        duration: 1.5,
        ease: 'power2.out',
      },
      84.5
    );

    // =========================================================================
    // STAGE 8 (82 -> 100): Screen 3 — MY SKILLS Section (3D Galaxy + 3D Hovering Thanos Throne)
    // =========================================================================
    tl.to(
      state,
      {
        cameraZ: 9.65,
        cameraLookX: 0.0,
        cameraLookY: 0.05,
        duration: 18,
        ease: 'none',
      },
      82
    );

    // Virtual scroll state (0.0 -> 1.0)
    let targetProgress = 0;
    let smoothedProgress = 0;
    let touchStartY = 0;
    let rafId = 0;
    let lastTime = performance.now();

    // Expose programmatic seek handler for scene chapter buttons & navigation links
    seekToProgressRef.current = (ratio: number) => {
      targetProgress = Math.max(0, Math.min(1, ratio));
      if (overridesRef.current.reducedMotion) {
        smoothedProgress = targetProgress;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest('[data-scrollable-overlay="true"]')
      ) {
        return;
      }
      e.preventDefault();
      // Normalize wheel delta across mouse wheels and trackpads
      const rawDelta =
        e.deltaMode === 1 ? e.deltaY * 36 : e.deltaMode === 2 ? e.deltaY * 360 : e.deltaY;

      targetProgress = Math.max(
        0,
        Math.min(1, targetProgress + rawDelta / VIRTUAL_SCROLL_DISTANCE)
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest('[data-scrollable-overlay="true"]')
      ) {
        return;
      }
      if (e.touches.length === 0) return;
      const currentY = e.touches[0].clientY;
      const deltaY = (touchStartY - currentY) * 3.0;
      touchStartY = currentY;

      targetProgress = Math.max(
        0,
        Math.min(1, targetProgress + deltaY / VIRTUAL_SCROLL_DISTANCE)
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 0.065 : 0.16;
        targetProgress = Math.max(0, Math.min(1, targetProgress + step));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const step = e.key === 'ArrowUp' ? 0.065 : 0.16;
        targetProgress = Math.max(0, Math.min(1, targetProgress - step));
      } else if (e.key === 'Home') {
        e.preventDefault();
        targetProgress = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        targetProgress = 1;
      }
    };

    const updateVirtualScroll = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) * 0.001);
      lastTime = now;

      // Auto-Scroll tour mode advances targetProgress smoothly and loops
      if (overridesRef.current.autoPlayDemo) {
        if (targetProgress >= 0.998) {
          targetProgress = 0;
          smoothedProgress = 0;
        } else {
          targetProgress = Math.min(1, targetProgress + dt * 0.075);
        }
      }

      // Snappy damping toward targetProgress so slide changes on scroll feel immediate
      const lerpFactor = overridesRef.current.reducedMotion
        ? 1.0
        : 1.0 - Math.exp(-15.0 * dt);
      smoothedProgress += (targetProgress - smoothedProgress) * lerpFactor;

      if (Math.abs(targetProgress - smoothedProgress) < 0.00005) {
        smoothedProgress = targetProgress;
      }

      // Play spatial transition sound when crossing between Screen 1 (Hero) and Screen 2 (About)
      const isInAboutZone = smoothedProgress >= 0.59;
      if (isInAboutZone !== wasInAboutZone) {
        wasInAboutZone = isInAboutZone;
        cosmicAudio.playHomeTransitionSound();
      }

      // Scrub the GSAP master timeline to smoothedProgress
      tl.progress(smoothedProgress);
      state.progress = smoothedProgress;

      const currentStage = computeStageFromProgress(smoothedProgress);
      state.sceneStage = currentStage;

      const pct = Math.round(smoothedProgress * 100);
      if (currentStage !== lastReportedStage || Math.abs(pct - lastReportedPct) >= 1) {
        lastReportedStage = currentStage;
        lastReportedPct = pct;
        onStageChange(currentStage, smoothedProgress);
      }

      rafId = requestAnimationFrame(updateVirtualScroll);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    rafId = requestAnimationFrame(updateVirtualScroll);

    return () => {
      seekToProgressRef.current = null;
      cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
      tl.kill();
    };
  }, [cinematicStateRef, overridesRef, seekToProgressRef, onStageChange]);

  return null;
};
