import * as THREE from 'three';
import { CinematicState, DirectorOverrides } from '../../types/cinematic';

const TOTAL_LINE_LASERS = 36; // 18 from Left Eye, 18 from Right Eye

// Vibrant 8-Color Multicolor Laser Spectrum
const MULTICOLOR_LASER_PALETTE = [
  '#00f2fe', // Electric Cyan
  '#ff2a85', // Neon Magenta
  '#10b981', // Cyber Emerald Green
  '#fbbf24', // Solar Gold / Amber
  '#a855f7', // Ultraviolet Purple
  '#ff1e56', // Crimson Laser Red
  '#38bdf8', // Sky Cobalt Blue
  '#f97316', // Plasma Orange
];

// Pre-allocated module-scope vectors to prevent GC in the render loop
const _ndcVec = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _activeCursorWorld = new THREE.Vector3();
const _textStartWorld = new THREE.Vector3();
const _beamTarget = new THREE.Vector3();

interface LineLaserConfig {
  eyeSide: 'left' | 'right';
  role: 'outline-tracer' | 'wireframe-mesh' | 'fan';
  roleIndex: number;
  phase: number;
  speed: number;
  spreadOffsetX: number;
  spreadOffsetY: number;
  thickness: number;
  colorA: THREE.Color;
  colorB: THREE.Color;
}

export class EnergyBeamSystem {
  public readonly group: THREE.Group;

  private laserConfigs: LineLaserConfig[] = [];
  private laserMeshes: Array<THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>> = [];

  // Crisp 1px multicolor core filament lines layered inside the 36 volumetric line lasers
  private coreLineSegments: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private coreLinePositions: Float32Array;
  private coreLineColors: Float32Array;

  // Multicolor laser-tracing spark at the active wireframe contour point
  private cursorSparkSprite: THREE.Sprite;
  private cursorHaloSprite: THREE.Sprite;
  private cursorPointLight: THREE.PointLight;

  // Glowing multicolor laser baseline under the wireframe text
  private pedestalHorizonSprite: THREE.Sprite;

  private sparkTexture: THREE.CanvasTexture;
  private horizonGlowTex: THREE.CanvasTexture;

