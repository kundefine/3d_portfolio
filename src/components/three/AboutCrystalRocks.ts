import * as THREE from 'three';
import { CinematicState, DirectorOverrides } from '../../types/cinematic';

/**
 * The user's uploaded Iron Man hologram & blue neon outline reference images.
 * Primary shape reference: /assets/aistudio/ironman_shape_8d198236.jpg
 */
export const IRONMAN_HOLOGRAM_IMAGES = [
  '/assets/aistudio/ironman_shape_8d198236.jpg',
  '/assets/aistudio/ironman_3d_outline_bf810b8d.webp',
  '/assets/aistudio/ironman_blue_neon_57f7be01.jpg',
] as const;

interface HudRingSatellite {
  group: THREE.Group;
  basePos: THREE.Vector3;
  scatterOffset: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  phase: number;
}

interface HoloVoxelData {
  t: number;
  speed: number;
  spreadY: number;
  spreadZ: number;
  scale: number;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
  scatterVec: THREE.Vector3;
}

const _dummyObj = new THREE.Object3D();
const _tempPos = new THREE.Vector3();

const BUST_WIDTH = 5.4;
const BUST_HEIGHT = 5.1;

function fract(x: number): number {
  return x - Math.floor(x);
}

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return fract(n);
}

function gaussian2D(
  u: number,
  v: number,
  cu: number,
  cv: number,
  ru: number,
  rv: number
): number {
  const du = (u - cu) / ru;
  const dv = (v - cv) / rv;
  return Math.exp(-(du * du + dv * dv));
}

/**
 * Computes an anatomical 3D Iron Man depth relief value (0..1) calibrated to the exact
 * proportions of /assets/aistudio/ironman_shape_8d198236.jpg (helmet dome, brow ridge,
 * faceplate, jaw, neck column, chest pectorals, protruding Arc Reactor, and shoulder pauldrons).
 */
function computeIronManAnatomicalDepth(
  u: number,
  v: number,
  luma: number
): { depth: number; isSubject: number; arcMask: number } {
  // 1. Helmet & Faceplate 3D Dome (centered around u = 0.49, v = 0.72)
  const craniumDome = gaussian2D(u, v, 0.495, 0.76, 0.145, 0.19) * 0.78;
  const faceplateProtrusion = gaussian2D(u, v, 0.478, 0.67, 0.105, 0.13) * 0.88;
  const browRidge = gaussian2D(u, v, 0.475, 0.735, 0.11, 0.038) * 0.32;
  const chinGuard = gaussian2D(u, v, 0.472, 0.545, 0.075, 0.055) * 0.68;
  const earPodRight = gaussian2D(u, v, 0.595, 0.70, 0.038, 0.065) * 0.62;

  const headSculpt = Math.min(
    1.0,
    Math.max(craniumDome, faceplateProtrusion + browRidge, chinGuard, earPodRight)
  );

  // 2. Neck & Mechanical Collar Traps (v around 0.46..0.56)
  const neckColumn = gaussian2D(u, v, 0.50, 0.51, 0.12, 0.07) * 0.48;
  const leftTrap = gaussian2D(u, v, 0.39, 0.49, 0.09, 0.06) * 0.56;
  const rightTrap = gaussian2D(u, v, 0.61, 0.50, 0.10, 0.065) * 0.62;

  // 3. Chest Pectoral Armor & Protruding Circular Arc Reactor (centered at u = 0.455, v = 0.225)
  const chestPlate = gaussian2D(u, v, 0.485, 0.24, 0.24, 0.25) * 0.74;
  const sternumRidge = gaussian2D(u, v, 0.458, 0.26, 0.14, 0.18) * 0.84;

  // Arc Reactor housing ring & core
  const arcDist = Math.hypot((u - 0.455) * 1.05, (v - 0.225) * 0.95);
  const arcRing = Math.exp(-Math.pow((arcDist - 0.095) / 0.035, 2.0)) * 0.96;
  const arcCore = Math.exp(-Math.pow(arcDist / 0.085, 2.0)) * 0.92;
  const arcMask = Math.min(1.0, Math.max(arcRing, arcCore));

  // 4. Broad 3D Shoulder Pauldrons (left u ~ 0.25, right u ~ 0.74)
  const leftPauldron = gaussian2D(u, v, 0.255, 0.34, 0.115, 0.13) * 0.72;
  const rightPauldron = gaussian2D(u, v, 0.735, 0.34, 0.145, 0.15) * 0.86;

  const anatomicalBase = Math.max(
    headSculpt,
    neckColumn,
    leftTrap,
    rightTrap,
    chestPlate,
    sternumRidge,
    arcRing,
    arcCore,
    leftPauldron,
    rightPauldron
  );

  // Separate foreground 3D Iron Man bust from the faint background diagnostic grid
  const isSubject = THREE.MathUtils.smoothstep(
    anatomicalBase + luma * 0.45,
    0.18,
    0.42
  );

  // Combine smooth 3D armor volume with fine wireframe X-ray line relief from the image
  const depth =
    isSubject * (anatomicalBase * 0.76 + luma * 0.34) +
    (1.0 - isSubject) * (luma * 0.12);

  return {
    depth: THREE.MathUtils.clamp(depth, 0, 1),
    isSubject,
    arcMask,
  };
}

