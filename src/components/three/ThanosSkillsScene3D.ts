import * as THREE from 'three';
import { CinematicState, DirectorOverrides } from '../../types/cinematic';

export const THANOS_THRONE_IMAGE_PATH =
  '/assets/aistudio/Thanos-Chair-Throne_8d611bb4.jpg';

export const INFINITY_STONE_COLORS = [
  '#c084fc', // 0: Power Stone (Purple)
  '#38bdf8', // 1: Space Stone (Blue)
  '#f43f5e', // 2: Reality Stone (Crimson Red)
  '#34d399', // 3: Time Stone (Emerald Green)
  '#facc15', // 4: Mind Stone (Gold Yellow)
  '#fb923c', // 5: Soul Stone (Amber Orange)
] as const;

interface AsteroidOrbiterData {
  angle: number;
  radiusX: number;
  radiusZ: number;
  yOffset: number;
  orbitSpeed: number;
  scale: number;
  rotAxis: THREE.Vector3;
  rotSpeed: number;
}

const _dummyObj = new THREE.Object3D();
const _stoneColorTarget = new THREE.Color('#ef4444');

function fract(x: number): number {
  return x - Math.floor(x);
}

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return fract(n);
}

function smoothBox(
  u: number,
  v: number,
  uMin: number,
  uMax: number,
  vMin: number,
  vMax: number,
  feather = 0.025
): number {
  const ux =
    THREE.MathUtils.smoothstep(u, uMin - feather, uMin + feather) *
    (1.0 - THREE.MathUtils.smoothstep(u, uMax - feather, uMax + feather));
  const vy =
    THREE.MathUtils.smoothstep(v, vMin - feather, vMin + feather) *
    (1.0 - THREE.MathUtils.smoothstep(v, vMax - feather, vMax + feather));
  return ux * vy;
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
 * Computes the exact silhouette mask and 3D anatomical/architectural depth relief (0..1)
 * for Thanos sitting in his hovering Space Chair Throne in Thanos-Chair-Throne_8d611bb4.jpg.
 * Note: u in [0..1] across the central square crop of Thanos-Chair-Throne_8d611bb4.jpg,
 * where u=0.5 is horizontal center and v=0 is bottom, v=1 is top.
 */
function computeThanosThroneMaskAndDepth(
  u: number,
  v: number,
  r: number,
  g: number,
  b: number
): { mask: number; depth: number; thrusterGlow: number } {
  // 1. Twin Upper Stone Throne Backrest Horns & Center Backrest
  const leftBackHorn = smoothBox(u, v, 0.365, 0.455, 0.64, 0.955, 0.022);
  const rightBackHorn = smoothBox(u, v, 0.545, 0.635, 0.64, 0.945, 0.022);
  const midBackrest = smoothBox(u, v, 0.375, 0.625, 0.60, 0.855, 0.025);
  const backrestMask = Math.max(leftBackHorn, rightBackHorn, midBackrest);

  // 2. Thanos Helmeted Head & Shoulders / Chest Armor
  const headDome = gaussian2D(u, v, 0.498, 0.705, 0.055, 0.085);
  const torsoShoulders = gaussian2D(u, v, 0.50, 0.565, 0.21, 0.125);
  const chestPlate = gaussian2D(u, v, 0.50, 0.55, 0.14, 0.10);

  // 3. Left & Right Hovering Stone Armrests + Thanos's Gauntleted Hands + Underside Thruster Plumes
  const leftArmrest = gaussian2D(u, v, 0.255, 0.535, 0.095, 0.085);
  const rightArmrest = gaussian2D(u, v, 0.745, 0.525, 0.095, 0.085);
  const leftForearm = gaussian2D(u, v, 0.32, 0.585, 0.09, 0.065);
  const rightForearm = gaussian2D(u, v, 0.68, 0.575, 0.09, 0.065);

  // 4. Seated Armored Legs, Knees & Boots (projecting furthest forward in 3D space!)
  const leftLegKnee = gaussian2D(u, v, 0.395, 0.365, 0.075, 0.155);
  const rightLegKnee = gaussian2D(u, v, 0.605, 0.365, 0.075, 0.155);
  const pelvisSeat = smoothBox(u, v, 0.33, 0.67, 0.23, 0.52, 0.035);

  // 5. Sculpted Floating Stone Throne Pedestal & Tapered Bottom Keel
  const pedestalPlatform = smoothBox(u, v, 0.285, 0.71, 0.12, 0.25, 0.028);
  const lowerKeel = gaussian2D(u, v, 0.498, 0.095, 0.13, 0.085);

  const rawShape = Math.max(
    backrestMask * 0.95,
    THREE.MathUtils.smoothstep(headDome, 0.18, 0.52),
    THREE.MathUtils.smoothstep(torsoShoulders, 0.22, 0.52),
    THREE.MathUtils.smoothstep(leftArmrest, 0.2, 0.52),
    THREE.MathUtils.smoothstep(rightArmrest, 0.2, 0.52),
    THREE.MathUtils.smoothstep(leftForearm, 0.22, 0.55),
    THREE.MathUtils.smoothstep(rightForearm, 0.22, 0.55),
    THREE.MathUtils.smoothstep(leftLegKnee, 0.18, 0.48),
    THREE.MathUtils.smoothstep(rightLegKnee, 0.18, 0.48),
    pelvisSeat,
    pedestalPlatform,
    THREE.MathUtils.smoothstep(lowerKeel, 0.22, 0.55)
  );

  // Detect bright blue hover-thruster jets under the armrests and base (where blue > red * 1.35)
  const blueDominance = Math.max(0, b - r * 0.85);
  const isThrusterZone =
    (v > 0.08 && v < 0.20 && u > 0.30 && u < 0.70) ||
    (v > 0.26 && v < 0.56 && (u < 0.38 || u > 0.62));
  const thrusterGlow = isThrusterZone
    ? THREE.MathUtils.clamp(blueDominance * 2.2, 0, 1)
    : 0;

  // Reject background red/crimson galaxy nebula around the outer silhouette edges
  const redNebulaExcess = Math.max(0, r - Math.max(g, b) * 1.18);
  const edgeRejection = rawShape < 0.78 ? redNebulaExcess * 1.85 : 0.0;
  const mask = THREE.MathUtils.clamp(
    rawShape - edgeRejection + thrusterGlow * 0.85,
    0,
    1
  );

  // 3D Depth Relief Hierarchy (0 = recessed backrest, 1 = forward knees, boots & armrests)
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const depth = THREE.MathUtils.clamp(
    backrestMask * 0.44 +
      chestPlate * 0.38 +
      THREE.MathUtils.smoothstep(headDome, 0.1, 0.8) * 0.42 +
      THREE.MathUtils.smoothstep(leftArmrest + rightArmrest, 0.15, 0.8) * 0.52 +
      THREE.MathUtils.smoothstep(leftLegKnee + rightLegKnee, 0.15, 0.8) * 0.56 +
      pedestalPlatform * 0.46 +
      luma * 0.22,
    0,
    1
  );

  return { mask, depth, thrusterGlow };
}

/**
 * Screen 3 (MY SKILLS Section):
 * 1. Extracts ONLY the cosmic galaxy nebula from Thanos-Chair-Throne_8d611bb4.jpg for the 3D background galaxy dome.
 * 2. Sculpts Thanos sitting on his Space Chair Throne into an interactive 3D object in the center of the screen
 *    (slightly back in 3D space) that hovers and moves in mid-air with glowing blue plasma thrusters.
 * 3. Renders the 3D Reality Stone Crimson Aether Transition Wave between About and MY SKILLS.
 */
export class ThanosSkillsScene3DSystem {
  public readonly group: THREE.Group;
  public readonly galaxyDomeGroup: THREE.Group;
  public readonly thronePivot: THREE.Group;

  // 1. 3D Background Galaxy Sky Dome (using ONLY the galaxy part of Thanos-Chair-Throne.jpg)
  private galaxySkyMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private galaxySkyMat: THREE.ShaderMaterial;

  // 2. 3D Hovering Thanos Chair Throne (center of screen, slightly back in 3D space)
  private throneFrontMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private throneBackShellMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private throneMat: THREE.ShaderMaterial;
  private throneBackMat: THREE.ShaderMaterial;

  // 3D Animated Blue Plasma Hover-Thruster Plumes attached beneath the Chair Throne
  private thrusterPlumesGroup: THREE.Group;
  private thrusterPlumeMat: THREE.ShaderMaterial;
  private thrusterLightBottom: THREE.PointLight;
  private thrusterLightLeft: THREE.PointLight;
  private thrusterLightRight: THREE.PointLight;
  private cosmicRimLight: THREE.PointLight;

  // 3. 3D Orbiting Cosmic Asteroid Belt in the Galaxy Background
  private asteroidInstancedMesh: THREE.InstancedMesh;
  private asteroidMat: THREE.MeshStandardMaterial;
  private asteroidData: AsteroidOrbiterData[] = [];
  private readonly asteroidCount: number;

  // Textures
  private galaxyOnlyTex: THREE.Texture;
  private throneColorTex: THREE.Texture;
  private throneDepthTex: THREE.Texture;

  private dampedRotY = 0.0;
  private dampedRotX = 0.04;
  private disposed = false;

  constructor(isSoftwareGl: boolean) {
    this.group = new THREE.Group();
    this.group.visible = false;

    this.galaxyDomeGroup = new THREE.Group();
    this.group.add(this.galaxyDomeGroup);

    this.thronePivot = new THREE.Group();
    // Centered horizontally and placed slightly back in 3D space as requested
    this.thronePivot.position.set(0.0, 0.04, 1.85);
    this.group.add(this.thronePivot);

    const placeholders = this.createPlaceholderTextures();
    this.galaxyOnlyTex = placeholders.galaxyTex;
    this.throneColorTex = placeholders.throneTex;
    this.throneDepthTex = placeholders.depthTex;

    // =========================================================================
    // 1. 3D PANORAMIC GALAXY BACKGROUND DOME (ONLY THE GALAXY PART)
    // =========================================================================
    this.galaxySkyMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uGalaxyMap: { value: this.galaxyOnlyTex },
        uTime: { value: 0 },
        uOpacity: { value: 0.0 },
        uStoneAccent: { value: new THREE.Color('#ef4444') },
        uStoneBlend: { value: 0.0 },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          vUv = uv;
          vec3 pos = position;
          // Wrap the 3D galaxy background into a deep concave cosmic amphitheater dome
          float nx = (uv.x - 0.5) * 2.0;
          float ny = (uv.y - 0.5) * 2.0;
          pos.z -= (1.0 - (nx * nx * 0.65 + ny * ny * 0.35)) * 3.6;
          pos.z += sin(uv.x * 6.0 + uTime * 0.35) * 0.18;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uGalaxyMap;
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uStoneAccent;
        uniform float uStoneBlend;

        varying vec2 vUv;

        void main() {
          if (uOpacity < 0.01) discard;

          // Subtle cosmic nebula drift & starfield shimmer
          vec2 driftedUv = vUv + vec2(
            sin(vUv.y * 8.0 + uTime * 0.22) * 0.004,
            cos(vUv.x * 8.0 + uTime * 0.18) * 0.004
          );
          vec4 galCol = texture2D(uGalaxyMap, clamp(driftedUv, 0.01, 0.99));

          // Star twinkle enhancement on bright star pixels
          float starLuma = max(galCol.r, max(galCol.g, galCol.b));
          float twinkle = 0.85 + 0.35 * sin(uTime * 3.8 + vUv.x * 140.0 + vUv.y * 95.0);
          vec3 nebCol = galCol.rgb * (1.0 + smoothstep(0.65, 0.95, starLuma) * twinkle * 0.5);

          // Optional Infinity Stone resonance tint across the galaxy nebula
          nebCol = mix(nebCol, nebCol * (0.65 + uStoneAccent * 0.85), uStoneBlend * 0.38);

          // Soft vignette at dome edges
          vec2 d = (vUv - 0.5) * 2.0;
          float vig = 1.0 - smoothstep(0.65, 1.15, length(d * vec2(0.85, 0.95)));

          gl_FragColor = vec4(nebCol * vig * 1.15, uOpacity);
        }
      `,
    });

    const galaxyDomeGeo = new THREE.PlaneGeometry(29.0, 17.5, 48, 32);
    this.galaxySkyMesh = new THREE.Mesh(galaxyDomeGeo, this.galaxySkyMat);
    this.galaxySkyMesh.position.set(0, 0.15, -4.6);
    this.galaxyDomeGroup.add(this.galaxySkyMesh);

    // =========================================================================
    // 2. 3D HOVERING THANOS & SPACE CHAIR THRONE RIG (CENTER OF SCREEN)
    // =========================================================================
    const throneSharedVertex = `
      uniform sampler2D uDepthMap;
      uniform float uDepthStrength;
      uniform float uCurveStrength;
      uniform float uLayerOffsetZ;
      uniform float uTime;

      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying vec4 vMask;

      void main() {
        vUv = uv;
        vec4 mask = texture2D(uDepthMap, uv);
        vMask = mask;

        float relief = mask.r;
        float silhouette = mask.g;
        float thruster = mask.b;

        // Cylindrical 3D wrap for the stone throne & Thanos's seated armor
        float centeredX = (uv.x - 0.5) * 1.65;
        float throneArc = cos(centeredX) * uCurveStrength * silhouette;

        vec3 pos = position;
        pos.z += relief * uDepthStrength + throneArc + uLayerOffsetZ;

        // Subtle breathing & thruster vibration in mid-air
        float thrusterPulse = sin(uTime * 16.0 + uv.x * 24.0) * 0.018 * thruster;
        pos.y += thrusterPulse;

        // Perturb 3D surface normals from the depth relief map for realistic 3D lighting on rotation
        float texel = 1.0 / 512.0;
        float dRight = texture2D(uDepthMap, uv + vec2(texel, 0.0)).r;
        float dUp = texture2D(uDepthMap, uv + vec2(0.0, texel)).r;
        vec3 localNormal = normalize(vec3(
          (relief - dRight) * uDepthStrength * 4.5 + sin(centeredX) * 0.35 * silhouette,
          (relief - dUp) * uDepthStrength * 4.5,
          1.0
        ));

        vNormal = normalize(normalMatrix * localNormal);
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        vViewPos = -mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `;

    this.throneMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      uniforms: {
        uColorMap: { value: this.throneColorTex },
        uDepthMap: { value: this.throneDepthTex },
        uDepthStrength: { value: 1.18 },
        uCurveStrength: { value: 0.42 },
        uLayerOffsetZ: { value: 0.0 },
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uHoverBoost: { value: 0.0 },
        uRimColor: { value: new THREE.Color('#38bdf8') },
        uStoneRimColor: { value: new THREE.Color('#c084fc') },
      },
      vertexShader: throneSharedVertex,
      fragmentShader: `
        uniform sampler2D uColorMap;
        uniform float uTime;
        uniform float uOpacity;
        uniform float uHoverBoost;
        uniform vec3 uRimColor;
        uniform vec3 uStoneRimColor;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying vec4 vMask;

        void main() {
          float relief = vMask.r;
          float silhouette = vMask.g;
          float thruster = vMask.b;

          if (silhouette < 0.04 || uOpacity < 0.01) discard;

          vec4 tex = texture2D(uColorMap, vUv);
          vec3 col = tex.rgb;

          // 3D Fresnel specular rim lighting on Thanos's golden armor & dark stone throne
          vec3 viewDir = normalize(vViewPos);
          float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.2);

          vec3 rimTint = mix(uStoneRimColor, uRimColor, smoothstep(0.25, 0.75, 1.0 - vUv.y));
          col += rimTint * fresnel * (0.45 + uHoverBoost * 0.45);

          // Living blue plasma glow on the chair's underside hover-thrusters
          float jetFlicker = 0.85 + 0.35 * sin(uTime * 18.0 + vUv.x * 30.0);
          col += vec3(0.15, 0.78, 1.0) * thruster * jetFlicker * (0.95 + uHoverBoost * 0.6);

          float alpha = smoothstep(0.04, 0.24, silhouette) * uOpacity;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    // Rear 3D Stone Throne Volume Shell (gives the floating chair solid 3D thickness when rotated)
    this.throneBackMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
      uniforms: {
        uColorMap: { value: this.throneColorTex },
        uDepthMap: { value: this.throneDepthTex },
        uDepthStrength: { value: 0.55 },
        uCurveStrength: { value: 0.22 },
        uLayerOffsetZ: { value: -0.28 },
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
      },
      vertexShader: throneSharedVertex,
      fragmentShader: `
        uniform sampler2D uColorMap;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec4 vMask;

        void main() {
          float silhouette = vMask.g;
          if (silhouette < 0.08 || uOpacity < 0.01) discard;
          vec4 tex = texture2D(uColorMap, vUv);
          float alpha = smoothstep(0.08, 0.32, silhouette) * uOpacity * 0.92;
          gl_FragColor = vec4(tex.rgb * 0.38, alpha);
        }
      `,
    });

    const throneSegs = isSoftwareGl ? 110 : 176;
    const throneGeo = new THREE.PlaneGeometry(5.15, 5.35, throneSegs, throneSegs);
    this.throneFrontMesh = new THREE.Mesh(throneGeo, this.throneMat);
    this.thronePivot.add(this.throneFrontMesh);

    const backSegs = isSoftwareGl ? 64 : 96;
    const backGeo = new THREE.PlaneGeometry(5.15, 5.35, backSegs, backSegs);
    this.throneBackShellMesh = new THREE.Mesh(backGeo, this.throneBackMat);
    this.thronePivot.add(this.throneBackShellMesh);

    // =========================================================================
    // 3. 3D ANIMATED BLUE PLASMA HOVER-THRUSTER PLUMES UNDER THE CHAIR
    // =========================================================================
    this.thrusterPlumesGroup = new THREE.Group();
    this.thronePivot.add(this.thrusterPlumesGroup);

    this.thrusterPlumeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 1.0 },
        uThrustIntensity: { value: 1.0 },
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
        uniform float uOpacity;
        uniform float uThrustIntensity;
        varying vec2 vUv;

        void main() {
          // Cone flame tapering downward from vUv.y = 1 (nozzle) to vUv.y = 0 (tip)
          float radial = 1.0 - abs(vUv.x - 0.5) * 2.0;
          float flameCore = pow(max(0.0, radial), 1.8) * pow(vUv.y, 0.85);
          float flicker = 0.82 + 0.28 * sin(uTime * 24.0 - vUv.y * 14.0);

          vec3 col = mix(vec3(0.02, 0.55, 1.0), vec3(0.88, 0.98, 1.0), pow(flameCore, 1.6));
          float alpha = flameCore * flicker * uThrustIntensity * uOpacity * 0.85;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    this.buildChairThrusterNozzles();

    // Dynamic Thruster & Cosmic Rim Point Lights
    this.thrusterLightBottom = new THREE.PointLight('#00f2fe', 5.2, 8.5);
    this.thrusterLightBottom.position.set(0, -2.05, 1.25);
    this.thronePivot.add(this.thrusterLightBottom);

    this.thrusterLightLeft = new THREE.PointLight('#38bdf8', 3.6, 6.5);
    this.thrusterLightLeft.position.set(-1.35, -0.05, 1.15);
    this.thronePivot.add(this.thrusterLightLeft);

    this.thrusterLightRight = new THREE.PointLight('#38bdf8', 3.6, 6.5);
    this.thrusterLightRight.position.set(1.35, -0.05, 1.15);
    this.thronePivot.add(this.thrusterLightRight);

    this.cosmicRimLight = new THREE.PointLight('#ef4444', 4.5, 11.0);
    this.cosmicRimLight.position.set(0, 1.8, -0.5);
    this.thronePivot.add(this.cosmicRimLight);

    // =========================================================================
    // 4. 3D FLOATING ASTEROID BELT IN THE GALAXY BACKGROUND
    // =========================================================================
    this.asteroidCount = isSoftwareGl ? 90 : 180;
    const astGeo = new THREE.DodecahedronGeometry(0.11, 0);
    this.asteroidMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#271c2b'),
      roughness: 0.78,
      metalness: 0.25,
      flatShading: true,
    });

    this.asteroidInstancedMesh = new THREE.InstancedMesh(
      astGeo,
      this.asteroidMat,
      this.asteroidCount
    );
    this.asteroidInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < this.asteroidCount; i++) {
      const angle = (i / this.asteroidCount) * Math.PI * 2;
      const radiusX = 4.2 + hash3(i, 1.2, 3.4) * 5.8;
      const radiusZ = 2.2 + hash3(i, 5.6, 7.8) * 3.8;
      const yOffset = (hash3(i, 9.1, 2.3) - 0.5) * 5.6;
      const scale = 0.45 + Math.pow(hash3(i, 4.5, 6.7), 2.0) * 2.1;

      this.asteroidData.push({
        angle,
        radiusX,
        radiusZ,
        yOffset,
        orbitSpeed: 0.04 + hash3(i, 3.1, 8.2) * 0.06,
        scale,
        rotAxis: new THREE.Vector3(
          hash3(i, 2.1, 5.4) - 0.5,
          hash3(i, 7.2, 1.9) - 0.5,
          hash3(i, 4.8, 6.3) - 0.5
        ).normalize(),
        rotSpeed: 0.35 + hash3(i, 8.4, 2.7) * 0.9,
      });
    }
    this.group.add(this.asteroidInstancedMesh);

    // 5. Load Thanos-Chair-Throne_8d611bb4.jpg and split into:
    //    (a) 3D Background Galaxy Texture (throne removed)
    //    (b) 3D Hovering Thanos Chair Throne Texture + 3D Depth Map
    this.loadAndSplitThanosGalaxyAndThrone();
  }

  private buildChairThrusterNozzles() {
    // Positions calibrated to the glowing blue hover-jets in Thanos-Chair-Throne_8d611bb4.jpg
    const nozzles = [
      // Left & right armrest hover-thrusters
      { x: -1.32, y: -0.02, z: 0.72, scaleX: 0.24, scaleY: 0.48, rotZ: -0.15 },
      { x: -1.16, y: -0.14, z: 0.68, scaleX: 0.18, scaleY: 0.42, rotZ: -0.12 },
      { x: 1.32, y: -0.06, z: 0.72, scaleX: 0.24, scaleY: 0.48, rotZ: 0.15 },
      { x: 1.18, y: -0.18, z: 0.68, scaleX: 0.18, scaleY: 0.42, rotZ: 0.12 },
      // Mid-side stabilizer jet
      { x: -0.92, y: -0.96, z: 0.62, scaleX: 0.22, scaleY: 0.44, rotZ: -0.08 },
      // 4 Bottom Throne Base Main Hover-Thrusters
      { x: -0.68, y: -1.96, z: 0.66, scaleX: 0.26, scaleY: 0.56, rotZ: -0.12 },
      { x: -0.24, y: -2.06, z: 0.72, scaleX: 0.28, scaleY: 0.62, rotZ: -0.04 },
      { x: 0.26, y: -2.06, z: 0.72, scaleX: 0.28, scaleY: 0.62, rotZ: 0.04 },
      { x: 0.68, y: -1.94, z: 0.66, scaleX: 0.26, scaleY: 0.56, rotZ: 0.12 },
    ];

    const plumeGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
    nozzles.forEach((n) => {
      const m = new THREE.Mesh(plumeGeo, this.thrusterPlumeMat);
      m.position.set(n.x, n.y, n.z);
      m.scale.set(n.scaleX, n.scaleY, 1);
      m.rotation.z = n.rotZ;
      this.thrusterPlumesGroup.add(m);
    });
  }

  private createPlaceholderTextures() {
    const gCanvas = document.createElement('canvas');
    gCanvas.width = 128;
    gCanvas.height = 128;
    const gCtx = gCanvas.getContext('2d')!;
    const grad = gCtx.createRadialGradient(64, 64, 5, 64, 64, 64);
    grad.addColorStop(0, '#4c0519');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#040208');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 128, 128);
    const galaxyTex = new THREE.CanvasTexture(gCanvas);
    galaxyTex.colorSpace = THREE.SRGBColorSpace;

    const tCanvas = document.createElement('canvas');
    tCanvas.width = 128;
    tCanvas.height = 128;
    const throneTex = new THREE.CanvasTexture(tCanvas);
    throneTex.colorSpace = THREE.SRGBColorSpace;

    const dCanvas = document.createElement('canvas');
    dCanvas.width = 128;
    dCanvas.height = 128;
    const depthTex = new THREE.CanvasTexture(dCanvas);
    depthTex.colorSpace = THREE.NoColorSpace;

    return { galaxyTex, throneTex, depthTex };
  }

  private loadAndSplitThanosGalaxyAndThrone() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (this.disposed) return;

      // -----------------------------------------------------------------------
      // PART A: Build 3D Background Galaxy Texture (ONLY the galaxy part!)
      // Inpaints/fills the central throne region (x: 0.30..0.70) using the
      // surrounding crimson-violet cosmic nebula & stars from the left and right wings.
      // -----------------------------------------------------------------------
      const galW = 1024;
      const galH = 576;
      const srcGalCanvas = document.createElement('canvas');
      srcGalCanvas.width = galW;
      srcGalCanvas.height = galH;
      const srcGalCtx = srcGalCanvas.getContext('2d', {
        willReadFrequently: true,
      })!;
      srcGalCtx.drawImage(img, 0, 0, galW, galH);

      const galData = srcGalCtx.getImageData(0, 0, galW, galH);
      const gPx = galData.data;

      const outGalCanvas = document.createElement('canvas');
      outGalCanvas.width = galW;
      outGalCanvas.height = galH;
      const outGalCtx = outGalCanvas.getContext('2d')!;
      const outGalData = outGalCtx.createImageData(galW, galH);
      const gOut = outGalData.data;

      for (let y = 0; y < galH; y++) {
        const ny = y / galH;
        for (let x = 0; x < galW; x++) {
          const nx = x / galW;
          const idx = (y * galW + x) * 4;

          // Smooth bell mask over the center where Thanos's Throne sits (nx in 0.28..0.72)
          const centerDist = Math.abs(nx - 0.5) / 0.23;
          const inpaintWeight =
            1.0 - THREE.MathUtils.smoothstep(centerDist, 0.55, 1.0);

          if (inpaintWeight <= 0.001) {
            gOut[idx] = gPx[idx];
            gOut[idx + 1] = gPx[idx + 1];
            gOut[idx + 2] = gPx[idx + 2];
            gOut[idx + 3] = 255;
          } else {
            // Sample pure galaxy pixels from the left galaxy wing (0.04..0.26) and right galaxy wing (0.74..0.96)
            const t = (nx - 0.27) / 0.46; // 0..1 across center
            const leftSampleX = Math.min(
              galW - 1,
              Math.max(0, Math.floor((0.05 + (1.0 - t) * 0.21) * galW))
            );
            const rightSampleX = Math.min(
              galW - 1,
              Math.max(0, Math.floor((0.74 + t * 0.21) * galW))
            );
            const sampleY = Math.min(
              galH - 1,
              Math.max(
                0,
                Math.floor(
                  (ny + Math.sin(nx * 12.0 + ny * 6.0) * 0.025) * galH
                )
              )
            );

            const lIdx = (sampleY * galW + leftSampleX) * 4;
            const rIdx = (sampleY * galW + rightSampleX) * 4;

            const blendR = gPx[lIdx] * (1.0 - t) + gPx[rIdx] * t;
            const blendG = gPx[lIdx + 1] * (1.0 - t) + gPx[rIdx + 1] * t;
            const blendB = gPx[lIdx + 2] * (1.0 - t) + gPx[rIdx + 2] * t;

            gOut[idx] = Math.round(
              gPx[idx] * (1.0 - inpaintWeight) + blendR * inpaintWeight
            );
            gOut[idx + 1] = Math.round(
              gPx[idx + 1] * (1.0 - inpaintWeight) + blendG * inpaintWeight
            );
            gOut[idx + 2] = Math.round(
              gPx[idx + 2] * (1.0 - inpaintWeight) + blendB * inpaintWeight
            );
            gOut[idx + 3] = 255;
          }
        }
      }

      outGalCtx.putImageData(outGalData, 0, 0);
      const newGalaxyTex = new THREE.CanvasTexture(outGalCanvas);
      newGalaxyTex.colorSpace = THREE.SRGBColorSpace;
      newGalaxyTex.minFilter = THREE.LinearFilter;
      newGalaxyTex.magFilter = THREE.LinearFilter;
      this.galaxyOnlyTex.dispose();
      this.galaxyOnlyTex = newGalaxyTex;
      this.galaxySkyMat.uniforms.uGalaxyMap.value = newGalaxyTex;

      // -----------------------------------------------------------------------
      // PART B: Build 3D Hovering Thanos Chair Throne Texture + 3D Depth Map
      // Crops the central 48% width of Thanos-Chair-Throne_8d611bb4.jpg where
      // Thanos sits on his hovering throne so proportions are 1:1 un-stretched.
      // -----------------------------------------------------------------------
      const size = 512;
      const throneCanvas = document.createElement('canvas');
      throneCanvas.width = size;
      throneCanvas.height = size;
      const tCtx = throneCanvas.getContext('2d', {
        willReadFrequently: true,
      })!;

      const cropW = img.width * 0.48;
      const cropX = (img.width - cropW) * 0.5;
      tCtx.drawImage(img, cropX, 0, cropW, img.height, 0, 0, size, size);

      const tImgData = tCtx.getImageData(0, 0, size, size);
      const tPx = tImgData.data;

      const depthCanvas = document.createElement('canvas');
      depthCanvas.width = size;
      depthCanvas.height = size;
      const dCtx = depthCanvas.getContext('2d')!;
      const dImgData = dCtx.createImageData(size, size);
      const dOut = dImgData.data;

      for (let y = 0; y < size; y++) {
        const v = 1.0 - y / size;
        for (let x = 0; x < size; x++) {
          const u = x / size;
          const i = (y * size + x) * 4;

          const r = tPx[i] / 255;
          const g = tPx[i + 1] / 255;
          const b = tPx[i + 2] / 255;

          const { mask, depth, thrusterGlow } =
            computeThanosThroneMaskAndDepth(u, v, r, g, b);

          dOut[i] = Math.round(depth * 255); // R: 3D Z-Relief Depth
          dOut[i + 1] = Math.round(mask * 255); // G: Clean Throne & Thanos Silhouette
          dOut[i + 2] = Math.round(thrusterGlow * 255); // B: Underside Blue Plasma Thrusters
          dOut[i + 3] = 255;
        }
      }

      dCtx.putImageData(dImgData, 0, 0);

      const newThroneColorTex = new THREE.CanvasTexture(throneCanvas);
      newThroneColorTex.colorSpace = THREE.SRGBColorSpace;
      newThroneColorTex.minFilter = THREE.LinearFilter;
      newThroneColorTex.magFilter = THREE.LinearFilter;

      const newThroneDepthTex = new THREE.CanvasTexture(depthCanvas);
      newThroneDepthTex.colorSpace = THREE.NoColorSpace;
      newThroneDepthTex.minFilter = THREE.LinearFilter;
      newThroneDepthTex.magFilter = THREE.LinearFilter;

      this.throneColorTex.dispose();
      this.throneDepthTex.dispose();
      this.throneColorTex = newThroneColorTex;
      this.throneDepthTex = newThroneDepthTex;

      this.throneMat.uniforms.uColorMap.value = newThroneColorTex;
      this.throneMat.uniforms.uDepthMap.value = newThroneDepthTex;
      this.throneBackMat.uniforms.uColorMap.value = newThroneColorTex;
      this.throneBackMat.uniforms.uDepthMap.value = newThroneDepthTex;
    };

    img.src = THANOS_THRONE_IMAGE_PATH;
  }

  public update(
    elapsedTime: number,
    state: CinematicState,
    overrides: DirectorOverrides,
    pointerX: number,
    pointerY: number,
    isPortrait: boolean
  ) {
    const wipeProgress = THREE.MathUtils.clamp(
      Math.max(state.skillsRevealProgress, state.skillsTransitionProgress),
      0,
      1
    );

    this.group.visible = wipeProgress > 0.001;
    if (!this.group.visible) return;

    // Because Scene B is composited via the RealityStoneTransitionPass render target,
    // keep the 3D Galaxy & 3D Thanos Chair Throne at full opacity inside Scene B while
    // smoothly gliding the throne forward slightly as wipeProgress reaches 1.0.
    const easedReveal = 1.0;
    const entryGlide = 1.0 - THREE.MathUtils.smoothstep(wipeProgress, 0.0, 0.85);

    // 1. Update 3D Panoramic Galaxy Background Dome (ONLY the galaxy part)
    this.galaxySkyMat.uniforms.uTime.value = elapsedTime;
    this.galaxySkyMat.uniforms.uOpacity.value = 1.0;

    const stoneIdx = state.activeSkillStoneIndex;
    if (stoneIdx >= 0 && stoneIdx < INFINITY_STONE_COLORS.length) {
      _stoneColorTarget.set(INFINITY_STONE_COLORS[stoneIdx]);
      this.galaxySkyMat.uniforms.uStoneAccent.value.lerp(_stoneColorTarget, 0.12);
      this.galaxySkyMat.uniforms.uStoneBlend.value = THREE.MathUtils.lerp(
        this.galaxySkyMat.uniforms.uStoneBlend.value,
        1.0,
        0.1
      );
      this.cosmicRimLight.color.lerp(_stoneColorTarget, 0.15);
    } else {
      this.galaxySkyMat.uniforms.uStoneBlend.value = THREE.MathUtils.lerp(
        this.galaxySkyMat.uniforms.uStoneBlend.value,
        0.0,
        0.1
      );
      _stoneColorTarget.set('#ef4444');
      this.cosmicRimLight.color.lerp(_stoneColorTarget, 0.1);
    }

    // Subtle 3D galaxy parallax opposite to pointer movement for deep-space immersion
    this.galaxyDomeGroup.position.set(-pointerX * 0.45, -pointerY * 0.28, 0);
    this.galaxyDomeGroup.rotation.y = pointerX * 0.05;

    // 2. Update 3D Hovering Thanos Chair Throne (Center of screen, slightly back, moving by air!)
    const hoverY = overrides.reducedMotion
      ? 0
      : Math.sin(elapsedTime * 1.55) * 0.16 +
        Math.cos(elapsedTime * 3.1) * 0.035;
    const hoverX = overrides.reducedMotion
      ? 0
      : Math.sin(elapsedTime * 0.85) * 0.07;
    const hoverRoll = overrides.reducedMotion
      ? 0
      : Math.sin(elapsedTime * 1.1) * 0.032;

    const baseZ = isPortrait ? 1.15 : 1.95;
    this.thronePivot.position.set(
      hoverX + pointerX * 0.22,
      0.06 + hoverY - entryGlide * 0.45 + pointerY * 0.15,
      baseZ - entryGlide * 1.25
    );

    // Interactive 3D rotation (like Iron Man) clamped to a heroic seated viewing arc
    const clampedUserYaw = Math.sin(state.throneUserYaw) * 0.52;
    const targetRotY =
      clampedUserYaw +
      pointerX * 0.26 +
      (overrides.reducedMotion ? 0 : Math.sin(elapsedTime * 0.6) * 0.08);
    const targetRotX =
      0.04 +
      state.throneUserPitch * 0.5 -
      pointerY * 0.16 +
      (overrides.reducedMotion ? 0 : Math.cos(elapsedTime * 0.75) * 0.04);

    const rotVelocity = Math.min(
      1.0,
      Math.abs(targetRotY - this.dampedRotY) * 2.4
    );
    this.dampedRotY = THREE.MathUtils.lerp(this.dampedRotY, targetRotY, 0.14);
    this.dampedRotX = THREE.MathUtils.lerp(this.dampedRotX, targetRotX, 0.14);

    const throneScale =
      (isPortrait ? 0.76 : 0.94) *
      (0.88 + (1.0 - entryGlide) * 0.12) *
      (1.0 + rotVelocity * 0.05);
    this.thronePivot.scale.setScalar(throneScale);
    this.thronePivot.rotation.set(
      this.dampedRotX,
      this.dampedRotY,
      hoverRoll - rotVelocity * 0.04
    );

    // Thrust surges when the chair is ascending in mid-air or when the user spins it
    const upwardThrust = overrides.reducedMotion
      ? 1.0
      : 1.0 + Math.max(0, Math.cos(elapsedTime * 1.55)) * 0.45 + rotVelocity * 0.6;

    const effectiveDepth = 1.18 * overrides.reliefMultiplier;
    this.throneMat.uniforms.uTime.value = elapsedTime;
    this.throneMat.uniforms.uOpacity.value = easedReveal;
    this.throneMat.uniforms.uDepthStrength.value = effectiveDepth;
    this.throneMat.uniforms.uHoverBoost.value = rotVelocity;

    this.throneBackMat.uniforms.uTime.value = elapsedTime;
    this.throneBackMat.uniforms.uOpacity.value = easedReveal;

    this.thrusterPlumeMat.uniforms.uTime.value = elapsedTime;
    this.thrusterPlumeMat.uniforms.uOpacity.value = easedReveal;
    this.thrusterPlumeMat.uniforms.uThrustIntensity.value = upwardThrust;

    this.thrusterLightBottom.intensity = 5.2 * upwardThrust * easedReveal;
    this.thrusterLightLeft.intensity = 3.6 * upwardThrust * easedReveal;
    this.thrusterLightRight.intensity = 3.6 * upwardThrust * easedReveal;
    this.cosmicRimLight.intensity = (4.5 + rotVelocity * 2.5) * easedReveal;

    // 3. Update 3D Orbiting Cosmic Asteroid Belt
    const motionMult = overrides.reducedMotion ? 0.05 : 1.0;
    for (let i = 0; i < this.asteroidCount; i++) {
      const a = this.asteroidData[i];
      const curAngle = a.angle + elapsedTime * a.orbitSpeed * motionMult;

      const ax = Math.cos(curAngle) * a.radiusX + pointerX * 0.15;
      const ay =
        a.yOffset +
        Math.sin(elapsedTime * 0.9 + i) * 0.18 +
        pointerY * 0.12;
      const az = -1.2 + Math.sin(curAngle) * a.radiusZ;

      _dummyObj.position.set(ax, ay, az);
      _dummyObj.scale.setScalar(a.scale);
      _dummyObj.quaternion.setFromAxisAngle(
        a.rotAxis,
        elapsedTime * a.rotSpeed * motionMult + i
      );
      _dummyObj.updateMatrix();
      this.asteroidInstancedMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    this.asteroidInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose() {
    this.disposed = true;
    this.galaxySkyMat.dispose();
    this.throneMat.dispose();
    this.throneBackMat.dispose();
    this.thrusterPlumeMat.dispose();
    this.asteroidMat.dispose();
    this.galaxyOnlyTex.dispose();
    this.throneColorTex.dispose();
    this.throneDepthTex.dispose();

    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  }
}
