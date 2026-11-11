import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CinematicState, DirectorOverrides } from '../../types/cinematic';
import { GalactusCharacterRig, GALACTUS_IMAGE_PATH } from './GalactusImage';
import { EyeGlowSystem } from './EyeGlow';
import { EnergyBeamSystem } from './EnergyBeam';
import { CosmicParticlesSystem } from './CosmicParticles';
import { AboutCrystalRocksSystem } from './AboutCrystalRocks';
import { HolographicTransition3DSystem } from './HolographicTransition3D';
import { ThanosSkillsScene3DSystem } from './ThanosSkillsScene3D';
import { RealityStoneTransitionPass } from './RealityStoneTransitionPass';
import { cosmicAudio } from '../../utils/cosmicAudio';

// Pre-allocated module-scope vectors & colors to avoid GC in the render loop
const _leftEyeWorld = new THREE.Vector3();
const _rightEyeWorld = new THREE.Vector3();
const _lookAtTarget = new THREE.Vector3();
const _heroBgColor = new THREE.Color('#040208');
const _aboutBgColor = new THREE.Color('#0b0c10');
const _titanDustColor = new THREE.Color('#1f0e08');
const _blendedBgColor = new THREE.Color('#040208');

interface GalactusSceneProps {
  cinematicStateRef: React.MutableRefObject<CinematicState>;
  overridesRef: React.MutableRefObject<DirectorOverrides>;
}

