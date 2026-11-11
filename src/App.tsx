/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ArrowLeft, Volume2, VolumeX, X } from 'lucide-react';
import { HeroSection } from './components/HeroSection';
import { PortfolioSections } from './components/PortfolioSections';
import { SceneStage } from './types/cinematic';
import { cosmicAudio } from './utils/cosmicAudio';

export default function App() {
  const jumpToSceneRef = useRef<((stage: SceneStage) => void) | null>(null);
  const lastHoveredElementRef = useRef<Element | null>(null);
  const portfolioOverlayRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const audioToggleBtnRef = useRef<HTMLButtonElement | null>(null);
  const soundPromptRef = useRef<HTMLDivElement | null>(null);
  const [isPortfolioOverlayOpen, setIsPortfolioOverlayOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(
    () => cosmicAudio.getState().isMuted
  );
  const [soundPromptDismissed, setSoundPromptDismissed] = useState(false);

  useEffect(() => {
    return cosmicAudio.subscribe((muted) => {
      setIsAudioMuted(muted);
      if (!muted) {
        setSoundPromptDismissed(true);
      }
    });
  }, []);

  const handleJumpToScene = useCallback((stage: SceneStage) => {
    setIsPortfolioOverlayOpen(false);
    if (jumpToSceneRef.current) {
      jumpToSceneRef.current(stage);
    }
  }, []);

  const openSectionInOverlay = useCallback((id: string) => {
    setIsPortfolioOverlayOpen(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }, []);

  // Close overlay on Escape key, or press M to toggle audio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPortfolioOverlayOpen) {
        setIsPortfolioOverlayOpen(false);
      } else if (
        (e.key === 'm' || e.key === 'M') &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        cosmicAudio.toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPortfolioOverlayOpen]);

  // Delegated sci-fi UI sound effects on every link, button, and interactive control
  useEffect(() => {
    const findInteractiveTarget = (target: EventTarget | null): Element | null => {
      if (!(target instanceof Element)) return null;
      return target.closest('a, button, [role="button"], input[type="range"]');
    };

    const handlePointerOver = (e: PointerEvent) => {
      const interactiveEl = findInteractiveTarget(e.target);
      if (interactiveEl && interactiveEl !== lastHoveredElementRef.current) {
        lastHoveredElementRef.current = interactiveEl;
        cosmicAudio.playHoverSound();
      } else if (!interactiveEl) {
        lastHoveredElementRef.current = null;
      }
    };

    const handleClick = (e: MouseEvent) => {
      const interactiveEl = findInteractiveTarget(e.target);
      if (interactiveEl) {
        if (interactiveEl.hasAttribute('data-audio-toggle')) return;
        cosmicAudio.playClickSound();
      }
    };

    document.addEventListener('pointerover', handlePointerOver, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });

    return () => {
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // 1.5-second GSAP entrance animation for global UI chrome on initial mount
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (headerRef.current) {
        tl.fromTo(
          headerRef.current,
          { opacity: 0, y: -20 },
          {
            opacity: 1,
            y: 0,
            duration: 1.3,
            clearProps: 'transform',
          },
          0.2
        );
      }

      if (audioToggleBtnRef.current) {
        tl.fromTo(
          audioToggleBtnRef.current,
          { opacity: 0, y: 18, scale: 0.92 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.1,
            clearProps: 'transform',
          },
          0.4
        );
      }

      if (soundPromptRef.current) {
        tl.fromTo(
          soundPromptRef.current,
          { opacity: 0, y: 16, scale: 0.94 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1.1,
            clearProps: 'transform',
          },
          0.65
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#040208] text-[#F4F0FF] relative selection:bg-[#ec4899]/30 selection:text-white">
      {/* Glassmorphism Top Navigation Bar with Right-Aligned Menu */}
      <header
        ref={headerRef}
        className="fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-8 px-6 py-3.5 bg-white/[0.04] backdrop-blur-xl border-b border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
      >
        {/* Brand Wordmark */}
        <a
          href="#hero-experience"
          onClick={(e) => {
            e.preventDefault();
            handleJumpToScene(1);
          }}
          className="font-display text-lg font-bold tracking-tight text-white hover:text-[#f472b6] transition-colors whitespace-nowrap shrink-0"
        >
          Md. Kajal Mia
        </a>

        {/* Right-Aligned Main Navigation Menu */}
        <nav className="ml-auto flex items-center gap-6 sm:gap-8 text-sm font-medium text-[#e9d5ff] overflow-x-auto">
          <a
            href="#hero-experience"
            onClick={(e) => {
              e.preventDefault();
              handleJumpToScene(1);
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Home
          </a>
          <a
            href="#about-section"
            onClick={(e) => {
              e.preventDefault();
              handleJumpToScene(7);
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            About
          </a>
          <a
            href="#skills-section"
            onClick={(e) => {
              e.preventDefault();
              handleJumpToScene(8);
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            My Skills
          </a>
          <a
            href="#works"
            onClick={(e) => {
              e.preventDefault();
              openSectionInOverlay('works');
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Selected Works
          </a>
          <a
            href="#capabilities"
            onClick={(e) => {
              e.preventDefault();
              openSectionInOverlay('capabilities');
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Capabilities
          </a>
          <a
            href="#scene-breakdown"
            onClick={(e) => {
              e.preventDefault();
              openSectionInOverlay('scene-breakdown');
            }}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            3D Architecture
          </a>
          {isPortfolioOverlayOpen && (
            <button
              type="button"
              onClick={() => setIsPortfolioOverlayOpen(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#00f2fe]" />
              <span>Back to 3D Scene</span>
            </button>
          )}
        </nav>
      </header>

      <main className="w-full h-full">
        {/* 100vh Full-Viewport 3D Hero Section Driven by Virtual Wheel/Touch Events */}
        <HeroSection
          onExploreWork={() => openSectionInOverlay('works')}
          onContactClick={() => openSectionInOverlay('contact')}
          externalJumpSceneRef={jumpToSceneRef}
        />

        {/* Scrollable Portfolio Sections Overlay when navigating to Works / Capabilities / Architecture / Contact */}
        {isPortfolioOverlayOpen && (
          <div
            ref={portfolioOverlayRef}
            data-scrollable-overlay="true"
            className="fixed inset-0 z-35 pt-16 overflow-y-auto bg-[#040208]/98"
          >
            <div className="sticky top-3 right-6 z-40 flex justify-end px-6 pointer-events-none">
              <button
                type="button"
                onClick={() => setIsPortfolioOverlayOpen(false)}
                className="pointer-events-auto px-3.5 py-1.5 text-xs font-medium text-[#e9d5ff] bg-[#140a26] hover:bg-[#231242] border border-white/15 rounded-lg inline-flex items-center gap-1.5 shadow-xl cursor-pointer whitespace-nowrap shrink-0"
              >
                <X className="w-3.5 h-3.5 text-[#f472b6]" />
                <span>Close Overlay (ESC)</span>
              </button>
            </div>
            <PortfolioSections onJumpToScene={handleJumpToScene} />
          </div>
        )}
      </main>

      {/* Animated Sound Notification Callout above the Mute/Unmute Button */}
      {isAudioMuted && !soundPromptDismissed && (
        <div
          ref={soundPromptRef}
          className="fixed bottom-20 right-5 z-50 flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] backdrop-blur-xl border border-[#ec4899]/50 shadow-[0_8px_32px_rgba(236,72,153,0.25)] transition-all duration-300"
        >
          <button
            type="button"
            data-audio-toggle="true"
            onClick={() => cosmicAudio.setMuted(false)}
            className="flex items-center gap-2.5 text-left cursor-pointer group focus-visible:outline-none"
          >
            <span className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-[#ec4899]/20 text-[#f472b6] shrink-0">
              <span className="absolute inset-0 rounded-lg bg-[#ec4899]/35 animate-ping" />
              <Volume2 className="relative w-3.5 h-3.5 animate-pulse" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-white group-hover:text-[#00f2fe] transition-colors">
                Start Cosmic Sound
              </span>
              <span className="text-[10px] font-mono text-[#e9d5ff]/80">
                Click to enable ambient &amp; laser audio
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSoundPromptDismissed(true)}
            aria-label="Dismiss sound notification"
            className="p-1 rounded-md text-[#c4b5fd]/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Downward pointer arrow aimed at the sound toggle button */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-1.5 right-8 w-3 h-3 rotate-45 bg-[#120824] border-r border-b border-[#ec4899]/50"
          />
        </div>
      )}

      {/* Persistent Floating Mute/Unmute Control Button in Bottom-Right Corner */}
      <button
        ref={audioToggleBtnRef}
        type="button"
        data-audio-toggle="true"
        onClick={() => cosmicAudio.toggleMute()}
        aria-pressed={!isAudioMuted}
        aria-label={
          isAudioMuted
            ? 'Unmute global ambient audio'
            : 'Mute global ambient audio'
        }
        title="Toggle Ambient Audio & HUD Sound Effects (Shortcut: M)"
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00f2fe] ${
          !isAudioMuted
            ? 'bg-[#0b0518]/95 border-[#00f2fe]/60 text-white shadow-[0_0_24px_rgba(0,242,254,0.28)] hover:border-[#00f2fe] hover:bg-[#130928]'
            : 'bg-[#0b0518]/95 border-white/15 text-[#c4b5fd] shadow-2xl hover:border-[#ec4899]/50 hover:text-white hover:bg-[#130928]'
        }`}
      >
        <span
          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
            !isAudioMuted
              ? 'bg-[#00f2fe]/15 text-[#00f2fe]'
              : 'bg-white/5 text-[#f472b6]'
          }`}
        >
          {isAudioMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </span>

        <span className="text-xs font-medium tracking-wide">
          {isAudioMuted ? 'Muted' : 'Sound On'}
        </span>

        {/* Visual Playback Status Equalizer Bars */}
        <span
          className="inline-flex items-end gap-0.5 h-3.5 pl-0.5"
          aria-hidden="true"
        >
          <span
            className={`w-0.5 rounded-full transition-all duration-200 ${
              !isAudioMuted
                ? 'h-3 bg-[#00f2fe] animate-pulse'
                : 'h-1 bg-white/25'
            }`}
          />
          <span
            className={`w-0.5 rounded-full transition-all duration-200 ${
              !isAudioMuted
                ? 'h-3.5 bg-[#ec4899] animate-bounce'
                : 'h-1 bg-white/25'
            }`}
          />
          <span
            className={`w-0.5 rounded-full transition-all duration-200 ${
              !isAudioMuted
                ? 'h-2 bg-[#a855f7] animate-pulse'
                : 'h-1 bg-white/25'
            }`}
          />
          <span
            className={`w-0.5 rounded-full transition-all duration-200 ${
              !isAudioMuted
                ? 'h-3 bg-[#00f2fe] animate-bounce'
                : 'h-1 bg-white/25'
            }`}
          />
        </span>
      </button>
    </div>
  );
}