  constructor() {
    this.group = new THREE.Group();

    this.sparkTexture = this.createLaserSparkTexture();
    this.horizonGlowTex = this.createMulticolorHorizonTexture();

    // Shared unit-length thin cylinder geometry pivoted at z=0, pointing along +Z to z=1
    const thinLaserGeo = new THREE.CylinderGeometry(0.010, 0.004, 1.0, 8, 12, true);
    thinLaserGeo.rotateX(Math.PI / 2);
    thinLaserGeo.translate(0, 0, 0.5);

    const baseLaserShader = this.createMulticolorLaserShaderMaterial();

    this.coreLinePositions = new Float32Array(TOTAL_LINE_LASERS * 2 * 3);
    this.coreLineColors = new Float32Array(TOTAL_LINE_LASERS * 2 * 3);

    // Build 36 distinct multicolor line lasers (18 left eye, 18 right eye)
    for (let i = 0; i < TOTAL_LINE_LASERS; i++) {
      const eyeSide: 'left' | 'right' = i < TOTAL_LINE_LASERS / 2 ? 'left' : 'right';
      const localIdx = i % (TOTAL_LINE_LASERS / 2); // 0..17 per eye

      // Per eye:
      // 0..5 (6 beams) = 'outline-tracer' (actively trace the perimeter contour of the current letter)
      // 6..14 (9 beams) = 'wireframe-mesh' (lock onto the wireframe vertices of the drawn letters)
      // 15..17 (3 beams) = 'fan' (wider multicolor prism array)
      let role: 'outline-tracer' | 'wireframe-mesh' | 'fan' = 'outline-tracer';
      let roleIndex = localIdx;
      let thickness = 1.0;

      if (localIdx < 6) {
        role = 'outline-tracer';
        roleIndex = localIdx;
        thickness = localIdx === 0 ? 1.35 : 0.9;
      } else if (localIdx < 15) {
        role = 'wireframe-mesh';
        roleIndex = localIdx - 6; // 0..8
        thickness = 0.72;
      } else {
        role = 'fan';
        roleIndex = localIdx - 15; // 0..2
        thickness = 0.58;
      }

      const colorHexA = MULTICOLOR_LASER_PALETTE[i % MULTICOLOR_LASER_PALETTE.length];
      const colorHexB = MULTICOLOR_LASER_PALETTE[(i + 3) % MULTICOLOR_LASER_PALETTE.length];
      const colorA = new THREE.Color(colorHexA);
      const colorB = new THREE.Color(colorHexB);

      const angle = (localIdx / 18) * Math.PI * 2;
      this.laserConfigs.push({
        eyeSide,
        role,
        roleIndex,
        phase: i * 0.85,
        speed: 14.0 + (i % 7) * 3.0,
        spreadOffsetX: Math.cos(angle),
        spreadOffsetY: Math.sin(angle),
        thickness,
        colorA,
        colorB,
      });

      // Populate vertex colors for the crisp 1px inner core filament
      const cIdx = i * 6;
      this.coreLineColors[cIdx] = colorA.r;
      this.coreLineColors[cIdx + 1] = colorA.g;
      this.coreLineColors[cIdx + 2] = colorA.b;
      this.coreLineColors[cIdx + 3] = colorB.r;
      this.coreLineColors[cIdx + 4] = colorB.g;
      this.coreLineColors[cIdx + 5] = colorB.b;

      const mat = baseLaserShader.clone();
      mat.uniforms.uPhase.value = i * 0.85;
      mat.uniforms.uSpeed.value = 14.0 + (i % 7) * 3.0;
      mat.uniforms.uColorA.value.copy(colorA);
      mat.uniforms.uColorB.value.copy(colorB);

      const mesh = new THREE.Mesh(thinLaserGeo, mat);
      mesh.renderOrder = 20;
      mesh.frustumCulled = false;
      this.laserMeshes.push(mesh);
      this.group.add(mesh);
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.coreLinePositions, 3)
    );
    lineGeo.setAttribute(
      'color',
      new THREE.BufferAttribute(this.coreLineColors, 3)
    );
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.coreLineSegments = new THREE.LineSegments(lineGeo, lineMat);
    this.coreLineSegments.renderOrder = 21;
    this.coreLineSegments.frustumCulled = false;
    this.group.add(this.coreLineSegments);