export const GalactusScene: React.FC<GalactusSceneProps> = ({
  cinematicStateRef,
  overridesRef,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    // 1. Software-WebGL detection per Three.js skill guidelines
    let isSoftwareGl = false;
    let webglSupported = true;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) {
        webglSupported = false;
      } else {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      }
    } catch {
      webglSupported = false;
    }

    if (!webglSupported) {
      setWebglError(true);
      return;
    }

    // 2. Initialize Renderer, Scene, Camera
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglError(true);
      return;
    }

    const width = mountEl.clientWidth || window.innerWidth;
    const height = mountEl.clientHeight || window.innerHeight;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor('#040208', 1);

    mountEl.innerHTML = '';
    mountEl.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040208');
    const fog = new THREE.FogExp2('#040208', 0.042);
    scene.fog = fog;

    // Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 12.2);

    // 3. Studio 3-Point & Cosmic Rim Lighting Rig
    const hemiLight = new THREE.HemisphereLight('#a855f7', '#090314', 1.35);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#f472b6', 2.4);
    keyLight.position.set(4.5, 5.5, 6.0);
    scene.add(keyLight);

    const rimLightLeft = new THREE.DirectionalLight('#9333ea', 2.6);
    rimLightLeft.position.set(-6.0, 3.0, -3.5);
    scene.add(rimLightLeft);

    const rimLightRight = new THREE.DirectionalLight('#e11d48', 2.4);
    rimLightRight.position.set(6.0, 2.5, -3.5);
    scene.add(rimLightRight);

    // 4. Instantiate Modular 3D Scene Subsystems (Screen 1: Galactus + Screen 2: About Crystal Rocks)
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const galactusRig = new GalactusCharacterRig(maxAnisotropy);
    scene.add(galactusRig.group);

    const eyeGlow = new EyeGlowSystem();
    scene.add(eyeGlow.group);

    const energyBeam = new EnergyBeamSystem();
    scene.add(energyBeam.group);

    const cosmicParticles = new CosmicParticlesSystem(isSoftwareGl);
    scene.add(cosmicParticles.group);

    const aboutCrystalRocks = new AboutCrystalRocksSystem(isSoftwareGl);
    scene.add(aboutCrystalRocks.group);

    const holoTransition3D = new HolographicTransition3DSystem(isSoftwareGl);
    scene.add(holoTransition3D.group);

    // 4B. Dedicated Scene B for MY SKILLS (3D Background Galaxy + 3D Hovering Thanos Chair Throne)
    // Rendered into rtSceneB during the Reality Stone procedural environment wipe
    const skillsScene = new THREE.Scene();
    skillsScene.background = new THREE.Color('#08020a');
    skillsScene.fog = new THREE.FogExp2('#08020a', 0.015);
    skillsScene.environment = envTexture;

    const skillsHemiLight = new THREE.HemisphereLight('#f43f5e', '#090314', 1.45);
    skillsScene.add(skillsHemiLight);

    const skillsKeyLight = new THREE.DirectionalLight('#38bdf8', 2.4);
    skillsKeyLight.position.set(4.5, 5.5, 6.0);
    skillsScene.add(skillsKeyLight);

    const skillsRimLight = new THREE.DirectionalLight('#c084fc', 2.6);
    skillsRimLight.position.set(-5.5, 3.0, -3.5);
    skillsScene.add(skillsRimLight);

    const thanosSkillsScene3D = new ThanosSkillsScene3DSystem(isSoftwareGl);
    skillsScene.add(thanosSkillsScene3D.group);

    // Dual-RenderTarget Reality Stone Post-Processing Pass (tSceneA -> tSceneB)
    const pixelRatio = renderer.getPixelRatio();
    const realityTransitionPass = new RealityStoneTransitionPass(width, height, pixelRatio);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
      renderer.compile(skillsScene, camera);
    }

    // 5. Pointer Parallax, Interactive 3D Rock / Thanos Throne Dragging, & Responsive Resize
    let targetPointerX = 0;
    let targetPointerY = 0;
    let dampedPointerX = 0;
    let dampedPointerY = 0;

    let isDraggingRock = false;
    let lastDragX = 0;
    let lastDragY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      const canDragAbout = cinematicStateRef.current.aboutRevealProgress >= 0.25;
      const canDragSkills = cinematicStateRef.current.skillsRevealProgress >= 0.25;
      if (!canDragAbout && !canDragSkills) return;
      if (
        e.target instanceof Element &&
        e.target.closest('button, a, input, select, textarea, [data-no-rock-drag="true"]')
      ) {
        return;
      }
      isDraggingRock = true;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingRock) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;

        if (cinematicStateRef.current.skillsRevealProgress >= 0.25) {
          cinematicStateRef.current.throneUserYaw = THREE.MathUtils.clamp(
            cinematicStateRef.current.throneUserYaw + dx * 0.0055,
            -0.8,
            0.8
          );
          cinematicStateRef.current.throneUserPitch = THREE.MathUtils.clamp(
            cinematicStateRef.current.throneUserPitch + dy * 0.0038,
            -0.38,
            0.38
          );
        } else if (cinematicStateRef.current.aboutRevealProgress >= 0.25) {
          cinematicStateRef.current.aboutRockUserYaw += dx * 0.0065;
          cinematicStateRef.current.aboutRockUserPitch = THREE.MathUtils.clamp(
            cinematicStateRef.current.aboutRockUserPitch + dy * 0.0045,
            -0.65,
            0.65
          );
        }
      }

      if (overridesRef.current.reducedMotion) return;
      targetPointerX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetPointerY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };

    const handlePointerUp = () => {
      isDraggingRock = false;
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });

    const handleResize = () => {
      if (!mountEl) return;
      const w = mountEl.clientWidth || window.innerWidth;
      const h = mountEl.clientHeight || window.innerHeight;
      const aspect = w / Math.max(1, h);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      realityTransitionPass.setSize(w, h, renderer.getPixelRatio());
    };
    window.addEventListener('resize', handleResize);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('webglcontextlost', handleContextLost, false);

    // 6. Damped Render Loop with Software-WebGL Pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let isUnmounted = false;

    let dampedCamZ = cinematicStateRef.current.cameraZ;
    let dampedCamY = cinematicStateRef.current.cameraY;
    let dampedLookX = cinematicStateRef.current.cameraLookX;
    let dampedLookY = cinematicStateRef.current.cameraLookY;
    let dampedFov = cinematicStateRef.current.cameraFov;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isUnmounted) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isUnmounted) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      const state = cinematicStateRef.current;
      const overrides = overridesRef.current;

      const dampLambda = isSoftwareGl ? 18 : 7.5;
      dampedPointerX = THREE.MathUtils.damp(dampedPointerX, targetPointerX, 4.5, delta);
      dampedPointerY = THREE.MathUtils.damp(dampedPointerY, targetPointerY, 4.5, delta);

      const isPortrait = camera.aspect < 0.85;
      const mobileZOffset = isPortrait ? 1.85 : 0.0;

      dampedCamZ = THREE.MathUtils.damp(dampedCamZ, state.cameraZ + mobileZOffset, dampLambda, delta);
      dampedCamY = THREE.MathUtils.damp(dampedCamY, state.cameraY, dampLambda, delta);
      dampedLookX = THREE.MathUtils.damp(dampedLookX, state.cameraLookX, dampLambda, delta);
      dampedLookY = THREE.MathUtils.damp(dampedLookY, state.cameraLookY, dampLambda, delta);
      dampedFov = THREE.MathUtils.damp(dampedFov, state.cameraFov, dampLambda, delta);

      if (Math.abs(camera.fov - dampedFov) > 0.05) {
        camera.fov = dampedFov;
        camera.updateProjectionMatrix();
      }

      camera.position.set(
        dampedPointerX * 0.24,
        dampedCamY + dampedPointerY * 0.16,
        dampedCamZ
      );
      _lookAtTarget.set(dampedLookX + dampedPointerX * 0.08, dampedLookY, 0);
      camera.lookAt(_lookAtTarget);

      const wipeProgress = THREE.MathUtils.clamp(state.skillsRevealProgress || 0, 0, 1);
      const isTransitioningToSkills = wipeProgress > 0.001 && wipeProgress < 0.999;

      // Smoothly blend Scene A background tone (Hero -> About -> Warm Dusty Amber during Reality Stone wipe)
      _blendedBgColor
        .copy(_heroBgColor)
        .lerp(_aboutBgColor, state.aboutRevealProgress)
        .lerp(_titanDustColor, Math.sin(wipeProgress * Math.PI) * 0.65);
      (scene.background as THREE.Color).copy(_blendedBgColor);
      fog.color.copy(_blendedBgColor);
      fog.density = THREE.MathUtils.lerp(0.042, 0.024, state.aboutRevealProgress);

      // Update Scene A (Screen 1: Galactus + Screen 2: About 3D Iron Man Hologram) when visible
      if (wipeProgress < 0.999) {
        galactusRig.update(elapsed, state, overrides, dampedPointerX, dampedPointerY);

        const effectiveDepth = state.depthRelief * overrides.reliefMultiplier;
        galactusRig.getEyePositions3D(_leftEyeWorld, _rightEyeWorld, effectiveDepth);

        eyeGlow.update(elapsed, _leftEyeWorld, _rightEyeWorld, state, overrides);
        energyBeam.update(elapsed, _leftEyeWorld, _rightEyeWorld, camera, state, overrides);

        aboutCrystalRocks.update(
          elapsed,
          state,
          overrides,
          dampedPointerX,
          dampedPointerY,
          isPortrait
        );

        holoTransition3D.update(
          elapsed,
          state,
          overrides,
          dampedPointerX,
          dampedPointerY
        );

        cosmicParticles.update(elapsed, state, overrides);
      }

      // Update Scene B (Screen 3: MY SKILLS — 3D Thanos Chair Throne & 3D Background Galaxy) when visible
      if (wipeProgress > 0.001) {
        thanosSkillsScene3D.update(
          elapsed,
          state,
          overrides,
          dampedPointerX,
          dampedPointerY,
          isPortrait
        );
      }

      cosmicAudio.updateFromCinematicState(state);

      rimLightLeft.intensity = 2.0 * state.rimLightIntensity;
      rimLightRight.intensity = 1.9 * state.rimLightIntensity;

      // Render via Dual-RenderTarget Reality Stone Post-Processing Wipe when transitioning
      if (isTransitioningToSkills) {
        realityTransitionPass.renderTransition(
          renderer,
          scene,
          skillsScene,
          camera,
          wipeProgress,
          elapsed
        );
      } else if (wipeProgress >= 0.999) {
        renderer.setRenderTarget(null);
        renderer.render(skillsScene, camera);
      } else {
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isUnmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('resize', handleResize);
      canvasEl.removeEventListener('webglcontextlost', handleContextLost);

      galactusRig.dispose();
      eyeGlow.dispose();
      energyBeam.dispose();
      cosmicParticles.dispose();
      aboutCrystalRocks.dispose();
      holoTransition3D.dispose();
      thanosSkillsScene3D.dispose();
      realityTransitionPass.dispose();
      envTexture.dispose();
      renderer.dispose();
    };
  }, [cinematicStateRef, overridesRef]);

  if (webglError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#040208] overflow-hidden">
        <img
          src={GALACTUS_IMAGE_PATH}
          alt="Galactus Cosmic Entity"
          referrerPolicy="no-referrer"
          className="w-full max-w-2xl h-auto object-contain opacity-85"
        />
      </div>
    );
  }

  return (
    <div
      ref={canvasMountRef}
      className="w-full h-full relative overflow-hidden select-none"
      aria-label="Interactive 3D Galactus Cosmic Scene"
    />
  );
};
