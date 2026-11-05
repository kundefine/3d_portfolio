import * as THREE from 'three';
import { CinematicState, DirectorOverrides } from '../../types/cinematic';

// Pre-allocated math helpers at module scope (zero GC in render loop)
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

interface ShardInstanceData {
  baseX: number;
  baseY: number;
  baseZ: number;
  scale: number;
  rotSpeedX: number;
  rotSpeedY: number;
  phase: number;
}

export class CosmicParticlesSystem {
  public readonly group: THREE.Group;

  private dustPoints: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private instancedShards: THREE.InstancedMesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
  private shardData: ShardInstanceData[] = [];
  private shardCount: number;

  constructor(isSoftwareGl: boolean) {
    this.group = new THREE.Group();

    const particleCount = isSoftwareGl ? 600 : 1600;
    this.shardCount = isSoftwareGl ? 60 : 140;

    // 1. Custom Shader Points for Cosmic Dust & Energy Motes
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const phases = new Float32Array(particleCount);

    const palette = [
      new THREE.Color('#f4f0ff'), // Starlight white
      new THREE.Color('#ec4899'), // Electric pink
      new THREE.Color('#a855f7'), // Cosmic purple
      new THREE.Color('#e11d48'), // Crimson nebula
      new THREE.Color('#60a5fa'), // Deep astral blue
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Distribute across a deep 3D cylindrical volume around Galactus and the camera path
      const radius = 1.4 + Math.random() * 12.5;
      const theta = Math.random() * Math.PI * 2;
      positions[i3] = Math.cos(theta) * radius;
      positions[i3 + 1] = (Math.random() - 0.5) * 14.0;
      positions[i3 + 2] = (Math.random() - 0.35) * 16.0;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;

      sizes[i] = 4.0 + Math.random() * 14.0;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const dustMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWarpOffset: { value: 0 },
        uDescentPull: { value: 0 },
        uIntensity: { value: 0.65 },
        uDensityScale: { value: 1.0 },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aSize;
        attribute float aPhase;

        uniform float uTime;
        uniform float uWarpOffset;
        uniform float uDescentPull;
        uniform float uDensityScale;

        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vColor = aColor;

          vec3 pos = position;
          // Gentle orbital drift
          pos.x += sin(uTime * 0.45 + aPhase) * 0.22;
          pos.y += cos(uTime * 0.38 + aPhase * 1.3) * 0.22 - uDescentPull * 1.4;

          // Forward z-stream during Scene 2-4 camera advance, modulo wrapped in [-8, +8]
          float wrappedZ = mod(pos.z + uWarpOffset + 8.0, 16.0) - 8.0;
          pos.z = wrappedZ;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float dist = max(0.5, -mvPosition.z);

          gl_PointSize = clamp((aSize * uDensityScale * 9.5) / dist, 1.0, 32.0);
          vAlpha = smoothstep(15.0, 3.0, dist) * (0.45 + 0.55 * sin(uTime * 1.8 + aPhase));

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uIntensity;
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float d = length(coord);
          if (d > 0.5) discard;

          float softCircle = pow(1.0 - d * 2.0, 2.2);
          gl_FragColor = vec4(vColor * (1.1 + softCircle * 0.6), softCircle * vAlpha * uIntensity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.dustPoints = new THREE.Points(dustGeo, dustMat);
    this.group.add(this.dustPoints);

    // 2. InstancedMesh of 3D Crystalline Cosmic Shards (>20 items with per-instance scale & tint)
    const shardGeo = new THREE.OctahedronGeometry(0.055, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      metalness: 0.85,
      roughness: 0.22,
      emissive: new THREE.Color('#7e22ce'),
      emissiveIntensity: 0.6,
    });

    this.instancedShards = new THREE.InstancedMesh(shardGeo, shardMat, this.shardCount);
    this.instancedShards.frustumCulled = false;

    for (let i = 0; i < this.shardCount; i++) {
      const angle = (i / this.shardCount) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 3.6 + Math.random() * 7.5;
      const baseX = Math.cos(angle) * radius;
      const baseY = (Math.random() - 0.5) * 9.5;
      const baseZ = -4.5 + Math.random() * 8.0;
      const scale = 0.85 + Math.random() * 0.3; // ±15% variation

      this.shardData.push({
        baseX,
        baseY,
        baseZ,
        scale,
        rotSpeedX: (Math.random() - 0.5) * 1.2,
        rotSpeedY: (Math.random() - 0.5) * 1.2,
        phase: Math.random() * Math.PI * 2,
      });

      _pos.set(baseX, baseY, baseZ);
      _euler.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      _quat.setFromEuler(_euler);
      _scale.setScalar(scale);
      _mat4.compose(_pos, _quat, _scale);
      this.instancedShards.setMatrixAt(i, _mat4);

      const tint = palette[i % palette.length];
      _color.copy(tint);
      this.instancedShards.setColorAt(i, _color);
    }

    this.instancedShards.instanceMatrix.needsUpdate = true;
    if (this.instancedShards.instanceColor) {
      this.instancedShards.instanceColor.needsUpdate = true;
    }
    this.instancedShards.computeBoundingSphere();
    this.group.add(this.instancedShards);
  }

  public update(
    elapsedTime: number,
    state: CinematicState,
    overrides: DirectorOverrides
  ) {
    const motionFactor = overrides.reducedMotion ? 0.1 : 1.0;

    // Update dust shader uniforms
    const uniforms = this.dustPoints.material.uniforms;
    uniforms.uTime.value = elapsedTime * motionFactor;
    uniforms.uWarpOffset.value =
      elapsedTime * 0.35 * motionFactor + state.progress * 6.5 * state.particleWarpSpeed;
    uniforms.uDescentPull.value = state.laserDropProgress * 1.2;
    uniforms.uIntensity.value =
      (0.45 + state.atmosphereIntensity * 0.65) * overrides.particleDensity;
    uniforms.uDensityScale.value = overrides.particleDensity;

    // Update instanced 3D cosmic shards
    for (let i = 0; i < this.shardCount; i++) {
      const d = this.shardData[i];
      _pos.set(
        d.baseX + Math.sin(elapsedTime * 0.5 * motionFactor + d.phase) * 0.15,
        d.baseY + Math.cos(elapsedTime * 0.4 * motionFactor + d.phase) * 0.18 - state.laserDropProgress * 0.6,
        d.baseZ + state.progress * 2.2
      );
      _euler.set(
        elapsedTime * d.rotSpeedX * motionFactor,
        elapsedTime * d.rotSpeedY * motionFactor,
        d.phase
      );
      _quat.setFromEuler(_euler);
      _scale.setScalar(d.scale * overrides.particleDensity);
      _mat4.compose(_pos, _quat, _scale);
      this.instancedShards.setMatrixAt(i, _mat4);
    }
    this.instancedShards.instanceMatrix.needsUpdate = true;
  }

  public dispose() {
    this.dustPoints.geometry.dispose();
    this.dustPoints.material.dispose();
    this.instancedShards.geometry.dispose();
    this.instancedShards.material.dispose();
  }
}
