import * as THREE from 'three';
import { CinematicState, DirectorOverrides } from '../../types/cinematic';

export const GALACTUS_IMAGE_PATH =
  '/assets/aistudio/first-look-at-galactus-in-the-fantastic-four-first-steps-v0-k2lqh6l63k1f1_5d9ca92d.jpg';

const BUST_WIDTH = 7.6;
const BUST_HEIGHT = 7.25; // Matches 640x605 aspect ratio (~1.05)
const CYLINDER_CURVATURE = 0.38;
const NECK_PIVOT_Y = 0.42;
const NECK_PIVOT_Z = -0.32;

// Pre-allocated scratch vectors to prevent garbage collection in the animation loop
const _localLeftEye = new THREE.Vector3();
const _localRightEye = new THREE.Vector3();

export class GalactusCharacterRig {
  public readonly group: THREE.Group;
  public readonly armorGroup: THREE.Group;
  public readonly headPivotGroup: THREE.Group;

  // Distinct separated 2.5D relief meshes for true Head-Only Rotation
  public readonly headMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  public readonly torsoMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  // Calibrated UV coordinates of Galactus's glowing eyes on the supplied image
  public leftEyeUV = new THREE.Vector2(0.448, 0.608);
  public rightEyeUV = new THREE.Vector2(0.564, 0.608);

  private leftEyeDepthVal = 0.82;
  private rightEyeDepthVal = 0.82;

  // Head and Torso textures
  private headColorTex: THREE.Texture;
  private headDepthTex: THREE.Texture;
  private torsoColorTex: THREE.Texture;
  private torsoDepthTex: THREE.Texture;

  // Procedural celestial background armor elements
  private astrolabeOuter: THREE.Mesh;
  private astrolabeInner: THREE.Mesh;
  private chestReactorRing: THREE.Mesh;
  private leftMonolith: THREE.Mesh;
  private rightMonolith: THREE.Mesh;

  private disposed = false;

