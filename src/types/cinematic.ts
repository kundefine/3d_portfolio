export type SceneStage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface CinematicState {
  // Overall scroll progress 0 -> 1
  progress: number;
  // Active scene number 1 -> 7
  sceneStage: SceneStage;

  // Camera & Character orientation / comfortable distance from screen
  cameraZ: number;
  cameraY: number;
  cameraLookX: number;
  cameraLookY: number;
  cameraFov: number;
  galactusZ: number;
  galactusScale: number;
  galactusYaw: number; // +0.78 rad (~45 deg right) for head-only rotation -> 0.0 rad (front)
  galactusPitch: number;
  depthRelief: number;
  characterDimming: number;
  galactusOpacity: number; // 1.0 in Hero -> 0.0 as Galactus dissolves into 3D space

  // Atmosphere & Lighting
  atmosphereIntensity: number;
  rimLightIntensity: number;
  particleWarpSpeed: number;

  // Subtle, comfortable Eye Awakening
  eyeGlowIntensity: number;
  eyeFlareScale: number;

  // Multicolor Line Laser Beams From Eyes
  beamProgress: number; // 0 = at eyes, 1 = reaches wireframe text
  beamIntensity: number;
  beamWidth: number;
  laserSpread: number;

  // Screen Entry & Convergence Pulse
  screenBurstIntensity: number;
  screenBurstRadius: number;

  // Laser Writing Cursor & Trail
  laserDropProgress: number;
  laserTrailIntensity: number;
  pedestalGlowIntensity: number;

  // Outline Wireframe Text Animation Progress (0 -> 1 traces "Hi, My name is Md Kajal Mia")
  introRevealProgress: number;
  subtitleRevealProgress: number;
  heroTextExitProgress: number; // 0 -> 1 floats Hero text away in 3D space when scrolling to About

  // Real-time DOM-to-3D unprojection coordinates of the active wireframe outline point
  activeCharNormalizedX: number;
  activeCharNormalizedY: number;

  // Screen 2 (About Section) & Scroll-Triggered 3D Holographic Transition State
  holoTransitionProgress: number; // 0 -> 1 -> 0 bell curve across the Hero-to-About 3D transition zone
  galactusHoloDissolve: number; // 0 = solid Galactus, 1 = fully dissolved via holographic scan-wave
  aboutRevealProgress: number; // 0 = hidden in deep space, 1 = fully materialized on right side
  aboutChapterProgress: number; // 0 -> 2 across the 3 About Me chapters
  aboutRockUserYaw: number; // Interactive drag/slider yaw offset
  aboutRockUserPitch: number; // Interactive drag/slider pitch offset
}

export interface DirectorOverrides {
  reliefMultiplier: number;
  beamBrightness: number;
  particleDensity: number;
  autoPlayDemo: boolean;
  reducedMotion: boolean;
  showWireframeOverlay: boolean;
}

export interface ProjectItem {
  id: string;
  title: string;
  category: '3d-interactive' | 'full-stack' | 'distributed-systems';
  categoryLabel: string;
  year: string;
  metrics: string;
  summary: string;
  architecture: string[];
  stack: string[];
  liveHighlight: string;
  accentColor: string;
}

export const INITIAL_CINEMATIC_STATE: CinematicState = {
  progress: 0,
  sceneStage: 1,
  cameraZ: 12.2, // Comfortable distance back from the screen
  cameraY: 0.15,
  cameraLookX: 0.25,
  cameraLookY: 0.1,
  cameraFov: 44,
  galactusZ: -0.85,
  galactusScale: 0.80,
  galactusYaw: 0.78, // Head faces strongly toward the right (~45 deg) while body stays still
  galactusPitch: 0.02,
  depthRelief: 0.72,
  characterDimming: 1.0,
  galactusOpacity: 1.0,
  atmosphereIntensity: 0.35,
  rimLightIntensity: 1.15,
  particleWarpSpeed: 0.15,
  eyeGlowIntensity: 0.10, // Subtle, comfortable eye glow at start
  eyeFlareScale: 0.18,
  beamProgress: 0,
  beamIntensity: 0,
  beamWidth: 0.9,
  laserSpread: 0.25,
  screenBurstIntensity: 0,
  screenBurstRadius: 0.2,
  laserDropProgress: 0,
  laserTrailIntensity: 0,
  pedestalGlowIntensity: 0,
  introRevealProgress: 0,
  subtitleRevealProgress: 0,
  heroTextExitProgress: 0,
  activeCharNormalizedX: -0.45,
  activeCharNormalizedY: -0.42,
  holoTransitionProgress: 0,
  galactusHoloDissolve: 0,
  aboutRevealProgress: 0,
  aboutChapterProgress: 0,
  aboutRockUserYaw: 0,
  aboutRockUserPitch: 0,
};

export const SCENE_CHAPTERS: Array<{
  stage: SceneStage;
  title: string;
  subtitle: string;
  scrollTargetRatio: number;
}> = [
  {
    stage: 1,
    title: 'Scene 01 · Head Angled Right in Deep Space',
    subtitle: 'Galactus stands back in deep space with his head turned sharply toward the right.',
    scrollTargetRatio: 0.02,
  },
  {
    stage: 2,
    title: 'Scene 02 · Head Rotates to Front',
    subtitle: 'Only Galactus’s head rotates smoothly to face forward while his torso stays anchored.',
    scrollTargetRatio: 0.16,
  },
  {
    stage: 3,
    title: 'Scene 03 · Multicolor Line Laser Volley',
    subtitle: 'Balanced eye glow ignites a spectrum of multicolor line laser beams.',
    scrollTargetRatio: 0.24,
  },
  {
    stage: 4,
    title: 'Scene 04 · Wireframe Outline Laser Tracing',
    subtitle: 'Multicolor laser lines trace the wireframe outline of "Hi, My name is...".',
    scrollTargetRatio: 0.36,
  },
  {
    stage: 5,
    title: 'Scene 05 · Engraving "Md Kajal Mia" Outline',
    subtitle: 'Laser beams complete the vector wireframe stroke animation across the screen.',
    scrollTargetRatio: 0.48,
  },
  {
    stage: 6,
    title: 'Scene 06 · Completed Wireframe & Fill Reveal',
    subtitle: '"Hi, My name is Md Kajal Mia" — Senior Software Engineer | Full-Stack Developer.',
    scrollTargetRatio: 0.58,
  },
  {
    stage: 7,
    title: 'Scene 07 · About Section · 3D Crystal Obsidian Space',
    subtitle: 'Galactus dissolves into deep space as the 3D obsidian & crystal rock monolith emerges.',
    scrollTargetRatio: 0.78,
  },
];