/**
 * Renders the 3D Iron Man Blue Neon Hologram in the About Section using a high-resolution
 * 3D Volumetric Depth-Relief & Wireframe Lattice Rig sculpted directly from the user's
 * Iron Man hologram image (/assets/aistudio/ironman_shape_8d198236.jpg).
 */
export class AboutCrystalRocksSystem {
  public readonly group: THREE.Group;
  public readonly monolithPivot: THREE.Group;

  // Multi-layer 3D Volumetric Hologram Meshes (Front Relief + 3D Wireframe Lattice + Rear Volumetric Echo)
  private frontReliefMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private wireframeLatticeMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private rearEchoMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  private reliefMat: THREE.ShaderMaterial;
  private wireframeMat: THREE.ShaderMaterial;
  private rearEchoMat: THREE.ShaderMaterial;

  // Calibrated 3D Arc Reactor Ring & Turbine mounted directly over the chest reactor in 3D space
  private arcReactor3DGroup: THREE.Group;
  private arcOuterRing: THREE.Mesh;
  private arcInnerSpinGroup: THREE.Group;

  // Textures (Color + Synthesized 3D Depth/Mask Map for each chapter view)
  private colorTextures: THREE.Texture[] = [];
  private depthTextures: THREE.Texture[] = [];

  // Dynamic Neon Lighting
  private arcReactorLight: THREE.PointLight;
  private helmetNeonLight: THREE.PointLight;

  // Floating 3D Stark HUD Schematic Rings & Diagonal Stream of Blue Neon Data Voxels
  private hudSatellites: HudRingSatellite[] = [];
  private voxelInstancedMesh: THREE.InstancedMesh;
  private voxelMat: THREE.MeshBasicMaterial;
  private voxelData: HoloVoxelData[] = [];
  private readonly voxelCount: number;

  private cyanNeonEdgeMat: THREE.LineBasicMaterial;
  private brightBlueEdgeMat: THREE.LineBasicMaterial;
  private coralTelemetryEdgeMat: THREE.LineBasicMaterial;

  private dampedRotY = -0.12;
  private dampedRotX = 0.03;
  private lastSlideIndex = 0;
  private slideWaveEnergy = 0.0;
  private lastElapsedTime = 0.0;
  private activeTexIdx = -1;
  private disposed = false;