  constructor(maxAnisotropy: number) {
    this.group = new THREE.Group();

    // 1. Stationary Armor Group: Torso, chest medallion, pauldrons, astrolabes
    // Remains completely anchored facing front (rotation.y = 0)
    this.armorGroup = new THREE.Group();
    this.group.add(this.armorGroup);

    // 2. Rotating Head Pivot Group: Mounted at the cervical neck joint
    // Rotates smoothly from right angle (+0.78 rad) to front (0.0 rad) on scroll!
    this.headPivotGroup = new THREE.Group();
    this.headPivotGroup.position.set(0, NECK_PIVOT_Y, NECK_PIVOT_Z);
    this.group.add(this.headPivotGroup);

    // Initial procedural placeholder textures so frame 0 renders immediately
    const initialTex = this.createInitialTextures(maxAnisotropy);
    this.headColorTex = initialTex.initialColorTex;
    this.headDepthTex = initialTex.initialDepthTex;
    this.torsoColorTex = initialTex.initialColorTex;
    this.torsoDepthTex = initialTex.initialDepthTex;

    // 3. Build Head Mesh: Chin, face, eyes, visor, helmet tower, and horns
    // Geometry plane centered relative to headPivotGroup
    const headGeo = new THREE.PlaneGeometry(BUST_WIDTH, BUST_HEIGHT, 140, 140);
    const headMat = new THREE.ShaderMaterial({
      uniforms: {
        uColorMap: { value: this.headColorTex },
        uDepthMaskMap: { value: this.headDepthTex },
        uTime: { value: 0 },
        uDepthStrength: { value: 0.72 },
        uCylinderCurve: { value: CYLINDER_CURVATURE },
        uEyeGlow: { value: 0.12 },
        uRimIntensity: { value: 1.15 },
        uDimming: { value: 1.0 },
        uOpacity: { value: 1.0 },
        uHoloDissolve: { value: 0.0 },
        uLeftEyeUV: { value: this.leftEyeUV },
        uRightEyeUV: { value: this.rightEyeUV },
        uCosmicColorA: { value: new THREE.Color('#a855f7') }, // Purple
        uCosmicColorB: { value: new THREE.Color('#ec4899') }, // Electric Pink / Magenta
        uCosmicColorC: { value: new THREE.Color('#06b6d4') }, // Cosmic Cyan accent
      },
      vertexShader: `
        uniform sampler2D uDepthMaskMap;
        uniform float uDepthStrength;
        uniform float uCylinderCurve;
        uniform float uTime;
        uniform float uHoloDissolve;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying float vReliefDepth;
        varying vec4 vMaskData;

        void main() {
          vUv = uv;
          vec4 maskData = texture2D(uDepthMaskMap, uv);
          vMaskData = maskData;

          float relief = maskData.r;
          vReliefDepth = relief;

          // Anatomical head curve wrapping around the skull
          float horizCentered = (uv.x - 0.5) * 1.65;
          float cylArc = cos(horizCentered) * uCylinderCurve * maskData.a;

          vec3 displacedPos = position;
          displacedPos.z += relief * uDepthStrength + cylArc;

          // Subtle living cosmic pulse + holographic scanline lift during transition
          float breathe = sin(uTime * 1.4 + uv.y * 3.14159) * 0.015 * maskData.a;
          float holoWave = sin(uv.y * 42.0 - uTime * 10.0) * 0.16 * uHoloDissolve * maskData.a;
          displacedPos.z += breathe + holoWave;
          displacedPos.x += sin(uv.y * 90.0 + uTime * 18.0) * 0.045 * uHoloDissolve;

          // Dynamic surface normal perturbed by relief map for realistic 3D lighting as head turns
          float texel = 1.0 / 256.0;
          float dRight = texture2D(uDepthMaskMap, uv + vec2(texel, 0.0)).r;
          float dUp = texture2D(uDepthMaskMap, uv + vec2(0.0, texel)).r;
          vec3 localNormal = normalize(vec3(
            (relief - dRight) * uDepthStrength * 4.2 + sin(horizCentered) * 0.42,
            (relief - dUp) * uDepthStrength * 4.2,
            1.0
          ));

          vNormal = normalize(normalMatrix * localNormal);
          vec4 mvPosition = modelViewMatrix * vec4(displacedPos, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uColorMap;
        uniform sampler2D uDepthMaskMap;
        uniform float uTime;
        uniform float uEyeGlow;
        uniform float uRimIntensity;
        uniform float uDimming;
        uniform float uOpacity;
        uniform float uHoloDissolve;
        uniform vec2 uLeftEyeUV;
        uniform vec2 uRightEyeUV;
        uniform vec3 uCosmicColorA;
        uniform vec3 uCosmicColorB;
        uniform vec3 uCosmicColorC;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying float vReliefDepth;
        varying vec4 vMaskData;

        void main() {
          vec4 texColor = texture2D(uColorMap, vUv);
          vec4 maskData = texture2D(uDepthMaskMap, vUv);

          // Holographic scan-front sweeps from bottom to top as uHoloDissolve goes 0 -> 1
          float scanLine = 0.5 + 0.5 * sin(vUv.y * 180.0 - uTime * 14.0);
          float sweepFront = uHoloDissolve * 1.25 - 0.12;
          float sweepEdge = smoothstep(0.14, 0.0, abs(vUv.y - sweepFront)) * step(0.01, uHoloDissolve);
          float aboveSweep = smoothstep(sweepFront - 0.08, sweepFront + 0.08, vUv.y);
          float holoMask = mix(1.0, aboveSweep * (0.35 + 0.65 * scanLine), smoothstep(0.0, 0.85, uHoloDissolve));

          float alpha = maskData.a * uOpacity * holoMask;
          if (alpha < 0.02) discard;

          vec3 baseCol = texColor.rgb;

          // Fresnel rim lighting reacting dynamically to 3D head rotation
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - max(0.0, dot(viewDir, normalize(vNormal))), 2.4);
          float rimMask = maskData.b;

          vec3 rimHue = mix(uCosmicColorA, uCosmicColorB, 0.5 + 0.5 * sin(vUv.y * 4.0 + uTime * 1.2));
          rimHue = mix(rimHue, uCosmicColorC, smoothstep(0.65, 0.95, vUv.y) * 0.4);
          vec3 rimContribution = rimHue * (fresnel * 0.65 + rimMask * 0.32) * uRimIntensity;

          // Comfortable, non-glaring eye illumination
          vec2 leftDelta = (vUv - uLeftEyeUV) * vec2(1.0, 2.2);
          vec2 rightDelta = (vUv - uRightEyeUV) * vec2(1.0, 2.2);
          float minEyeDist = min(length(leftDelta), length(rightDelta));

          float eyeCoreMask = smoothstep(0.032, 0.006, minEyeDist) + maskData.g * 0.45;
          float eyeHaloMask = smoothstep(0.085, 0.012, minEyeDist);

          vec3 coldEyeCol = vec3(0.38, 0.70, 0.96);
          vec3 awakenedEyeCol = mix(uCosmicColorB, uCosmicColorC, 0.45 + 0.45 * sin(uTime * 3.0));
          float awakenMix = smoothstep(0.10, 0.40, uEyeGlow);
          vec3 activeEyeCol = mix(coldEyeCol, awakenedEyeCol, awakenMix);

          vec3 eyeContribution =
            activeEyeCol * eyeCoreMask * (0.22 + uEyeGlow * 0.92) +
            uCosmicColorB * eyeHaloMask * uEyeGlow * 0.28;

          // Holographic cyan/violet grid & laser scan-front glow during transition
          vec3 holoGlow = mix(uCosmicColorC, uCosmicColorB, scanLine) * (sweepEdge * 2.2 + uHoloDissolve * scanLine * 0.75);

          // Smooth chin-to-neck blend
          float chinFade = smoothstep(0.35, 0.42, vUv.y);

          vec3 finalColor = ((baseCol + rimContribution) * uDimming + eyeContribution + holoGlow) * uOpacity;
          gl_FragColor = vec4(finalColor * chinFade, alpha * chinFade);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });

    this.headMesh = new THREE.Mesh(headGeo, headMat);
    // Position head relative to headPivotGroup neck pivot
    this.headMesh.position.set(0, -NECK_PIVOT_Y, -NECK_PIVOT_Z + 0.08);
    this.headPivotGroup.add(this.headMesh);

    // 4. Build Torso Mesh: Shoulders, chest armor plate, collar socket, medallion
    // Stays anchored in armorGroup with rotation.y = 0
    const torsoGeo = new THREE.PlaneGeometry(BUST_WIDTH, BUST_HEIGHT, 140, 140);
    const torsoMat = new THREE.ShaderMaterial({
      uniforms: {
        uColorMap: { value: this.torsoColorTex },
        uDepthMaskMap: { value: this.torsoDepthTex },
        uTime: { value: 0 },
        uDepthStrength: { value: 0.68 },
        uDimming: { value: 1.0 },
        uOpacity: { value: 1.0 },
        uHoloDissolve: { value: 0.0 },
        uRimIntensity: { value: 1.15 },
        uCosmicColorA: { value: new THREE.Color('#a855f7') },
        uCosmicColorB: { value: new THREE.Color('#ec4899') },
        uCosmicColorC: { value: new THREE.Color('#00f2fe') },
      },
      vertexShader: `
        uniform sampler2D uDepthMaskMap;
        uniform float uDepthStrength;
        uniform float uTime;
        uniform float uHoloDissolve;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vUv = uv;
          vec4 maskData = texture2D(uDepthMaskMap, uv);
          float relief = maskData.r;

          float horizCentered = (uv.x - 0.5) * 1.5;
          float chestArc = cos(horizCentered) * 0.32 * maskData.a;

          vec3 displacedPos = position;
          displacedPos.z += relief * uDepthStrength + chestArc;

          // Living chest respiration + holographic wave
          float breathe = sin(uTime * 1.2 + uv.y * 3.14159) * 0.02 * maskData.a;
          float holoWave = sin(uv.y * 42.0 - uTime * 10.0) * 0.14 * uHoloDissolve * maskData.a;
          displacedPos.z += breathe + holoWave;

          float texel = 1.0 / 256.0;
          float dRight = texture2D(uDepthMaskMap, uv + vec2(texel, 0.0)).r;
          float dUp = texture2D(uDepthMaskMap, uv + vec2(0.0, texel)).r;
          vec3 localNormal = normalize(vec3(
            (relief - dRight) * uDepthStrength * 4.0,
            (relief - dUp) * uDepthStrength * 4.0,
            1.0
          ));

          vNormal = normalize(normalMatrix * localNormal);
          vec4 mvPosition = modelViewMatrix * vec4(displacedPos, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uColorMap;
        uniform sampler2D uDepthMaskMap;
        uniform float uTime;
        uniform float uDimming;
        uniform float uOpacity;
        uniform float uHoloDissolve;
        uniform float uRimIntensity;
        uniform vec3 uCosmicColorA;
        uniform vec3 uCosmicColorB;
        uniform vec3 uCosmicColorC;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;

        void main() {
          vec4 texColor = texture2D(uColorMap, vUv);
          vec4 maskData = texture2D(uDepthMaskMap, vUv);

          float scanLine = 0.5 + 0.5 * sin(vUv.y * 180.0 - uTime * 14.0);
          float sweepFront = uHoloDissolve * 1.15 - 0.10;
          float sweepEdge = smoothstep(0.14, 0.0, abs(vUv.y - sweepFront)) * step(0.01, uHoloDissolve);
          float aboveSweep = smoothstep(sweepFront - 0.08, sweepFront + 0.08, vUv.y);
          float holoMask = mix(1.0, aboveSweep * (0.35 + 0.65 * scanLine), smoothstep(0.0, 0.85, uHoloDissolve));

          float alpha = maskData.a * uOpacity * holoMask;
          if (alpha < 0.02) discard;

          vec3 baseCol = texColor.rgb;

          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - max(0.0, dot(viewDir, normalize(vNormal))), 2.4);

          vec3 rimHue = mix(uCosmicColorA, uCosmicColorB, 0.5 + 0.5 * sin(vUv.y * 3.0 + uTime));
          vec3 rimContribution = rimHue * (fresnel * 0.55 + maskData.b * 0.3) * uRimIntensity;

          vec3 holoGlow = mix(uCosmicColorC, uCosmicColorB, scanLine) * (sweepEdge * 2.0 + uHoloDissolve * scanLine * 0.65);

          // Fade smoothly at the top collar into the dark neck socket
          float collarFade = 1.0 - smoothstep(0.42, 0.48, vUv.y);
          // Bottom vignette fade into deep cosmic void
          float bottomFade = smoothstep(0.01, 0.12, vUv.y);

          float netAlpha = alpha * collarFade * bottomFade;
          vec3 finalColor = ((baseCol + rimContribution) * uDimming + holoGlow) * uOpacity;
          gl_FragColor = vec4(finalColor * bottomFade, netAlpha);
        }
      `,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });

    this.torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    this.torsoMesh.position.set(0, 0, 0);
    this.armorGroup.add(this.torsoMesh);

    // 5. Build 3D Celestial Armor & Horn Buttresses
    const {
      astrolabeOuter,
      astrolabeInner,
      chestReactorRing,
      leftMonolith,
      rightMonolith,
    } = this.buildProceduralCelestialArmor();

    this.astrolabeOuter = astrolabeOuter;
    this.astrolabeInner = astrolabeInner;
    this.chestReactorRing = chestReactorRing;
    this.leftMonolith = leftMonolith;
    this.rightMonolith = rightMonolith;

    // 6. Load supplied Galactus image and partition head and torso textures
    this.loadSuppliedGalactusImage(maxAnisotropy);
  }

  private createInitialTextures(maxAnisotropy: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(128, 110, 10, 128, 128, 120);
    grad.addColorStop(0, '#2a163d');
    grad.addColorStop(0.6, '#12081f');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const initialColorTex = new THREE.CanvasTexture(canvas);
    initialColorTex.colorSpace = THREE.SRGBColorSpace;
    initialColorTex.anisotropy = maxAnisotropy;

    const depthCanvas = document.createElement('canvas');
    depthCanvas.width = 256;
    depthCanvas.height = 256;
    const dCtx = depthCanvas.getContext('2d')!;
    dCtx.fillStyle = 'rgba(128, 0, 64, 255)';
    dCtx.fillRect(0, 0, 256, 256);
    const initialDepthTex = new THREE.CanvasTexture(depthCanvas);
    initialDepthTex.colorSpace = THREE.NoColorSpace;

    return { initialColorTex, initialDepthTex };
  }

  private loadSuppliedGalactusImage(maxAnisotropy: number) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (this.disposed) return;

      const size = 512;
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = size;
      sourceCanvas.height = size;
      const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true })!;
      srcCtx.drawImage(img, 0, 0, size, size);

      const srcData = srcCtx.getImageData(0, 0, size, size);
      const data = srcData.data;

      // Detect eye centroids from the bright blue eye luminescence in the image
      let leftWeightSum = 0;
      let leftUSum = 0;
      let leftVSum = 0;
      let rightWeightSum = 0;
      let rightUSum = 0;
      let rightVSum = 0;

      for (let y = Math.floor(size * 0.34); y <= Math.floor(size * 0.44); y++) {
        for (let x = Math.floor(size * 0.38); x <= Math.floor(size * 0.63); x++) {
          const idx = (y * size + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const blueGlow = b * 1.4 + g * 1.1 + r * 0.6;
          if (blueGlow > 480 && b > 170) {
            const u = x / size;
            const v = 1.0 - y / size;
            const weight = Math.pow(blueGlow - 480, 2);
            if (u < 0.505) {
              leftWeightSum += weight;
              leftUSum += u * weight;
              leftVSum += v * weight;
            } else {
              rightWeightSum += weight;
              rightUSum += u * weight;
              rightVSum += v * weight;
            }
          }
        }
      }

      if (leftWeightSum > 0 && rightWeightSum > 0) {
        this.leftEyeUV.set(leftUSum / leftWeightSum, leftVSum / leftWeightSum);
        this.rightEyeUV.set(rightUSum / rightWeightSum, rightVSum / rightWeightSum);
      }

      // Generate partitioned HEAD canvas textures (Color & 3D Depth/Mask)
      const headCanvas = document.createElement('canvas');
      headCanvas.width = size;
      headCanvas.height = size;
      const headCtx = headCanvas.getContext('2d')!;
      headCtx.drawImage(img, 0, 0, size, size);

      const headDepthCanvas = document.createElement('canvas');
      headDepthCanvas.width = size;
      headDepthCanvas.height = size;
      const headDepthCtx = headDepthCanvas.getContext('2d')!;
      const headDepthData = headDepthCtx.createImageData(size, size);
      const hOut = headDepthData.data;

      // Generate partitioned TORSO canvas textures (Color & 3D Depth/Mask)
      const torsoCanvas = document.createElement('canvas');
      torsoCanvas.width = size;
      torsoCanvas.height = size;
      const torsoCtx = torsoCanvas.getContext('2d')!;
      torsoCtx.drawImage(img, 0, 0, size, size);

      // Paint dark cosmic neck socket in the torso canvas behind the head
      const neckGrad = torsoCtx.createRadialGradient(size * 0.505, size * 0.58, 10, size * 0.505, size * 0.58, size * 0.18);
      neckGrad.addColorStop(0, 'rgba(10, 4, 20, 0.95)');
      neckGrad.addColorStop(0.7, 'rgba(26, 12, 46, 0.85)');
      neckGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      torsoCtx.fillStyle = neckGrad;
      torsoCtx.fillRect(size * 0.32, size * 0.48, size * 0.36, size * 0.22);

      const torsoDepthCanvas = document.createElement('canvas');
      torsoDepthCanvas.width = size;
      torsoDepthCanvas.height = size;
      const torsoDepthCtx = torsoDepthCanvas.getContext('2d')!;
      const torsoDepthData = torsoDepthCtx.createImageData(size, size);
      const tOut = torsoDepthData.data;

      for (let y = 0; y < size; y++) {
        const v = 1.0 - y / size;
        for (let x = 0; x < size; x++) {
          const u = x / size;
          const idx = (y * size + x) * 4;

          const r = data[idx] / 255;
          const g = data[idx + 1] / 255;
          const b = data[idx + 2] / 255;
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;

          // Anatomical head & facial structure
          const faceDx = (u - 0.505) / 0.16;
          const faceDy = (v - 0.56) / 0.18;
          const faceDome = Math.max(0, 1.0 - (faceDx * faceDx + faceDy * faceDy));

          const noseDx = (u - 0.505) / 0.06;
          const noseDy = (v - 0.54) / 0.10;
          const nosePeak = Math.max(0, 1.0 - (noseDx * noseDx + noseDy * noseDy)) * 0.35;

          const helmDx = (u - 0.50) / 0.18;
          const helmDy = (v - 0.78) / 0.22;
          const helmCylinder = Math.max(0, 1.0 - (helmDx * helmDx * 0.8 + helmDy * helmDy * 0.5)) * 0.68;
          const hornMask = (u < 0.36 || u > 0.64) && v > 0.40 ? 0.42 : 0.0;

          // Torso & chest structure
          const chestDx = (u - 0.50) / 0.14;
          const chestDy = (v - 0.18) / 0.12;
          const chestMedallion = Math.max(0, 1.0 - (chestDx * chestDx + chestDy * chestDy)) * 0.78;
          const shoulderPlate = v < 0.38 ? Math.max(0, 1.0 - Math.abs(u - 0.5) * 1.5) * 0.52 : 0;

          const baseHeadSculpt = Math.max(faceDome * 0.85 + nosePeak, helmCylinder, hornMask);
          const baseTorsoSculpt = Math.max(chestMedallion, shoulderPlate);

          // Silhouette transparency
          const isInteriorHead = Math.abs(u - 0.5) < 0.16 && v > 0.38 && v < 0.88;
          let headSilhouetteAlpha = isInteriorHead ? 1.0 : THREE.MathUtils.smoothstep(luma, 0.012, 0.065);

          // Head Mask: Keeps head, face, eyes, helmet (v >= 0.40), cleanly feathered at neck
          const headNeckFade = THREE.MathUtils.smoothstep(v, 0.37, 0.44);
          const netHeadAlpha = headSilhouetteAlpha * headNeckFade;

          // Torso Mask: Keeps shoulders, chest plate, medallion (v <= 0.45), cleanly feathered at collar
          const isInteriorTorso = Math.abs(u - 0.5) < 0.34 && v > 0.06 && v < 0.42;
          let torsoSilhouetteAlpha = isInteriorTorso ? 1.0 : THREE.MathUtils.smoothstep(luma, 0.012, 0.065);
          const torsoCollarFade = 1.0 - THREE.MathUtils.smoothstep(v, 0.39, 0.46);
          const netTorsoAlpha = torsoSilhouetteAlpha * torsoCollarFade;

          const headRelief = THREE.MathUtils.clamp((baseHeadSculpt * 0.74 + luma * 0.38) * netHeadAlpha, 0, 1);
          const torsoRelief = THREE.MathUtils.clamp((baseTorsoSculpt * 0.74 + luma * 0.35) * netTorsoAlpha, 0, 1);

          // Eye luminescence channel
          const dLeft = Math.hypot((u - this.leftEyeUV.x) * 1.0, (v - this.leftEyeUV.y) * 1.8);
          const dRight = Math.hypot((u - this.rightEyeUV.x) * 1.0, (v - this.rightEyeUV.y) * 1.8);
          const nearEyes = Math.min(dLeft, dRight) < 0.065;
          const eyeGlowMask = nearEyes
            ? THREE.MathUtils.clamp((b * 1.3 + g * 0.8 - 0.45) * 1.8, 0, 1)
            : 0;

          const rimHighlight = THREE.MathUtils.clamp(luma * 1.4, 0, 1);

          // Populate Head Depth Texture
          hOut[idx] = Math.round(headRelief * 255);
          hOut[idx + 1] = Math.round(eyeGlowMask * 255);
          hOut[idx + 2] = Math.round(rimHighlight * netHeadAlpha * 255);
          hOut[idx + 3] = Math.round(netHeadAlpha * 255);

          // Populate Torso Depth Texture
          tOut[idx] = Math.round(torsoRelief * 255);
          tOut[idx + 1] = 0;
          tOut[idx + 2] = Math.round(rimHighlight * netTorsoAlpha * 255);
          tOut[idx + 3] = Math.round(netTorsoAlpha * 255);
        }
      }

      headDepthCtx.putImageData(headDepthData, 0, 0);
      torsoDepthCtx.putImageData(torsoDepthData, 0, 0);

      // Sample exact depth at eye coordinates for 3D tracking
      const sampleHeadDepthAtUV = (uv: THREE.Vector2) => {
        const px = Math.min(size - 1, Math.max(0, Math.floor(uv.x * size)));
        const py = Math.min(size - 1, Math.max(0, Math.floor((1.0 - uv.y) * size)));
        return hOut[(py * size + px) * 4] / 255;
      };
      this.leftEyeDepthVal = sampleHeadDepthAtUV(this.leftEyeUV);
      this.rightEyeDepthVal = sampleHeadDepthAtUV(this.rightEyeUV);

      // Create high-anisotropy Three.js textures
      const newHeadColorTex = new THREE.CanvasTexture(headCanvas);
      newHeadColorTex.colorSpace = THREE.SRGBColorSpace;
      newHeadColorTex.anisotropy = maxAnisotropy;

      const newHeadDepthTex = new THREE.CanvasTexture(headDepthCanvas);
      newHeadDepthTex.colorSpace = THREE.NoColorSpace;

      const newTorsoColorTex = new THREE.CanvasTexture(torsoCanvas);
      newTorsoColorTex.colorSpace = THREE.SRGBColorSpace;
      newTorsoColorTex.anisotropy = maxAnisotropy;

      const newTorsoDepthTex = new THREE.CanvasTexture(torsoDepthCanvas);
      newTorsoDepthTex.colorSpace = THREE.NoColorSpace;

      // Dispose placeholders and assign loaded textures
      this.headColorTex.dispose();
      this.headDepthTex.dispose();
      this.torsoColorTex.dispose();
      this.torsoDepthTex.dispose();

      this.headColorTex = newHeadColorTex;
      this.headDepthTex = newHeadDepthTex;
      this.torsoColorTex = newTorsoColorTex;
      this.torsoDepthTex = newTorsoDepthTex;

      this.headMesh.material.uniforms.uColorMap.value = this.headColorTex;
      this.headMesh.material.uniforms.uDepthMaskMap.value = this.headDepthTex;
      this.headMesh.material.uniforms.uLeftEyeUV.value.copy(this.leftEyeUV);
      this.headMesh.material.uniforms.uRightEyeUV.value.copy(this.rightEyeUV);

      this.torsoMesh.material.uniforms.uColorMap.value = this.torsoColorTex;
      this.torsoMesh.material.uniforms.uDepthMaskMap.value = this.torsoDepthTex;
    };
    img.src = GALACTUS_IMAGE_PATH;
  }

  private buildProceduralCelestialArmor() {
    const obsidianAlloyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#1a0c2e'),
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    });

    const crimsonBronzeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#3b1736'),
      metalness: 0.78,
      roughness: 0.46,
      emissive: new THREE.Color('#240729'),
      emissiveIntensity: 0.4,
    });

    const energyTrimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#c084fc'),
      metalness: 0.85,
      roughness: 0.15,
      emissive: new THREE.Color('#9333ea'),
      emissiveIntensity: 0.8,
    });

    // 3D Horn Buttresses: Locked to headPivotGroup so they rotate with the head!
    const hornShape = new THREE.Shape();
    hornShape.moveTo(0, -0.8);
    hornShape.lineTo(1.25, -0.35);
    hornShape.lineTo(1.85, 1.45);
    hornShape.lineTo(1.15, 2.75);
    hornShape.lineTo(0.75, 2.55);
    hornShape.lineTo(1.25, 1.35);
    hornShape.lineTo(0.85, 0.05);
    hornShape.lineTo(0, -0.35);
    hornShape.closePath();

    const hornExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.28,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.06,
      bevelThickness: 0.06,
    };
    const hornGeo = new THREE.ExtrudeGeometry(hornShape, hornExtrudeSettings);
    hornGeo.computeVertexNormals();

    const rightHornButtress = new THREE.Mesh(hornGeo, crimsonBronzeMat);
    rightHornButtress.position.set(1.35, -0.42, 0.05);
    rightHornButtress.rotation.y = -0.22;
    this.headPivotGroup.add(rightHornButtress);

    const leftHornButtress = new THREE.Mesh(hornGeo, crimsonBronzeMat);
    leftHornButtress.scale.x = -1;
    leftHornButtress.position.set(-1.35, -0.42, 0.05);
    leftHornButtress.rotation.y = 0.22;
    this.headPivotGroup.add(leftHornButtress);

    // Pauldrons: Mounted on stationary body armorGroup
    const pauldronShape = new THREE.Shape();
    pauldronShape.moveTo(0.6, -2.0);
    pauldronShape.lineTo(3.1, -1.65);
    pauldronShape.lineTo(3.45, -2.45);
    pauldronShape.lineTo(0.8, -2.95);
    pauldronShape.closePath();

    const pauldronGeo = new THREE.ExtrudeGeometry(pauldronShape, {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.05,
      bevelThickness: 0.05,
    });

    const rightPauldron = new THREE.Mesh(pauldronGeo, obsidianAlloyMat);
    rightPauldron.position.set(0.1, 0, -0.38);
    rightPauldron.rotation.y = -0.15;
    this.armorGroup.add(rightPauldron);

    const leftPauldron = new THREE.Mesh(pauldronGeo, obsidianAlloyMat);
    leftPauldron.scale.x = -1;
    leftPauldron.position.set(-0.1, 0, -0.38);
    leftPauldron.rotation.y = 0.15;
    this.armorGroup.add(leftPauldron);

    // Chest Reactor Ring
    const reactorGeo = new THREE.TorusGeometry(0.92, 0.06, 20, 64);
    const chestReactorRing = new THREE.Mesh(reactorGeo, obsidianAlloyMat);
    chestReactorRing.position.set(0.02, -2.25, 0.22);
    chestReactorRing.rotation.x = 0.12;
    this.armorGroup.add(chestReactorRing);

    // Astrolabe Rings & Monoliths
    const astrolabeOuterGeo = new THREE.TorusGeometry(4.35, 0.035, 16, 120);
    const astrolabeOuter = new THREE.Mesh(astrolabeOuterGeo, energyTrimMat);
    astrolabeOuter.position.set(0, 0.45, -1.15);
    astrolabeOuter.rotation.set(0.35, -0.18, 0.1);
    this.armorGroup.add(astrolabeOuter);

    const astrolabeInnerGeo = new THREE.TorusGeometry(3.45, 0.025, 16, 96);
    const astrolabeInner = new THREE.Mesh(astrolabeInnerGeo, crimsonBronzeMat);
    astrolabeInner.position.set(0, 0.55, -0.85);
    astrolabeInner.rotation.set(-0.28, 0.24, -0.15);
    this.armorGroup.add(astrolabeInner);

    const lathePoints = [
      new THREE.Vector2(0.0, -1.4),
      new THREE.Vector2(0.16, -1.0),
      new THREE.Vector2(0.24, 0.0),
      new THREE.Vector2(0.14, 1.1),
      new THREE.Vector2(0.0, 1.45),
    ];
    const monolithGeo = new THREE.LatheGeometry(lathePoints, 6);

    const leftMonolith = new THREE.Mesh(monolithGeo, obsidianAlloyMat);
    leftMonolith.position.set(-4.35, 0.3, -0.6);
    leftMonolith.rotation.z = 0.12;
    this.armorGroup.add(leftMonolith);

    const rightMonolith = new THREE.Mesh(monolithGeo, obsidianAlloyMat);
    rightMonolith.position.set(4.35, 0.3, -0.6);
    rightMonolith.rotation.z = -0.12;
    this.armorGroup.add(rightMonolith);

    // Floor Contact Shadow Plane
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
    sGrad.addColorStop(0, 'rgba(10, 3, 22, 0.85)');
    sGrad.addColorStop(0.55, 'rgba(88, 28, 135, 0.25)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 5.5),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.75,
      })
    );
    contactShadowPlane.rotation.x = -Math.PI / 2;
    contactShadowPlane.position.set(0, -3.65, 0.1);
    this.armorGroup.add(contactShadowPlane);

    return {
      astrolabeOuter,
      astrolabeInner,
      chestReactorRing,
      leftMonolith,
      rightMonolith,
    };
  }

  /**
   * Computes the exact 3D world positions of Galactus's left and right eyes
   * as the head rotates on its neck pivot in true 3D space.
   */
  public getEyePositions3D(
    outLeftWorld: THREE.Vector3,
    outRightWorld: THREE.Vector3,
    currentDepthStrength: number
  ) {
    const computeEyeLocalToHead = (
      uv: THREE.Vector2,
      depthVal: number,
      outLocal: THREE.Vector3
    ) => {
      // Plane coordinates relative to headMesh
      const x0 = (uv.x - 0.5) * BUST_WIDTH;
      const y0 = (uv.y - 0.5) * BUST_HEIGHT - NECK_PIVOT_Y;
      const horizCentered = (uv.x - 0.5) * 1.65;
      const cylArc = Math.cos(horizCentered) * CYLINDER_CURVATURE;
      const z0 = -NECK_PIVOT_Z + 0.08 + depthVal * currentDepthStrength + cylArc + 0.05;

      outLocal.set(x0, y0, z0);
    };

    computeEyeLocalToHead(this.leftEyeUV, this.leftEyeDepthVal, _localLeftEye);
    computeEyeLocalToHead(this.rightEyeUV, this.rightEyeDepthVal, _localRightEye);

    // Apply headPivotGroup world matrix (which includes true head yaw rotation!)
    this.headPivotGroup.updateMatrixWorld(true);
    outLeftWorld.copy(_localLeftEye).applyMatrix4(this.headPivotGroup.matrixWorld);
    outRightWorld.copy(_localRightEye).applyMatrix4(this.headPivotGroup.matrixWorld);
  }

  public update(
    elapsedTime: number,
    state: CinematicState,
    overrides: DirectorOverrides,
    pointerX: number,
    pointerY: number
  ) {
    const effectiveDepth = state.depthRelief * overrides.reliefMultiplier;
    // Total head yaw angle: scroll-driven yaw + subtle pointer interaction
    const headYawWithPointer = state.galactusYaw + pointerX * 0.08;

    // 1. ROTATE ONLY THE HEAD! Body and torso remain firmly anchored facing front.
    this.headPivotGroup.rotation.y = headYawWithPointer;
    this.headPivotGroup.rotation.x = pointerY * 0.04;

    const opacity = state.galactusOpacity ?? 1.0;
    const holoDissolve = state.galactusHoloDissolve ?? 0.0;
    this.group.visible = opacity > 0.005;
    if (!this.group.visible) return;

    // 2. Update Head Shader Uniforms
    const hUniforms = this.headMesh.material.uniforms;
    hUniforms.uTime.value = elapsedTime;
    hUniforms.uDepthStrength.value = effectiveDepth;
    hUniforms.uEyeGlow.value = state.eyeGlowIntensity * overrides.beamBrightness * opacity;
    hUniforms.uRimIntensity.value = state.rimLightIntensity * opacity;
    hUniforms.uDimming.value = state.characterDimming;
    hUniforms.uOpacity.value = opacity;
    hUniforms.uHoloDissolve.value = holoDissolve;

    // 3. Update Torso Shader Uniforms
    const tUniforms = this.torsoMesh.material.uniforms;
    tUniforms.uTime.value = elapsedTime;
    tUniforms.uDepthStrength.value = effectiveDepth;
    tUniforms.uDimming.value = state.characterDimming;
    tUniforms.uRimIntensity.value = state.rimLightIntensity * opacity;
    tUniforms.uOpacity.value = opacity;
    tUniforms.uHoloDissolve.value = holoDissolve;

    this.headMesh.material.wireframe = overrides.showWireframeOverlay;
    this.torsoMesh.material.wireframe = overrides.showWireframeOverlay;

    // 4. Overall Character Placement in Deep Space
    const floatY = overrides.reducedMotion ? 0 : Math.sin(elapsedTime * 1.1) * 0.04;
    this.group.position.set(
      pointerX * 0.1,
      0.35 + floatY + pointerY * 0.08 + (1.0 - opacity) * 1.25,
      state.galactusZ
    );
    this.group.scale.setScalar(state.galactusScale);
    // Group stays facing front (rotation.y = 0) so ONLY the head rotates!
    this.group.rotation.y = 0;
    this.group.rotation.x = state.galactusPitch - pointerY * 0.04;

    // 5. Animate background celestial containment armor
    const rotRate = overrides.reducedMotion ? 0.05 : 1.0;
    this.astrolabeOuter.rotation.z = elapsedTime * 0.12 * rotRate + state.progress * 1.8;
    this.astrolabeInner.rotation.z = -elapsedTime * 0.18 * rotRate - state.progress * 2.4;
    this.chestReactorRing.rotation.z = elapsedTime * 0.25 * rotRate;

    const monolithBob = overrides.reducedMotion ? 0 : Math.sin(elapsedTime * 1.6) * 0.14;
    this.leftMonolith.position.y = 0.3 + monolithBob;
    this.rightMonolith.position.y = 0.3 - monolithBob;
    this.leftMonolith.rotation.y = elapsedTime * 0.35 * rotRate;
    this.rightMonolith.rotation.y = -elapsedTime * 0.35 * rotRate;
  }

  public dispose() {
    this.disposed = true;
    this.headColorTex.dispose();
    this.headDepthTex.dispose();
    this.torsoColorTex.dispose();
    this.torsoDepthTex.dispose();
    this.headMesh.geometry.dispose();
    this.headMesh.material.dispose();
    this.torsoMesh.geometry.dispose();
    this.torsoMesh.material.dispose();

    const disposeGroup = (grp: THREE.Group) => {
      grp.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
    disposeGroup(this.armorGroup);
    disposeGroup(this.headPivotGroup);
  }
}
