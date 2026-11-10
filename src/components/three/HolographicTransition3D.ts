import * as THREE from 'three';
import { CinematicState, DirectorOverrides } from '../../types/cinematic';

interface HoloVoxelStreamItem {
  // Origin on Galactus (Screen 1)
  originPos: THREE.Vector3;
  // Control point in mid-3D space
  controlPos: THREE.Vector3;
  // Target on the 3D Obsidian & Crystal Monolith (Screen 2)
  targetPos: THREE.Vector3;
  scale: number;
  phaseOffset: number;
  rotSpeed: number;
  rotAxis: THREE.Vector3;
}

const _dummy = new THREE.Object3D();
const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _p2 = new THREE.Vector3();
const _pos = new THREE.Vector3();

function fract(x: number): number {
  return x - Math.floor(x);
}

function hash(n: number): number {
  return fract(Math.sin(n * 127.1 + 311.7) * 43758.5453123);
}

/**
 * Scroll-Triggered 3D Holographic Spatial Transition System.
 * Lives inside the single Three.js scene so transitioning between Screen 1 (Galactus)
 * and Screen 2 (About 3D Crystal Monolith) occurs as a continuous 3D holographic morph
 * and spatial laser scan-wave.
 */
export class HolographicTransition3DSystem {
  public readonly group: THREE.Group;

  private scanPlaneMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private outerGateRing: THREE.Mesh<THREE.TorusGeometry, THREE.ShaderMaterial>;
  private innerGateRing: THREE.Mesh<THREE.TorusGeometry, THREE.ShaderMaterial>;
  private voxelInstancedMesh: THREE.InstancedMesh;
  private voxelMat: THREE.MeshBasicMaterial;
  private voxelItems: HoloVoxelStreamItem[] = [];
  private readonly voxelCount: number;