    // Laser Wireframe Tracing Spark
    this.cursorSparkSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sparkTexture,
        color: new THREE.Color('#ffffff'),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      })
    );
    this.cursorSparkSprite.renderOrder = 26;

    this.cursorHaloSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.sparkTexture,
        color: new THREE.Color('#00f2fe'),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      })
    );
    this.cursorHaloSprite.renderOrder = 25;

    this.cursorPointLight = new THREE.PointLight('#00f2fe', 0, 5.5, 1.5);

    this.group.add(
      this.cursorSparkSprite,
      this.cursorHaloSprite,
      this.cursorPointLight
    );

    // Multicolor laser horizon bar under the wireframe text
    this.pedestalHorizonSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.horizonGlowTex,
        color: new THREE.Color('#ffffff'),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      })
    );
    this.pedestalHorizonSprite.renderOrder = 23;
    this.group.add(this.pedestalHorizonSprite);
  }

  private createMulticolorLaserShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBeamProgress: { value: 0 },
        uBeamIntensity: { value: 0 },
        uPhase: { value: 0 },
        uSpeed: { value: 16.0 },
        uColorA: { value: new THREE.Color('#00f2fe') },
        uColorB: { value: new THREE.Color('#ff2a85') },
        uColorWhite: { value: new THREE.Color('#ffffff') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uBeamProgress;
        uniform float uBeamIntensity;
        uniform float uPhase;
        uniform float uSpeed;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorWhite;

        varying vec2 vUv;

        void main() {
          if (uBeamIntensity <= 0.001 || uBeamProgress <= 0.001) discard;

          // vUv.y runs from 0.0 (at Galactus's eye) to 1.0 (at the wireframe letter contour)
          float along = vUv.y;
          if (along > uBeamProgress) discard;

          // High-speed multicolor laser pulse packets racing along the line
          float pulseWave1 = 0.5 + 0.5 * sin(along * 36.0 - uTime * uSpeed + uPhase);
          float pulseWave2 = pow(0.5 + 0.5 * cos(along * 20.0 - uTime * (uSpeed * 0.75) - uPhase), 2.5);
          float packet = clamp(0.42 + pulseWave1 * 0.48 + pulseWave2 * 0.6, 0.0, 1.45);

          float coreCenter = 1.0 - abs(vUv.x - 0.5) * 2.0;
          coreCenter = pow(clamp(coreCenter, 0.0, 1.0), 1.4);

          // Blend between ColorA and ColorB along the length of the beam + time shift
          float colorMix = 0.5 + 0.5 * sin(along * 6.0 - uTime * 3.5 + uPhase);
          vec3 spectrumCol = mix(uColorA, uColorB, colorMix);
          vec3 finalCol = mix(spectrumCol, uColorWhite, coreCenter * 0.65);

          float tipFade = smoothstep(uBeamProgress, max(0.0, uBeamProgress - 0.08), along);
          float originFade = smoothstep(0.0, 0.03, along);

          float alpha = originFade * tipFade * packet * uBeamIntensity * (0.45 + 0.55 * coreCenter);
          gl_FragColor = vec4(finalCol * (1.25 + packet * 0.55), clamp(alpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
  }

  private createLaserSparkTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(128, 128, 1, 128, 128, 124);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(0, 242, 254, 0.9)');
    grad.addColorStop(0.5, 'rgba(255, 42, 133, 0.45)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(24, 126, 208, 4);
    ctx.fillRect(126, 24, 4, 208);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createMulticolorHorizonTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Multicolor horizontal spectrum gradient
    const hGrad = ctx.createLinearGradient(0, 32, 512, 32);
    hGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    hGrad.addColorStop(0.15, 'rgba(0, 242, 254, 0.75)');
    hGrad.addColorStop(0.35, 'rgba(16, 185, 129, 0.8)');
    hGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.9)');
    hGrad.addColorStop(0.68, 'rgba(255, 42, 133, 0.85)');
    hGrad.addColorStop(0.85, 'rgba(168, 85, 247, 0.75)');
    hGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 16, 512, 32);

    ctx.globalCompositeOperation = 'destination-in';
    const vGrad = ctx.createLinearGradient(256, 0, 256, 64);
    vGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    vGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
    vGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, 512, 64);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private unprojectToWritingPlane(
    ndcX: number,
    ndcY: number,
    targetZ: number,
    camera: THREE.PerspectiveCamera,
    outVec: THREE.Vector3
  ) {
    _ndcVec.set(ndcX, ndcY, 0.5);
    _ndcVec.unproject(camera);
    _rayDir.copy(_ndcVec).sub(camera.position).normalize();
    const dist = (targetZ - camera.position.z) / (_rayDir.z || -0.0001);
    outVec.copy(camera.position).addScaledVector(_rayDir, dist);
  }

  public update(
    elapsedTime: number,
    leftEyeWorld: THREE.Vector3,
    rightEyeWorld: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
    state: CinematicState,
    overrides: DirectorOverrides
  ) {
    const brightness = overrides.beamBrightness;
    const activeBeamIntensity = state.beamIntensity * brightness;
    const showLasers = activeBeamIntensity > 0.005 && state.beamProgress > 0.005;

    this.coreLineSegments.visible = showLasers;

    const writingPlaneZ = 2.85;

    // Unproject the active wireframe letter contour coordinates into 3D world space
    this.unprojectToWritingPlane(
      state.activeCharNormalizedX,
      state.activeCharNormalizedY,
      writingPlaneZ,
      camera,
      _activeCursorWorld
    );

    this.unprojectToWritingPlane(
      -0.48,
      state.activeCharNormalizedY,
      writingPlaneZ,
      camera,
      _textStartWorld
    );

    const isTracingActive =
      showLasers && state.introRevealProgress > 0.005 && state.introRevealProgress < 0.995;

    for (let i = 0; i < TOTAL_LINE_LASERS; i++) {
      const cfg = this.laserConfigs[i];
      const mesh = this.laserMeshes[i];
      mesh.visible = showLasers;

      if (!showLasers) continue;

      const originEye = cfg.eyeSide === 'left' ? leftEyeWorld : rightEyeWorld;

      if (cfg.role === 'outline-tracer') {
        // Trace around the contour of the active letter being wireframe-drawn
        const orbitSpeed = overrides.reducedMotion ? 2.0 : 24.0;
        const contourAngle = elapsedTime * orbitSpeed + cfg.phase;
        const contourRx = 0.085;
        const contourRy = 0.145;
        _beamTarget.set(
          _activeCursorWorld.x + Math.cos(contourAngle) * contourRx,
          _activeCursorWorld.y + Math.sin(contourAngle * 1.5) * contourRy,
          _activeCursorWorld.z
        );
      } else if (cfg.role === 'wireframe-mesh') {
        // Connect Galactus's eyes to the top & bottom wireframe outline vertices across the drawn text
        const scanRatio =
          (cfg.roleIndex + 0.5 + 0.45 * Math.sin(elapsedTime * 5.5 + cfg.phase)) / 9.0;
        const clampedScan = THREE.MathUtils.clamp(scanRatio, 0, 1);
        _beamTarget.lerpVectors(_textStartWorld, _activeCursorWorld, clampedScan);
        // Alternate top/bottom glyph contour edge so lasers visibly construct the wireframe box
        const contourEdge = (cfg.roleIndex % 2 === 0 ? 1 : -1) * 0.11;
        _beamTarget.y += contourEdge + Math.cos(elapsedTime * 14.0 + cfg.phase) * 0.03;
      } else {
        // Outer multicolor prism fan
        const fanSpread = state.laserSpread;
        _beamTarget.set(
          _activeCursorWorld.x + cfg.spreadOffsetX * (1.4 + fanSpread * 1.8),
          _activeCursorWorld.y + cfg.spreadOffsetY * (0.45 + fanSpread * 0.65),
          writingPlaneZ
        );
      }

      const fullDist = originEye.distanceTo(_beamTarget);
      mesh.position.copy(originEye);
      mesh.lookAt(_beamTarget);

      const widthScale = cfg.thickness * state.beamWidth;
      mesh.scale.set(widthScale, widthScale, fullDist);

      const mat = mesh.material;
      mat.uniforms.uTime.value = elapsedTime;
      mat.uniforms.uBeamProgress.value = state.beamProgress;
      mat.uniforms.uBeamIntensity.value =
        cfg.role === 'outline-tracer'
          ? activeBeamIntensity * 1.15
          : cfg.role === 'wireframe-mesh'
            ? activeBeamIntensity * 0.88
            : activeBeamIntensity * 0.62;

      const idx6 = i * 6;
      this.coreLinePositions[idx6] = originEye.x;
      this.coreLinePositions[idx6 + 1] = originEye.y;
      this.coreLinePositions[idx6 + 2] = originEye.z;

      const reach = state.beamProgress;
      this.coreLinePositions[idx6 + 3] = THREE.MathUtils.lerp(originEye.x, _beamTarget.x, reach);
      this.coreLinePositions[idx6 + 4] = THREE.MathUtils.lerp(originEye.y, _beamTarget.y, reach);
      this.coreLinePositions[idx6 + 5] = THREE.MathUtils.lerp(originEye.z, _beamTarget.z, reach);
    }

    if (showLasers) {
      this.coreLineSegments.geometry.attributes.position.needsUpdate = true;
      this.coreLineSegments.material.opacity = THREE.MathUtils.clamp(
        activeBeamIntensity * 0.78,
        0,
        0.92
      );
    }

    // Update Multicolor Laser Tracing Spark at the active letter contour
    const showCursorSpark =
      showLasers && state.beamProgress > 0.85 && state.introRevealProgress > 0.002;
    this.cursorSparkSprite.visible = showCursorSpark;
    this.cursorHaloSprite.visible = showCursorSpark;

    if (showCursorSpark) {
      this.cursorSparkSprite.position.copy(_activeCursorWorld);
      this.cursorHaloSprite.position.copy(_activeCursorWorld);
      this.cursorPointLight.position.copy(_activeCursorWorld);

      // Cycle halo & point light color through the prism spectrum
      const hue = (elapsedTime * 0.45) % 1.0;
      this.cursorHaloSprite.material.color.setHSL(hue, 0.95, 0.6);
      this.cursorPointLight.color.setHSL(hue, 0.95, 0.6);

      const flicker = overrides.reducedMotion
        ? 1.0
        : 0.85 + 0.3 * Math.abs(Math.sin(elapsedTime * 32.0));
      const sparkSize = (isTracingActive ? 0.36 : 0.2) * flicker;
      this.cursorSparkSprite.scale.set(sparkSize, sparkSize, 1);
      this.cursorHaloSprite.scale.set(sparkSize * 2.2, sparkSize * 2.2, 1);

      const sparkOpacity = THREE.MathUtils.clamp(
        activeBeamIntensity * (isTracingActive ? 0.92 : 0.38),
        0,
        0.92
      );
      (this.cursorSparkSprite.material as THREE.SpriteMaterial).opacity = sparkOpacity;
      (this.cursorHaloSprite.material as THREE.SpriteMaterial).opacity = sparkOpacity * 0.7;
      this.cursorPointLight.intensity = sparkOpacity * 2.4;
    } else {
      this.cursorPointLight.intensity = 0;
    }

    // Update multicolor laser baseline under the wireframe text
    const pedInt = state.pedestalGlowIntensity * brightness;
    this.pedestalHorizonSprite.visible = pedInt > 0.005;
    if (pedInt > 0.005) {
      const centerX = (_textStartWorld.x + _activeCursorWorld.x) * 0.5;
      const spanWidth = Math.max(0.4, Math.abs(_activeCursorWorld.x - _textStartWorld.x) + 0.8);
      this.pedestalHorizonSprite.position.set(
        centerX,
        _activeCursorWorld.y - 0.24,
        writingPlaneZ
      );
      this.pedestalHorizonSprite.scale.set(spanWidth, 0.32, 1);
      (this.pedestalHorizonSprite.material as THREE.SpriteMaterial).opacity =
        THREE.MathUtils.clamp(pedInt * 0.8, 0, 0.88);
    }
  }

  public dispose() {
    this.sparkTexture.dispose();
    this.horizonGlowTex.dispose();
    if (this.laserMeshes.length > 0) {
      this.laserMeshes[0].geometry.dispose();
      this.laserMeshes.forEach((m) => m.material.dispose());
    }
    this.coreLineSegments.geometry.dispose();
    this.coreLineSegments.material.dispose();
    (this.cursorSparkSprite.material as THREE.Material).dispose();
    (this.cursorHaloSprite.material as THREE.Material).dispose();
    (this.pedestalHorizonSprite.material as THREE.Material).dispose();
  }
}