  constructor(isSoftwareGl: boolean) {
    this.group = new THREE.Group();
    this.group.visible = false;

    this.monolithPivot = new THREE.Group();
    this.monolithPivot.position.set(2.15, 0.05, 3.85);
    this.group.add(this.monolithPivot);

    // 1. Create initial procedural placeholder textures so frame 0 renders cleanly
    const { initColor, initDepth } = this.createPlaceholderTextures();
    for (let i = 0; i < IRONMAN_HOLOGRAM_IMAGES.length; i++) {
      this.colorTextures.push(initColor);
      this.depthTextures.push(initDepth);
    }

    // 2. Build the Primary 3D Volumetric Hologram Relief Shader
    // Displaces the 180x180 vertex grid into a true 3D Iron Man bust using the synthesized
    // anatomical depth map & normal map, and grades the X-ray hologram into Electric Blue Neon!
    const sharedVertexShader = `
      uniform sampler2D uDepthMap;
      uniform float uDepthStrength;
      uniform float uCurveStrength;
      uniform float uTime;
      uniform float uLayerOffsetZ;
      uniform float uPulseBoost;
      uniform float uSlideWave;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying vec4 vMask;
      varying float vRippleRing;

      void main() {
        vUv = uv;
        vec4 mask = texture2D(uDepthMap, uv);
        vMask = mask;

        float relief = mask.r;
        float isSubject = mask.g;
        float arcMask = mask.b;

        // 3D cylindrical wrap across the chest & helmet + background HUD grid recession
        float centeredX = (uv.x - 0.49) * 1.75;
        float bodyArc = cos(centeredX) * uCurveStrength * isSubject;
        float bgRecess = (1.0 - isSubject) * -0.42;

        vec3 pos = position;
        pos.z += relief * uDepthStrength + bodyArc + bgRecess + uLayerOffsetZ;

        // 3D Concentric Ripple Shockwave + Electric Zigzag Wave on Slide Transition
        float waveEnv = sin(uSlideWave * 3.14159265);
        float distFromReactor = length((uv - vec2(0.455, 0.225)) * vec2(1.0, 0.95));
        float rippleFront = (1.0 - uSlideWave) * 1.15;
        float ringMask = exp(-pow((distFromReactor - rippleFront) / 0.14, 2.0)) * step(0.01, uSlideWave);
        float concentricRipple = sin(distFromReactor * 36.0 - (1.0 - uSlideWave) * 22.0) * ringMask * waveEnv;
        vRippleRing = ringMask * waveEnv;

        // Sawtooth electric zigzag horizontal displacement during slide transition
        float zigzagBand = asin(sin(uv.y * 52.0 + uTime * 34.0)) * 0.6366;
        pos.x += zigzagBand * 0.16 * waveEnv * (0.4 + 0.6 * ringMask) * isSubject;
        pos.z += concentricRipple * 0.28 * isSubject;

        // Subtle living Arc Reactor & holographic scanline oscillation
        float breathe = sin(uTime * 1.8 + uv.y * 4.0) * 0.018 * isSubject;
        float arcPulse = sin(uTime * 5.0) * 0.035 * arcMask * (1.0 + uPulseBoost);
        pos.z += breathe + arcPulse;

        // Compute dynamic 3D surface normals from the depth map so lighting & Fresnel react to 3D rotation
        float texel = 1.0 / 512.0;
        float dRight = texture2D(uDepthMap, uv + vec2(texel, 0.0)).r;
        float dUp = texture2D(uDepthMap, uv + vec2(0.0, texel)).r;
        vec3 localNormal = normalize(vec3(
          (relief - dRight) * uDepthStrength * 4.8 + sin(centeredX) * 0.38 * isSubject,
          (relief - dUp) * uDepthStrength * 4.8,
          1.0
        ));

        vNormal = normalize(normalMatrix * localNormal);
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        vViewPos = -mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `;

    this.reliefMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
      uniforms: {
        uColorMap: { value: initColor },
        uDepthMap: { value: initDepth },
        uDepthStrength: { value: 1.08 },
        uCurveStrength: { value: 0.44 },
        uLayerOffsetZ: { value: 0.0 },
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uPulseBoost: { value: 0.0 },
        uSlideWave: { value: 0.0 },
        uNeonCyan: { value: new THREE.Color('#00f2fe') },
        uNeonBlue: { value: new THREE.Color('#0ea5e9') },
        uDeepBlue: { value: new THREE.Color('#04152d') },
        uCoralAccent: { value: new THREE.Color('#fb7185') },
      },
      vertexShader: sharedVertexShader,
      fragmentShader: `
        uniform sampler2D uColorMap;
        uniform sampler2D uDepthMap;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uPulseBoost;
        uniform float uSlideWave;
        uniform vec3 uNeonCyan;
        uniform vec3 uNeonBlue;
        uniform vec3 uDeepBlue;
        uniform vec3 uCoralAccent;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec4 vMask;
        varying float vRippleRing;

        void main() {
          vec4 tex = texture2D(uColorMap, vUv);
          float relief = vMask.r;
          float isSubject = vMask.g;
          float arcMask = vMask.b;
          float silhouetteAlpha = vMask.a;

          // Edge vignette so the hologram floats seamlessly in 3D space without rectangular borders
          float edgeX = smoothstep(0.01, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 0.99, vUv.x));
          float edgeY = smoothstep(0.01, 0.12, vUv.y) * (1.0 - smoothstep(0.89, 0.99, vUv.y));
          float vignette = edgeX * edgeY;

          float luma = max(tex.b, max(tex.r, tex.g));

          // Key out pure black background while preserving the dark translucent 3D armor core
          float alpha = silhouetteAlpha * vignette * uOpacity;
          if (alpha < 0.015) discard;

          // 3D Fresnel rim glow reacting as the user rotates Iron Man with the mouse or 3D slider
          vec3 viewDir = normalize(vViewPos);
          float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.1);

          // Transform X-ray white/cyan into Electric Stark Blue & Cyan Neon Outline
          // Preserve any existing coral/red telemetry from image 1 (where tex.r > tex.b * 1.25)
          float coralSignal = clamp((tex.r - tex.b * 1.15) * 2.5, 0.0, 1.0);

          vec3 baseCore = mix(vec3(0.01, 0.03, 0.07), uDeepBlue, isSubject * 0.75);
          vec3 neonLineCol = mix(uNeonBlue, uNeonCyan, smoothstep(0.22, 0.72, luma));
          // White-hot core on the brightest neon outlines, eyes, and Arc Reactor
          neonLineCol = mix(neonLineCol, vec3(0.92, 0.98, 1.0), smoothstep(0.72, 0.96, luma));
          neonLineCol = mix(neonLineCol, uCoralAccent, coralSignal);

          // Subtle animated holographic scanlines & CAD sweep wave
          float scanline = 0.88 + 0.12 * sin(vUv.y * 240.0 - uTime * 9.0);
          float holoSweep = smoothstep(0.94, 1.0, sin(vUv.y * 7.0 - uTime * 2.4)) * isSubject;

          // Boost the glowing eyes (around u=0.465, v=0.715) and chest Arc Reactor (arcMask)
          float eyeGlow = exp(-pow(length((vUv - vec2(0.465, 0.715)) * vec2(2.6, 5.5)), 2.0)) * isSubject;
          float reactorGlow = arcMask * (0.55 + 0.25 * sin(uTime * 5.0) + uPulseBoost * 0.5);

          vec3 finalCol = mix(baseCore, neonLineCol, clamp(luma * 1.35, 0.0, 1.0)) * scanline;
          finalCol += uNeonCyan * (fresnel * (0.85 + uPulseBoost * 0.65) * isSubject);
          finalCol += uNeonCyan * (holoSweep * 0.42 + reactorGlow * 0.75 + eyeGlow * 0.55);
          // Concentric ripple shockwave + electric zigzag neon flash during slide change
          finalCol += mix(uNeonCyan, vec3(1.0), 0.45) * vRippleRing * 1.45 * isSubject;

          // Make the interior of the 3D Iron Man bust solidly volumetric while background grid lines are additive-like
          float finalAlpha = clamp(
            (isSubject * (0.48 + luma * 0.52 + fresnel * 0.35 + vRippleRing * 0.35) + (1.0 - isSubject) * luma * 1.15) * vignette * uOpacity,
            0.0,
            0.98
          );

          gl_FragColor = vec4(finalCol, finalAlpha);
        }
      `,
    });

    // 3. Layer 2: 3D Volumetric Wireframe Sub-Lattice Mesh (gives real 3D polygon wireframe facets on rotation)
    this.wireframeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColorMap: { value: initColor },
        uDepthMap: { value: initDepth },
        uDepthStrength: { value: 1.10 },
        uCurveStrength: { value: 0.45 },
        uLayerOffsetZ: { value: 0.015 },
        uTime: { value: 0 },
        uOpacity: { value: 0.28 },
        uPulseBoost: { value: 0.0 },
        uSlideWave: { value: 0.0 },
        uWireColor: { value: new THREE.Color('#00f2fe') },
      },
      vertexShader: sharedVertexShader,
      fragmentShader: `
        uniform sampler2D uColorMap;
        uniform float uOpacity;
        uniform float uPulseBoost;
        uniform vec3 uWireColor;

        varying vec2 vUv;
        varying vec4 vMask;
        varying float vRippleRing;

        void main() {
          float isSubject = vMask.g;
          if (isSubject < 0.15) discard;

          vec4 tex = texture2D(uColorMap, vUv);
          float luma = max(tex.b, max(tex.r, tex.g));

          float edgeX = smoothstep(0.04, 0.16, vUv.x) * (1.0 - smoothstep(0.84, 0.96, vUv.x));
          float edgeY = smoothstep(0.04, 0.14, vUv.y) * (1.0 - smoothstep(0.88, 0.98, vUv.y));

          float alpha = (0.12 + luma * 0.88) * isSubject * edgeX * edgeY * (uOpacity + uPulseBoost * 0.28 + vRippleRing * 0.55);
          if (alpha < 0.01) discard;

          gl_FragColor = vec4(uWireColor, alpha);
        }
      `,
    });

    // 4. Layer 3: Deep 3D Rear X-Ray Volumetric Echo Shell (creates 3D thickness when rotated to side angles)
    this.rearEchoMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColorMap: { value: initColor },
        uDepthMap: { value: initDepth },
        uDepthStrength: { value: 0.55 },
        uCurveStrength: { value: 0.25 },
        uLayerOffsetZ: { value: -0.32 },
        uTime: { value: 0 },
        uOpacity: { value: 0.34 },
        uPulseBoost: { value: 0.0 },
        uSlideWave: { value: 0.0 },
        uEchoColor: { value: new THREE.Color('#0284c7') },
      },
      vertexShader: sharedVertexShader,
      fragmentShader: `
        uniform sampler2D uColorMap;
        uniform float uOpacity;
        uniform vec3 uEchoColor;

        varying vec2 vUv;
        varying vec4 vMask;

        void main() {
          vec4 tex = texture2D(uColorMap, vUv);
          float luma = max(tex.b, max(tex.r, tex.g));
          float isSubject = vMask.g;

          float edgeX = smoothstep(0.04, 0.16, vUv.x) * (1.0 - smoothstep(0.84, 0.96, vUv.x));
          float edgeY = smoothstep(0.04, 0.14, vUv.y) * (1.0 - smoothstep(0.88, 0.98, vUv.y));

          float alpha = smoothstep(0.12, 0.65, luma) * isSubject * edgeX * edgeY * uOpacity;
          if (alpha < 0.01) discard;

          gl_FragColor = vec4(uEchoColor * 1.4, alpha);
        }
      `,
    });

    const mainSegs = isSoftwareGl ? 110 : 180;
    const frontGeo = new THREE.PlaneGeometry(BUST_WIDTH, BUST_HEIGHT, mainSegs, mainSegs);
    this.frontReliefMesh = new THREE.Mesh(frontGeo, this.reliefMat);
    this.monolithPivot.add(this.frontReliefMesh);

    const wireSegs = isSoftwareGl ? 64 : 96;
    const wireGeo = new THREE.PlaneGeometry(BUST_WIDTH, BUST_HEIGHT, wireSegs, wireSegs);
    this.wireframeLatticeMesh = new THREE.Mesh(wireGeo, this.wireframeMat);
    this.monolithPivot.add(this.wireframeLatticeMesh);

    const rearGeo = new THREE.PlaneGeometry(BUST_WIDTH, BUST_HEIGHT, wireSegs, wireSegs);
    this.rearEchoMesh = new THREE.Mesh(rearGeo, this.rearEchoMat);
    this.monolithPivot.add(this.rearEchoMesh);

    // 5. Neon Edge Materials for Subtle 3D Arc Reactor Ring & Orbiting CAD Schematics
    this.cyanNeonEdgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#00f2fe'),
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.brightBlueEdgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#38bdf8'),
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.coralTelemetryEdgeMat = new THREE.LineBasicMaterial({
      color: new THREE.Color('#fb7185'),
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // 6. Calibrated 3D Holographic Arc Reactor Ring aligned to the chest reactor in ironman_shape_8d198236.jpg
    // In BUST_WIDTH=5.4, BUST_HEIGHT=5.1, (u=0.455, v=0.225) maps to x = -0.24, y = -1.40, z = 1.15
    this.arcReactor3DGroup = new THREE.Group();
    this.arcReactor3DGroup.position.set(-0.24, -1.38, 1.18);
    // Match the slight 3/4 chest angle of Iron Man in ironman_shape_8d198236.jpg
    this.arcReactor3DGroup.rotation.set(0.12, -0.22, 0.05);
    this.monolithPivot.add(this.arcReactor3DGroup);

    const outerTorusGeo = new THREE.TorusGeometry(0.56, 0.012, 12, 64);
    this.arcOuterRing = new THREE.Mesh(
      outerTorusGeo,
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00f2fe'),
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      })
    );
    this.arcReactor3DGroup.add(this.arcOuterRing);

    this.arcInnerSpinGroup = new THREE.Group();
    this.arcInnerSpinGroup.position.z = 0.04;
    this.arcReactor3DGroup.add(this.arcInnerSpinGroup);

    const innerTicksPts: number[] = [];
    const tickCount = 36;
    for (let i = 0; i < tickCount; i++) {
      const a = (i / tickCount) * Math.PI * 2;
      const r1 = 0.44;
      const r2 = i % 3 === 0 ? 0.53 : 0.49;
      innerTicksPts.push(
        Math.cos(a) * r1,
        Math.sin(a) * r1,
        0,
        Math.cos(a) * r2,
        Math.sin(a) * r2,
        0
      );
    }
    const ticksGeo = new THREE.BufferGeometry();
    ticksGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(innerTicksPts, 3)
    );
    const ticksLines = new THREE.LineSegments(ticksGeo, this.cyanNeonEdgeMat);
    this.arcInnerSpinGroup.add(ticksLines);

    // 7. Dynamic Neon Point Lights
    this.arcReactorLight = new THREE.PointLight('#00f2fe', 5.5, 9.5);
    this.arcReactorLight.position.set(-0.2, -1.2, 2.2);
    this.monolithPivot.add(this.arcReactorLight);

    this.helmetNeonLight = new THREE.PointLight('#38bdf8', 4.5, 8.5);
    this.helmetNeonLight.position.set(0.0, 1.35, 2.1);
    this.monolithPivot.add(this.helmetNeonLight);

    // 8. Floating 3D Stark HUD Schematic Rings in the surrounding 3D space
    this.buildFloatingCadSatellites();

    // 9. Diagonal Stream of 460 Glowing Blue Neon Holographic Data Voxels
    this.voxelCount = isSoftwareGl ? 220 : 460;
    const voxelGeo = new THREE.OctahedronGeometry(0.04, 0);
    this.voxelMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#00f2fe'),
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
    });

    this.voxelInstancedMesh = new THREE.InstancedMesh(
      voxelGeo,
      this.voxelMat,
      this.voxelCount
    );
    this.voxelInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < this.voxelCount; i++) {
      const t = i / this.voxelCount;
      const ribbonBranch = i % 2 === 0 ? 1 : -1;
      const spreadY =
        ribbonBranch * (0.26 + hash3(i, 1.1, 2.2) * 0.44) +
        (hash3(i, 3.3, 4.4) - 0.5) * 0.38;
      const spreadZ = (hash3(i, 5.5, 6.6) - 0.5) * 2.1;
      const scale = 0.4 + hash3(i, 7.7, 8.8) * 1.15;

      this.voxelData.push({
        t,
        speed: 0.014 + hash3(i, 9.1, 1.7) * 0.018,
        spreadY,
        spreadZ,
        scale,
        rotAxis: new THREE.Vector3(
          hash3(i, 2.3, 4.1) - 0.5,
          hash3(i, 5.2, 1.9) - 0.5,
          hash3(i, 8.4, 3.7) - 0.5
        ).normalize(),
        rotSpeed: 0.8 + hash3(i, 6.1, 2.9) * 2.0,
        scatterVec: new THREE.Vector3(
          (hash3(i, 1.5, 9.2) - 0.5) * 14,
          -6.0 - hash3(i, 4.8, 2.1) * 8,
          -9.0 - hash3(i, 7.3, 5.4) * 10
        ),
      });
    }

    this.group.add(this.voxelInstancedMesh);

    // 10. Load the user's Iron Man hologram images & synthesize their 3D anatomical depth maps
    this.loadAndProcessHologramImages();
  }

  private createPlaceholderTextures() {
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 128;
    cCanvas.height = 128;
    const cCtx = cCanvas.getContext('2d')!;
    const grad = cCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, '#00f2fe');
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(1, '#000000');
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, 128, 128);

    const initColor = new THREE.CanvasTexture(cCanvas);
    initColor.colorSpace = THREE.SRGBColorSpace;

    const dCanvas = document.createElement('canvas');
    dCanvas.width = 128;
    dCanvas.height = 128;
    const dCtx = dCanvas.getContext('2d')!;
    dCtx.fillStyle = 'rgba(128, 255, 0, 0)';
    dCtx.fillRect(0, 0, 128, 128);
    const initDepth = new THREE.CanvasTexture(dCanvas);
    initDepth.colorSpace = THREE.NoColorSpace;

    return { initColor, initDepth };
  }

  private loadAndProcessHologramImages() {
    // We always use /assets/aistudio/ironman_shape_8d198236.jpg as the primary 3D bust shape!
    IRONMAN_HOLOGRAM_IMAGES.forEach((srcPath, index) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (this.disposed) return;

        const size = 512;
        const colorCanvas = document.createElement('canvas');
        colorCanvas.width = size;
        colorCanvas.height = size;
        const ctx = colorCanvas.getContext('2d', { willReadFrequently: true })!;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        // Center-crop wide landscape images (like ironman_shape_8d198236.jpg) around the Iron Man bust
        // so the 3D bust has 100% accurate, un-stretched proportions!
        const imgAspect = img.width / Math.max(1, img.height);
        if (imgAspect > 1.35) {
          // For 2:1 landscape (ironman_shape_8d198236.jpg), crop central 58% width where Iron Man stands
          const cropW = img.width * 0.58;
          const cropX = (img.width - cropW) * 0.51;
          ctx.drawImage(img, cropX, 0, cropW, img.height, 0, 0, size, size);
        } else if (imgAspect < 0.85) {
          // For tall portrait (ironman_blue_neon_57f7be01.jpg), crop top-center bust region
          const cropH = img.width * 1.05;
          ctx.drawImage(img, 0, 0, img.width, Math.min(img.height, cropH), 0, 0, size, size);
        } else {
          ctx.drawImage(img, 0, 0, size, size);
        }

        const imgData = ctx.getImageData(0, 0, size, size);
        const px = imgData.data;

        const depthCanvas = document.createElement('canvas');
        depthCanvas.width = size;
        depthCanvas.height = size;
        const dCtx = depthCanvas.getContext('2d')!;
        const depthImgData = dCtx.createImageData(size, size);
        const dOut = depthImgData.data;

        for (let y = 0; y < size; y++) {
          const v = 1.0 - y / size;
          for (let x = 0; x < size; x++) {
            const u = x / size;
            const i = (y * size + x) * 4;

            const r = px[i] / 255;
            const g = px[i + 1] / 255;
            const b = px[i + 2] / 255;
            const luma = Math.max(b, Math.max(r, g));

            const { depth, isSubject, arcMask } = computeIronManAnatomicalDepth(
              u,
              v,
              luma
            );

            // Clean silhouette alpha: solid inside the 3D Iron Man bust & glowing along HUD grid lines
            const lineAlpha = THREE.MathUtils.smoothstep(luma, 0.035, 0.18);
            const silhouetteAlpha = Math.max(isSubject * 0.96, lineAlpha);

            dOut[i] = Math.round(depth * 255); // R: 3D Z-Relief Depth
            dOut[i + 1] = Math.round(isSubject * 255); // G: Foreground 3D Iron Man Bust Mask
            dOut[i + 2] = Math.round(arcMask * 255); // B: Chest Arc Reactor Mask
            dOut[i + 3] = Math.round(silhouetteAlpha * 255); // A: Hologram Alpha Mask
          }
        }

        dCtx.putImageData(depthImgData, 0, 0);

        const colorTex = new THREE.CanvasTexture(colorCanvas);
        colorTex.colorSpace = THREE.SRGBColorSpace;
        colorTex.minFilter = THREE.LinearFilter;
        colorTex.magFilter = THREE.LinearFilter;

        const depthTex = new THREE.CanvasTexture(depthCanvas);
        depthTex.colorSpace = THREE.NoColorSpace;
        depthTex.minFilter = THREE.LinearFilter;
        depthTex.magFilter = THREE.LinearFilter;

        this.colorTextures[index] = colorTex;
        this.depthTextures[index] = depthTex;

        // Immediately bind the primary Iron Man shape (index 0: ironman_shape_8d198236.jpg)
        if (index === 0) {
          this.applyTextureIndex(0);
        }
      };
      img.src = srcPath;
    });
  }

  private applyTextureIndex(idx: number) {
    // Keep /assets/aistudio/ironman_shape_8d198236.jpg (index 0) as the primary 3D sculpt shape
    const targetIdx = 0;
    this.activeTexIdx = idx;
    const cTex = this.colorTextures[targetIdx];
    const dTex = this.depthTextures[targetIdx];

    this.reliefMat.uniforms.uColorMap.value = cTex;
    this.reliefMat.uniforms.uDepthMap.value = dTex;

    this.wireframeMat.uniforms.uColorMap.value = cTex;
    this.wireframeMat.uniforms.uDepthMap.value = dTex;

    this.rearEchoMat.uniforms.uColorMap.value = cTex;
    this.rearEchoMat.uniforms.uDepthMap.value = dTex;
  }

  private buildFloatingCadSatellites() {
    const configs = [
      { pos: new THREE.Vector3(4.35, 1.45, 2.2), scale: 0.62 },
      { pos: new THREE.Vector3(-0.35, 1.55, 2.5), scale: 0.52 },
      { pos: new THREE.Vector3(4.15, -1.65, 2.7), scale: 0.56 },
      { pos: new THREE.Vector3(-0.15, -1.85, 2.4), scale: 0.46 },
    ];

    configs.forEach((cfg, idx) => {
      const satGroup = new THREE.Group();

      const ring1 = new THREE.LineSegments(
        new THREE.EdgesGeometry(
          new THREE.CylinderGeometry(
            0.62 * cfg.scale,
            0.62 * cfg.scale,
            0.16 * cfg.scale,
            16
          )
        ),
        this.cyanNeonEdgeMat
      );
      satGroup.add(ring1);

      const ring2 = new THREE.LineSegments(
        new THREE.EdgesGeometry(
          new THREE.TorusGeometry(0.4 * cfg.scale, 0.05 * cfg.scale, 6, 16)
        ),
        idx % 2 === 0 ? this.brightBlueEdgeMat : this.coralTelemetryEdgeMat
      );
      ring2.rotation.x = Math.PI * 0.35;
      satGroup.add(ring2);

      satGroup.position.copy(cfg.pos);
      this.group.add(satGroup);

      this.hudSatellites.push({
        group: satGroup,
        basePos: cfg.pos.clone(),
        scatterOffset: new THREE.Vector3(
          (idx % 2 === 0 ? 1 : -1) * (3.5 + idx * 0.8),
          -4.5 - idx * 1.1,
          -6.5 - idx * 1.4
        ),
        rotSpeed: new THREE.Vector3(
          0.35 + idx * 0.08,
          0.48 - idx * 0.06,
          0.25 + idx * 0.05
        ),
        phase: idx * 1.4,
      });
    });
  }

  public update(
    elapsedTime: number,
    state: CinematicState,
    overrides: DirectorOverrides,
    pointerX: number,
    pointerY: number,
    isPortrait: boolean
  ) {
    const reveal = THREE.MathUtils.clamp(state.aboutRevealProgress, 0, 1);
    this.group.visible = reveal > 0.004;
    if (!this.group.visible) return;

    const easedReveal = 1.0 - Math.pow(1.0 - reveal, 3.0);
    const scatterFactor = 1.0 - easedReveal;

    // Position the 3D Iron Man Blue Neon Hologram on the right side of the About Section
    const baseX = isPortrait ? 0.0 : 2.15;
    const baseY = isPortrait ? 0.95 : 0.06;
    const baseZ = isPortrait ? 2.65 : 3.85;

    const floatY = overrides.reducedMotion
      ? 0
      : Math.sin(elapsedTime * 1.35) * 0.08;
    const floatX = overrides.reducedMotion
      ? 0
      : Math.cos(elapsedTime * 0.9) * 0.04;

    this.monolithPivot.position.set(
      baseX + floatX + scatterFactor * 2.4 + pointerX * 0.18,
      baseY + floatY - scatterFactor * 4.2 + pointerY * 0.14,
      baseZ - scatterFactor * 7.5
    );

    const baseScale = (isPortrait ? 0.78 : 1.0) * (0.25 + easedReveal * 0.75);

    // Clamp yaw rotation to a comfortable 3D relief viewing arc (-38 deg to +38 deg)
    // so the 2.5D/3D volumetric relief bust always faces the viewer heroically!
    const clampedUserYaw = Math.sin(state.aboutRockUserYaw) * 0.56;
    const targetRotY =
      -0.12 +
      (state.aboutChapterProgress - 1.0) * 0.16 +
      clampedUserYaw +
      pointerX * 0.24 +
      (overrides.reducedMotion ? 0 : Math.sin(elapsedTime * 0.55) * 0.06) +
      scatterFactor * 0.85;

    const targetRotX =
      0.03 +
      state.aboutRockUserPitch * 0.55 -
      pointerY * 0.14 +
      (overrides.reducedMotion ? 0 : Math.cos(elapsedTime * 0.5) * 0.035) +
      scatterFactor * 0.35;

    const rotVelocity = Math.min(
      1.0,
      Math.abs(state.aboutRockUserYaw - this.dampedRotY) * 1.8 +
        Math.abs(targetRotY - this.dampedRotY) * 2.4
    );
    this.dampedRotY = THREE.MathUtils.lerp(this.dampedRotY, targetRotY, 0.15);
    this.dampedRotX = THREE.MathUtils.lerp(this.dampedRotX, targetRotX, 0.15);

    this.monolithPivot.scale.setScalar(
      baseScale * (1.0 + rotVelocity * 0.055)
    );
    this.monolithPivot.rotation.set(
      this.dampedRotX,
      this.dampedRotY,
      Math.sin(elapsedTime * 0.5) * 0.015 - rotVelocity * 0.04
    );

    // Spin the calibrated 3D Arc Reactor ring on Iron Man's chest
    const spinSpeed = overrides.reducedMotion ? 0.2 : 1.0 + rotVelocity * 4.0;
    this.arcInnerSpinGroup.rotation.z = -elapsedTime * 1.15 * spinSpeed;
    const arcPulse =
      1.0 + 0.06 * Math.sin(elapsedTime * 4.5) + rotVelocity * 0.18;
    this.arcReactor3DGroup.scale.setScalar(arcPulse);

    const dt = Math.min(0.1, Math.max(0.001, elapsedTime - this.lastElapsedTime));
    this.lastElapsedTime = elapsedTime;

    // Trigger 3D Concentric Ripple & Zigzag Wave whenever active slide index changes
    const currentSlideIdx = Math.min(2, Math.max(0, Math.round(state.aboutChapterProgress)));
    if (currentSlideIdx !== this.lastSlideIndex && reveal > 0.35) {
      this.lastSlideIndex = currentSlideIdx;
      this.slideWaveEnergy = 1.0;
    }
    if (this.slideWaveEnergy > 0.0) {
      this.slideWaveEnergy = Math.max(0.0, this.slideWaveEnergy - dt * 1.85);
    }

    // Update 3D Relief & Wireframe Shaders
    const effectiveDepth = 1.08 * overrides.reliefMultiplier;
    this.reliefMat.uniforms.uTime.value = elapsedTime;
    this.reliefMat.uniforms.uOpacity.value = easedReveal;
    this.reliefMat.uniforms.uDepthStrength.value = effectiveDepth;
    this.reliefMat.uniforms.uPulseBoost.value = rotVelocity;
    this.reliefMat.uniforms.uSlideWave.value = this.slideWaveEnergy;

    this.wireframeMat.uniforms.uTime.value = elapsedTime;
    this.wireframeMat.uniforms.uDepthStrength.value = effectiveDepth + 0.02;
    this.wireframeMat.uniforms.uPulseBoost.value = rotVelocity;
    this.wireframeMat.uniforms.uSlideWave.value = this.slideWaveEnergy;
    this.wireframeMat.uniforms.uOpacity.value = overrides.showWireframeOverlay
      ? 0.65 * easedReveal
      : (0.26 + rotVelocity * 0.28 + this.slideWaveEnergy * 0.35) * easedReveal;

    this.rearEchoMat.uniforms.uTime.value = elapsedTime;
    this.rearEchoMat.uniforms.uSlideWave.value = this.slideWaveEnergy;
    this.rearEchoMat.uniforms.uOpacity.value =
      (0.34 + rotVelocity * 0.22 + this.slideWaveEnergy * 0.25) * easedReveal;

    // Dynamic Neon Point Lights
    this.arcReactorLight.intensity =
      (5.5 + rotVelocity * 3.2) * arcPulse * easedReveal;
    this.helmetNeonLight.intensity = (4.5 + rotVelocity * 2.4) * easedReveal;

    // Update Floating 3D CAD Schematic Rings
    for (let i = 0; i < this.hudSatellites.length; i++) {
      const sat = this.hudSatellites[i];
      const bob = overrides.reducedMotion
        ? 0
        : Math.sin(elapsedTime * 1.5 + sat.phase) * 0.14;

      sat.group.position.set(
        sat.basePos.x + sat.scatterOffset.x * scatterFactor + pointerX * 0.12,
        sat.basePos.y +
          bob +
          sat.scatterOffset.y * scatterFactor +
          pointerY * 0.1,
        sat.basePos.z + sat.scatterOffset.z * scatterFactor
      );
      sat.group.scale.setScalar(easedReveal);
      sat.group.rotation.x = elapsedTime * sat.rotSpeed.x;
      sat.group.rotation.y =
        elapsedTime * sat.rotSpeed.y + state.aboutChapterProgress * 0.6;
      sat.group.rotation.z = elapsedTime * sat.rotSpeed.z;
    }

    // Update Diagonal Stream of 460 Glowing Blue Neon Holographic Data Voxels
    const motionMult = overrides.reducedMotion ? 0.05 : 1.0;
    for (let i = 0; i < this.voxelCount; i++) {
      const d = this.voxelData[i];
      const curT = (d.t + elapsedTime * d.speed * motionMult) % 1.0;

      const streamX = (curT - 0.5) * 14.8;
      const streamY =
        (curT - 0.5) * 3.8 +
        Math.sin(curT * Math.PI * 2.0 + elapsedTime * 0.5) * 0.36 +
        d.spreadY;
      const streamZ =
        2.5 + Math.cos((curT - 0.62) * Math.PI * 2.2) * 1.35 + d.spreadZ;

      _tempPos.set(
        streamX + d.scatterVec.x * scatterFactor + pointerX * 0.22,
        streamY + d.scatterVec.y * scatterFactor + pointerY * 0.15,
        streamZ + d.scatterVec.z * scatterFactor
      );

      _dummyObj.position.copy(_tempPos);
      _dummyObj.scale.setScalar(d.scale * easedReveal);
      _dummyObj.quaternion.setFromAxisAngle(
        d.rotAxis,
        elapsedTime * d.rotSpeed * motionMult + i
      );
      _dummyObj.updateMatrix();
      this.voxelInstancedMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    this.voxelInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose() {
    this.disposed = true;
    this.reliefMat.dispose();
    this.wireframeMat.dispose();
    this.rearEchoMat.dispose();
    this.cyanNeonEdgeMat.dispose();
    this.brightBlueEdgeMat.dispose();
    this.coralTelemetryEdgeMat.dispose();
    this.voxelMat.dispose();

    const uniqueColors = new Set(this.colorTextures);
    uniqueColors.forEach((t) => t.dispose());

    const uniqueDepths = new Set(this.depthTextures);
    uniqueDepths.forEach((t) => t.dispose());

    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
      }
    });
  }
}