  constructor(isSoftwareGl: boolean) {
    this.group = new THREE.Group();
    this.group.visible = false;

    // 1. 3D Volumetric Holographic Laser Scan-Grid Plane
    const scanGeo = new THREE.PlaneGeometry(18, 11, 1, 1);
    const scanMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uSweepProgress: { value: 0 },
        uColorCyan: { value: new THREE.Color('#00f2fe') },
        uColorTeal: { value: new THREE.Color('#2dd4bf') },
        uColorViolet: { value: new THREE.Color('#a855f7') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform float uSweepProgress;
        uniform vec3 uColorCyan;
        uniform vec3 uColorTeal;
        uniform vec3 uColorViolet;

        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          vec2 centered = (vUv - 0.5) * 2.0;
          centered.x *= 1.6;
          float radialDist = length(centered);

          // Perspective holographic grid lines
          vec2 gridUv = vUv * vec2(36.0, 22.0);
          vec2 gridFract = abs(fract(gridUv - 0.5) - 0.5) / fwidth(gridUv);
          float gridLine = 1.0 - min(min(gridFract.x, gridFract.y), 1.0);

          // Sweeping horizontal laser scan bar synchronized with scroll transition
          float sweepY = mix(0.08, 0.92, uSweepProgress);
          float scanDist = abs(vUv.y - sweepY);
          float laserCore = smoothstep(0.018, 0.0, scanDist);
          float laserGlow = smoothstep(0.16, 0.0, scanDist) * 0.45;

          // Concentric holographic rangefinder rings
          float ringWave = abs(sin(radialDist * 9.0 - uTime * 3.5));
          float ringMask = smoothstep(0.92, 0.99, ringWave) * smoothstep(1.45, 0.25, radialDist);

          // Edge vignette so the 3D scan plane blends seamlessly into deep space
          float edgeFade = smoothstep(1.55, 0.35, radialDist);

          vec3 col = mix(uColorCyan, uColorTeal, vUv.x);
          col = mix(col, uColorViolet, smoothstep(0.2, 0.85, radialDist));

          float alpha = (gridLine * 0.16 + laserCore * 0.85 + laserGlow + ringMask * 0.35) * edgeFade * uIntensity;
          if (alpha < 0.005) discard;

          gl_FragColor = vec4(col * (1.0 + laserCore * 1.4), alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.scanPlaneMesh = new THREE.Mesh(scanGeo, scanMat);
    this.scanPlaneMesh.position.set(0, 0, 2.2);
    this.group.add(this.scanPlaneMesh);

    // 2. Dual Counter-Rotating 3D Holographic Portal Rings
    const createGateRingMat = (hexA: string, hexB: string) =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uColorA: { value: new THREE.Color(hexA) },
          uColorB: { value: new THREE.Color(hexB) },
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
          uniform float uIntensity;
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          varying vec2 vUv;
          void main() {
            float dash = step(0.35, fract(vUv.x * 28.0 + uTime * 0.6));
            vec3 col = mix(uColorA, uColorB, 0.5 + 0.5 * sin(vUv.x * 6.2831 + uTime * 2.0));
            float alpha = dash * uIntensity * 0.78;
            if (alpha < 0.01) discard;
            gl_FragColor = vec4(col * 1.5, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

    this.outerGateRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.4, 0.022, 12, 120),
      createGateRingMat('#00f2fe', '#a855f7')
    );
    this.group.add(this.outerGateRing);

    this.innerGateRing = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.018, 12, 96),
      createGateRingMat('#2dd4bf', '#ec4899')
    );
    this.group.add(this.innerGateRing);

    // 3. 3D Holographic Voxel Stream connecting Galactus (Screen 1) -> 3D Crystal Monolith (Screen 2)
    this.voxelCount = isSoftwareGl ? 120 : 260;
    const voxelGeo = new THREE.OctahedronGeometry(0.055, 0);
    this.voxelMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffffff'),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    });

    this.voxelInstancedMesh = new THREE.InstancedMesh(
      voxelGeo,
      this.voxelMat,
      this.voxelCount
    );
    this.voxelInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const palette = [
      new THREE.Color('#00f2fe'),
      new THREE.Color('#2dd4bf'),
      new THREE.Color('#c084fc'),
      new THREE.Color('#ec4899'),
    ];

    for (let i = 0; i < this.voxelCount; i++) {
      // Origin distributed across Galactus's 3D bust volume (centered around x: 0, y: 0.4, z: -0.5)
      const angle = hash(i * 1.3) * Math.PI * 2;
      const radius = 0.25 + hash(i * 2.7) * 2.8;
      const ox = Math.cos(angle) * radius;
      const oy = (hash(i * 3.9) - 0.45) * 4.8;
      const oz = -0.6 + (hash(i * 5.1) - 0.5) * 1.2;

      // Mid-space holographic swirl control point
      const cx = THREE.MathUtils.lerp(ox, 2.15, 0.5) + (hash(i * 6.3) - 0.5) * 4.5;
      const cy = THREE.MathUtils.lerp(oy, 0.05, 0.5) + (hash(i * 7.7) - 0.5) * 3.8;
      const cz = 3.2 + (hash(i * 8.9) - 0.5) * 2.8;

      // Target distributed across the 3D Obsidian & Crystal Monolith on the right (x: 2.15, y: 0.05, z: 3.85)
      const tAngle = hash(i * 10.1) * Math.PI * 2;
      const tRadius = 0.15 + hash(i * 11.3) * 1.75;
      const tx = 2.15 + Math.cos(tAngle) * tRadius * 0.9;
      const ty = 0.05 + (hash(i * 12.7) - 0.48) * 3.2;
      const tz = 3.85 + Math.sin(tAngle) * tRadius * 0.9;

      this.voxelItems.push({
        originPos: new THREE.Vector3(ox, oy, oz),
        controlPos: new THREE.Vector3(cx, cy, cz),
        targetPos: new THREE.Vector3(tx, ty, tz),
        scale: 0.55 + hash(i * 14.1) * 1.35,
        phaseOffset: hash(i * 15.7) * 0.32,
        rotSpeed: 1.5 + hash(i * 17.3) * 3.0,
        rotAxis: new THREE.Vector3(
          hash(i * 19.1) - 0.5,
          hash(i * 21.3) - 0.5,
          hash(i * 23.7) - 0.5
        ).normalize(),
      });

      this.voxelInstancedMesh.setColorAt(i, palette[i % palette.length]);
    }

    if (this.voxelInstancedMesh.instanceColor) {
      this.voxelInstancedMesh.instanceColor.needsUpdate = true;
    }

    this.group.add(this.voxelInstancedMesh);
  }

