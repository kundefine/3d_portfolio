import React, { useEffect } from 'react';
import gsap from 'gsap';
import {
  CinematicState,
  DirectorOverrides,
  INITIAL_CINEMATIC_STATE,
  SceneStage,
} from '../types/cinematic';

interface ScrollAnimationControllerProps {
  cinematicStateRef: React.MutableRefObject<CinematicState>;
  overridesRef: React.MutableRefObject<DirectorOverrides>;
  seekToProgressRef: React.MutableRefObject<((targetRatio: number) => void) | null>;
  onStageChange: (stage: SceneStage, progress: number) => void;
}

const VIRTUAL_SCROLL_DISTANCE = 5200;

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

    const computeStageFromProgress = (p: number): SceneStage => {
      if (p < 0.12) return 1;
      if (p < 0.28) return 2;
      if (p < 0.42) return 3;
      if (p < 0.65) return 4;
      if (p < 0.88) return 5;
      return 6;
    };

    // Paused 100-unit master GSAP timeline driven by virtual wheel/touch progress (no native scrollbar)
    const tl = gsap.timeline({ paused: true });

    // =========================================================================
    // STAGE 1 & 2 (0 -> 26): Galactus stands comfortably back in deep space.
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
      },
      {
        galactusYaw: 0.0, // Head smoothly turns to face directly forward
        cameraLookX: 0.0,
        cameraZ: 10.65, // Stays comfortably back from the screen
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
        duration: 26,
        ease: 'power2.inOut',
      },
      0
    );

    // =========================================================================
    // STAGE 3 (22 -> 36): Comfortable Eye Glow & Multicolor Line Laser Barrage
    // =========================================================================
    tl.to(
      state,
      {
        eyeGlowIntensity: 0.42,
        eyeFlareScale: 0.45,
        rimLightIntensity: 1.65,
        duration: 10,
        ease: 'power2.in',
      },
      22
    );

    tl.to(
      state,
      {
        beamIntensity: 1.05,
        beamProgress: 1.0,
        beamWidth: 0.95,
        laserSpread: 0.35,
        pedestalGlowIntensity: 0.42,
        duration: 11,
        ease: 'power2.out',
      },
      26
    );

    // =========================================================================
    // STAGE 4 & 5 (34 -> 88): Continuous Wireframe Outline Laser Tracing of
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
        duration: 54,
        ease: 'none',
      },
      34
    );

    // =========================================================================
    // STAGE 6 (86 -> 100): Reveal Subtitle & Hold Final 3D Hero Composition
    // =========================================================================
    tl.to(
      state,
      {
        subtitleRevealProgress: 1.0,
        beamIntensity: 0.48,
        eyeGlowIntensity: 0.32,
        eyeFlareScale: 0.32,
        pedestalGlowIntensity: 0.72,
        duration: 11,
        ease: 'power2.out',
      },
      86
    );

    tl.to(
      state,
      {
        beamIntensity: 0.36,
        duration: 3,
      },
      97
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
        e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * 320 : e.deltaY;
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
      const deltaY = (touchStartY - currentY) * 2.2;
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
        const step = e.key === 'ArrowDown' ? 0.045 : 0.14;
        targetProgress = Math.max(0, Math.min(1, targetProgress + step));
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        const step = e.key === 'ArrowUp' ? 0.045 : 0.14;
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

      // Auto-Scroll tour mode advances targetProgress smoothly and stops at 1.0 (or loops if restarted)
      if (overridesRef.current.autoPlayDemo) {
        if (targetProgress >= 0.998) {
          targetProgress = 0;
          smoothedProgress = 0;
        } else {
          targetProgress = Math.min(1, targetProgress + dt * 0.075);
        }
      }

      // Smoothly damp smoothedProgress toward targetProgress
      const lerpFactor = overridesRef.current.reducedMotion
        ? 1.0
        : 1.0 - Math.exp(-8.5 * dt);
      smoothedProgress += (targetProgress - smoothedProgress) * lerpFactor;

      if (Math.abs(targetProgress - smoothedProgress) < 0.00005) {
        smoothedProgress = targetProgress;
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