  public update(
    elapsedTime: number,
    state: CinematicState,
    overrides: DirectorOverrides,
    pointerX: number,
    pointerY: number
  ) {
    const holoIntensity = THREE.MathUtils.clamp(state.holoTransitionProgress || 0, 0, 1);
    const morphT = THREE.MathUtils.clamp(state.galactusHoloDissolve || 0, 0, 1);

    this.group.visible = holoIntensity > 0.005;
    if (!this.group.visible) return;

    // 1. Update 3D Volumetric Scan-Grid Plane
    const sUniforms = this.scanPlaneMesh.material.uniforms;
    sUniforms.uTime.value = elapsedTime;
    sUniforms.uIntensity.value = holoIntensity * 0.85;
    sUniforms.uSweepProgress.value = morphT;

    // Scan plane glides along Z between Galactus (-0.4) and the Crystal Monolith (+3.8)
    this.scanPlaneMesh.position.set(
      pointerX * 0.15,
      pointerY * 0.1,
      THREE.MathUtils.lerp(0.6, 4.4, morphT)
    );
    this.scanPlaneMesh.rotation.y = THREE.MathUtils.lerp(0.08, -0.14, morphT);

    // 2. Update Dual Counter-Rotating 3D Holographic Gate Rings
    const ringX = THREE.MathUtils.lerp(0.0, 2.15, morphT) + pointerX * 0.2;
    const ringY = THREE.MathUtils.lerp(0.35, 0.05, morphT) + pointerY * 0.15;
    const ringZ = THREE.MathUtils.lerp(0.2, 3.65, morphT);
    const ringScale = 0.72 + Math.sin(morphT * Math.PI) * 0.45;

    this.outerGateRing.position.set(ringX, ringY, ringZ);
    this.outerGateRing.scale.setScalar(ringScale);
    this.outerGateRing.rotation.set(
      0.22 * Math.sin(elapsedTime * 0.9),
      -0.25 * morphT,
      elapsedTime * 0.65
    );
    this.outerGateRing.material.uniforms.uTime.value = elapsedTime;
    this.outerGateRing.material.uniforms.uIntensity.value = holoIntensity;

    this.innerGateRing.position.set(ringX, ringY, ringZ + 0.35);
    this.innerGateRing.scale.setScalar(ringScale * 0.88);
    this.innerGateRing.rotation.set(
      -0.18 * Math.cos(elapsedTime * 0.8),
      0.2 * morphT,
      -elapsedTime * 0.85
    );
    this.innerGateRing.material.uniforms.uTime.value = elapsedTime;
    this.innerGateRing.material.uniforms.uIntensity.value = holoIntensity;

    // 3. Update 260 3D Holographic Voxels streaming along Quadratic Bezier paths
    // from Galactus (Screen 1) -> 3D Obsidian & Crystal Monolith (Screen 2)
    this.voxelMat.opacity = holoIntensity * 0.92;
    const rotMult = overrides.reducedMotion ? 0.1 : 1.0;

    for (let i = 0; i < this.voxelCount; i++) {
      const item = this.voxelItems[i];
      // Staggered progress along the Bezier curve for each voxel
      const localT = THREE.MathUtils.clamp(
        (morphT * 1.32 - item.phaseOffset) / (1.0 - item.phaseOffset),
        0,
        1
      );
      const smoothT = localT * localT * (3.0 - 2.0 * localT);
      const invT = 1.0 - smoothT;

      _p0.copy(item.originPos).multiplyScalar(invT * invT);
      _p1.copy(item.controlPos).multiplyScalar(2.0 * invT * smoothT);
      _p2.copy(item.targetPos).multiplyScalar(smoothT * smoothT);

      _pos.copy(_p0).add(_p1).add(_p2);
      _pos.x += pointerX * 0.18;
      _pos.y += pointerY * 0.12;

      _dummy.position.copy(_pos);
      const pulseScale = item.scale * Math.sin(Math.max(0.05, Math.min(0.95, morphT)) * Math.PI);
      _dummy.scale.setScalar(Math.max(0.01, pulseScale));
      _dummy.quaternion.setFromAxisAngle(
        item.rotAxis,
        elapsedTime * item.rotSpeed * rotMult + i
      );
      _dummy.updateMatrix();
      this.voxelInstancedMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.voxelInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose() {
    this.scanPlaneMesh.geometry.dispose();
    this.scanPlaneMesh.material.dispose();
    this.outerGateRing.geometry.dispose();
    this.outerGateRing.material.dispose();
    this.innerGateRing.geometry.dispose();
    this.innerGateRing.material.dispose();
    this.voxelInstancedMesh.geometry.dispose();
    this.voxelMat.dispose();
  }
}
