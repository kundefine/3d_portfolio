import * as THREE from 'three';
import { CinematicState, DirectorOverrides } from '../../types/cinematic';

interface SatelliteRock {
  mesh: THREE.Group;
  basePos: THREE.Vector3;
  scatterOffset: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  phase: number;
}

interface ShardParticleData {
  t: number; // Position along diagonal ribbon (0 -> 1)
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

/**
 * Deterministic 3D hash / pseudo-noise for sculpting craggy obsidian rock facets.
 */
function fract(x: number): number {
  return x - Math.floor(x);
}

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return fract(n);
}

function noise3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  const uz = fz * fz * (3.0 - 2.0 * fz);

  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;

  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;

  return nxy0 + (nxy1 - nxy0) * uz;
}

function ridgedFbm(x: number, y: number, z: number): number {
  let sum = 0;
  let amp = 0.52;
  let freq = 1.15;
  for (let i = 0; i < 4; i++) {
    const n = noise3D(x * freq, y * freq, z * freq);
    const ridge = 1.0 - Math.abs(n * 2.0 - 1.0);
    sum += ridge * ridge * amp;
    freq *= 2.05;
    amp *= 0.48;
  }
  return sum;
}

/**
 * Builds a sharp 6-sided hexagonal quartz/amethyst crystal prism with a pointed pyramidal apex,
 * matching the teal top crystal and violet cavity crystal in /assets/aistudio/about_eac5ce94.jpeg.
 */
function createHexCrystalGeometry(
  radius: number,
  totalHeight: number,
  tipRatio = 0.36
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius * 0.88, radius, totalHeight, 6, 4, false);
  const pos = geo.attributes.position;
  const halfH = totalHeight * 0.5;
  const tipStart = halfH - totalHeight * tipRatio;

  for (let i = 0; i < pos.count; i++) {
    let vx = pos.getX(i);
    let vy = pos.getY(i);
    let vz = pos.getZ(i);

    if (vy > tipStart) {
      // Taper smoothly to a sharp asymmetric crystal apex point
      const t = (vy - tipStart) / Math.max(0.001, halfH - tipStart);
      const taper = Math.max(0.0, 1.0 - Math.pow(t, 1.15));
      vx *= taper;
      vz *= taper;
      if (t > 0.96) {
        vy += radius * 0.16;
      }
    } else {
      // Subtle organic facet asymmetry along the hexagonal shaft
      const angle = Math.atan2(vz, vx);
      const facetScale = 1.0 + Math.sin(angle * 3.0) * 0.08;
      vx *= facetScale;
      vz *= facetScale;
    }

    pos.setXYZ(i, vx, vy, vz);
  }

  const nonIndexed = geo.toNonIndexed();
  nonIndexed.computeVertexNormals();
  geo.dispose();
  return nonIndexed;
}

/**
 * Builds the craggy, wet-look black obsidian monolith geometry with a carved lower-front alcove
 * for the violet crystal and an upper saddle for the teal crystal.
 */
function createObsidianMonolithGeometry(
  baseRadius: number,
  detail: number,
  carveAlcove: boolean
): THREE.BufferGeometry {
  const baseGeo = new THREE.IcosahedronGeometry(baseRadius, detail);
  const pos = baseGeo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const ox = pos.getX(i);
    const oy = pos.getY(i);
    const oz = pos.getZ(i);

    const len = Math.hypot(ox, oy, oz) || 1;
    const nx = ox / len;
    const ny = oy / len;
    const nz = oz / len;

    // Multi-octave ridged fractures & angular mineral cleavage planes
    const rNoise = ridgedFbm(nx * 2.1 + 1.3, ny * 2.4 + 0.7, nz * 2.1 - 0.9);
    const strata = Math.sin(ny * 7.5 + nx * 3.2) * 0.07;
    const Terrace = Math.floor(rNoise * 7.0) / 7.0;

    let disp = 0.72 + (rNoise * 0.65 + Terrace * 0.35) * 0.56 + strata;

    // Sculpt vertical monolith proportions matching about_eac5ce94.jpeg
    let sx = ox * disp * 0.94;
    let sy = oy * disp * 1.28;
    let sz = oz * disp * 0.88;

    if (carveAlcove) {
      // Carve the lower-left/front hollow cavity where the purple crystal grows
      const dxCavity = nx - -0.24;
      const dyCavity = ny - -0.28;
      const dzCavity = nz - 0.78;
      const distCavity = Math.hypot(dxCavity * 1.15, dyCavity * 0.95, dzCavity);
      if (distCavity < 0.68) {
        const indent = Math.pow(1.0 - distCavity / 0.68, 1.65) * 0.52;
        sx *= 1.0 - indent * 0.35;
        sy *= 1.0 - indent * 0.25;
        sz -= indent * baseRadius * 0.85;
      }

      // Flatten right-lower overhang slightly for dramatic silhouettes
      if (nx > 0.35 && ny < -0.15) {
        sx += 0.18 * baseRadius;
      }
    }

    pos.setXYZ(i, sx, sy, sz);
  }

  const facetedGeo = baseGeo.toNonIndexed();
  facetedGeo.computeVertexNormals();
  baseGeo.dispose();
  return facetedGeo;
}

export class AboutCrystalRocksSystem {
  public readonly group: THREE.Group;
  public readonly monolithPivot: THREE.Group;

  private obsidianMat: THREE.MeshPhysicalMaterial;
  private tealCrystalMat: THREE.MeshPhysicalMaterial;
  private tealCoreMat: THREE.MeshBasicMaterial;
  private purpleCrystalMat: THREE.MeshPhysicalMaterial;
  private purpleCoreMat: THREE.MeshBasicMaterial;
  private shardMat: THREE.MeshStandardMaterial;

  private tealLight: THREE.PointLight;
  private purpleLight: THREE.PointLight;
  private obsidianRimLightRight: THREE.DirectionalLight;
  private obsidianRimLightBottom: THREE.PointLight;

  private satelliteRocks: SatelliteRock[] = [];
  private shardInstancedMesh: THREE.InstancedMesh;
  private shardData: ShardParticleData[] = [];
  private readonly shardCount: number;

  private dampedRotY = -0.22;
  private dampedRotX = 0.08;

  constructor(isSoftwareGl: boolean) {
    this.group = new THREE.Group();
    this.group.visible = false;

    this.monolithPivot = new THREE.Group();
    // Placed on the right side of the 3D viewport matching /assets/aistudio/about_eac5ce94.jpeg
    this.monolithPivot.position.set(2.15, 0.05, 3.85);
    this.group.add(this.monolithPivot);

    // 1. Materials: Glossy Wet-Look Black Obsidian + Translucent Teal & Violet Crystals
    this.obsidianMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#07070a'),
      metalness: 0.78,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.09,
      reflectivity: 1.0,
      flatShading: true,
    });

    this.tealCrystalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#00cba9'),
      emissive: new THREE.Color('#005e54'),
      emissiveIntensity: 0.95,
      metalness: 0.12,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.92,
      flatShading: true,
    });

    this.tealCoreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#5eead4'),
      transparent: true,
      opacity: 0.65,
    });

    this.purpleCrystalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#9333ea'),
      emissive: new THREE.Color('#581c87'),
      emissiveIntensity: 1.05,
      metalness: 0.15,
      roughness: 0.14,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.93,
      flatShading: true,
    });

    this.purpleCoreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#e879f9'),
      transparent: true,
      opacity: 0.7,
    });

    // 2. Main Sculpted Black Obsidian Monolith
    const mainRockGeo = createObsidianMonolithGeometry(1.62, isSoftwareGl ? 3 : 4, true);
    const mainRockMesh = new THREE.Mesh(mainRockGeo, this.obsidianMat);
    this.monolithPivot.add(mainRockMesh);

    // 3. Top Emerald-Teal Crystal Spire emerging from the upper ridge
    const tealCrystalGroup = new THREE.Group();
    tealCrystalGroup.position.set(-0.16, 1.56, 0.05);
    tealCrystalGroup.rotation.set(0.08, 0.32, -0.15);

    const mainTealGeo = createHexCrystalGeometry(0.44, 1.48, 0.42);
    const mainTealMesh = new THREE.Mesh(mainTealGeo, this.tealCrystalMat);
    tealCrystalGroup.add(mainTealMesh);

    const innerTealGeo = createHexCrystalGeometry(0.24, 1.15, 0.42);
    const innerTealMesh = new THREE.Mesh(innerTealGeo, this.tealCoreMat);
    tealCrystalGroup.add(innerTealMesh);

    // Crisp crystal facet edge highlights
    const tealEdgeGeo = new THREE.EdgesGeometry(mainTealGeo, 18);
    const tealEdges = new THREE.LineSegments(
      tealEdgeGeo,
      new THREE.LineBasicMaterial({
        color: '#2dd4bf',
        transparent: true,
        opacity: 0.65,
      })
    );
    tealCrystalGroup.add(tealEdges);

    // Secondary smaller teal crystal shard
    const sideTealGeo = createHexCrystalGeometry(0.22, 0.82, 0.4);
    const sideTealMesh = new THREE.Mesh(sideTealGeo, this.tealCrystalMat);
    sideTealMesh.position.set(0.28, -0.22, -0.12);
    sideTealMesh.rotation.set(-0.14, 0.4, -0.38);
    tealCrystalGroup.add(sideTealMesh);

    this.monolithPivot.add(tealCrystalGroup);

    // 4. Lower-Front Cavity Violet/Amethyst Crystal Cluster
    const purpleCrystalGroup = new THREE.Group();
    purpleCrystalGroup.position.set(-0.28, -0.44, 0.84);
    purpleCrystalGroup.rotation.set(0.22, -0.18, -0.14);

    const mainPurpleGeo = createHexCrystalGeometry(0.30, 1.12, 0.40);
    const mainPurpleMesh = new THREE.Mesh(mainPurpleGeo, this.purpleCrystalMat);
    purpleCrystalGroup.add(mainPurpleMesh);

    const innerPurpleGeo = createHexCrystalGeometry(0.16, 0.85, 0.40);
    const innerPurpleMesh = new THREE.Mesh(innerPurpleGeo, this.purpleCoreMat);
    purpleCrystalGroup.add(innerPurpleMesh);

    const purpleEdgeGeo = new THREE.EdgesGeometry(mainPurpleGeo, 18);
    const purpleEdges = new THREE.LineSegments(
      purpleEdgeGeo,
      new THREE.LineBasicMaterial({
        color: '#e879f9',
        transparent: true,
        opacity: 0.7,
      })
    );
    purpleCrystalGroup.add(purpleEdges);

    // Companion amethyst shards inside the cavity
    const sidePurpleGeo1 = createHexCrystalGeometry(0.16, 0.68, 0.38);
    const sidePurple1 = new THREE.Mesh(sidePurpleGeo1, this.purpleCrystalMat);
    sidePurple1.position.set(-0.20, -0.18, 0.12);
    sidePurple1.rotation.set(0.18, 0.2, 0.34);
    purpleCrystalGroup.add(sidePurple1);

    const sidePurpleGeo2 = createHexCrystalGeometry(0.14, 0.56, 0.38);
    const sidePurple2 = new THREE.Mesh(sidePurpleGeo2, this.purpleCrystalMat);
    sidePurple2.position.set(0.19, -0.24, 0.08);
    sidePurple2.rotation.set(0.12, -0.3, -0.32);
    purpleCrystalGroup.add(sidePurple2);

    this.monolithPivot.add(purpleCrystalGroup);

    // 5. Dedicated Crystal & Obsidian Specular Lights
    this.tealLight = new THREE.PointLight('#00f2fe', 4.5, 7.5);
    this.tealLight.position.set(-0.2, 2.25, 0.65);
    this.monolithPivot.add(this.tealLight);

    this.purpleLight = new THREE.PointLight('#c084fc', 4.2, 6.5);
    this.purpleLight.position.set(-0.35, -0.35, 1.55);
    this.monolithPivot.add(this.purpleLight);

    // Crisp silver-white specular rim lights for the glossy black obsidian facets
    this.obsidianRimLightRight = new THREE.DirectionalLight('#f8fafc', 3.4);
    this.obsidianRimLightRight.position.set(6.5, -1.5, 4.0);
    this.group.add(this.obsidianRimLightRight);

    this.obsidianRimLightBottom = new THREE.PointLight('#e2e8f0', 3.2, 9.0);
    this.obsidianRimLightBottom.position.set(3.4, -2.4, 5.2);
    this.group.add(this.obsidianRimLightBottom);

    // 6. Floating Satellite Obsidian & Crystal Rocks around the 3D space
    const satelliteConfigs = [
      { pos: new THREE.Vector3(4.35, 1.65, 2.1), scale: 0.34, hasTeal: true },
      { pos: new THREE.Vector3(0.15, -2.05, 2.6), scale: 0.28, hasTeal: false },
      { pos: new THREE.Vector3(4.15, -1.75, 2.8), scale: 0.38, hasTeal: false },
      { pos: new THREE.Vector3(-3.65, 1.85, 1.4), scale: 0.26, hasTeal: true },
      { pos: new THREE.Vector3(-1.45, -2.15, 1.8), scale: 0.22, hasTeal: false },
    ];

    satelliteConfigs.forEach((cfg, idx) => {
      const satGroup = new THREE.Group();
      const satGeo = createObsidianMonolithGeometry(cfg.scale, 2, false);
      const satMesh = new THREE.Mesh(satGeo, this.obsidianMat);
      satGroup.add(satMesh);

      const miniCrystalGeo = createHexCrystalGeometry(
        cfg.scale * 0.28,
        cfg.scale * 1.15,
        0.4
      );
      const miniCrystal = new THREE.Mesh(
        miniCrystalGeo,
        cfg.hasTeal ? this.tealCrystalMat : this.purpleCrystalMat
      );
      miniCrystal.position.set(0, cfg.scale * 0.72, 0);
      miniCrystal.rotation.z = -0.24;
      satGroup.add(miniCrystal);

      satGroup.position.copy(cfg.pos);
      this.group.add(satGroup);

      this.satelliteRocks.push({
        mesh: satGroup,
        basePos: cfg.pos.clone(),
        scatterOffset: new THREE.Vector3(
          (idx % 2 === 0 ? 1 : -1) * (3.5 + idx * 0.8),
          -4.5 - idx * 1.1,
          -6.5 - idx * 1.4
        ),
        rotSpeed: new THREE.Vector3(
          0.18 + idx * 0.05,
          0.26 - idx * 0.04,
          0.12 + idx * 0.03
        ),
        phase: idx * 1.35,
      });
    });

    // 7. Diagonal Stream of 3D Faceted Micro-Rock Shards (matching /assets/aistudio/about_eac5ce94.jpeg)
    this.shardCount = isSoftwareGl ? 220 : 460;
    const shardGeo = new THREE.OctahedronGeometry(0.046, 0);
    this.shardMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d1d5db'),
      metalness: 0.72,
      roughness: 0.26,
      flatShading: true,
    });

    this.shardInstancedMesh = new THREE.InstancedMesh(
      shardGeo,
      this.shardMat,
      this.shardCount
    );
    this.shardInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < this.shardCount; i++) {
      const t = i / this.shardCount;
      // Two intertwined ribbons matching the double-wave pebble trail in about_eac5ce94.jpeg
      const ribbonBranch = i % 2 === 0 ? 1 : -1;
      const spreadY =
        ribbonBranch * (0.28 + hash3(i, 1.1, 2.2) * 0.45) +
        (hash3(i, 3.3, 4.4) - 0.5) * 0.42;
      const spreadZ = (hash3(i, 5.5, 6.6) - 0.5) * 2.2;
      const scale = 0.45 + hash3(i, 7.7, 8.8) * 1.25;

      this.shardData.push({
        t,
        speed: 0.012 + hash3(i, 9.1, 1.7) * 0.016,
        spreadY,
        spreadZ,
        scale,
        rotAxis: new THREE.Vector3(
          hash3(i, 2.3, 4.1) - 0.5,
          hash3(i, 5.2, 1.9) - 0.5,
          hash3(i, 8.4, 3.7) - 0.5
        ).normalize(),
        rotSpeed: 0.6 + hash3(i, 6.1, 2.9) * 1.8,
        scatterVec: new THREE.Vector3(
          (hash3(i, 1.5, 9.2) - 0.5) * 14,
          -6.0 - hash3(i, 4.8, 2.1) * 8,
          -9.0 - hash3(i, 7.3, 5.4) * 10
        ),
      });
    }

    this.group.add(this.shardInstancedMesh);
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

    // Smooth cubic ease-out for 3D spatial entry as Galactus fades away
    const easedReveal = 1.0 - Math.pow(1.0 - reveal, 3.0);
    const scatterFactor = 1.0 - easedReveal;

    // Position the main Obsidian & Crystal Monolith on the right side of the 3D stage
    const baseMonolithX = isPortrait ? 0.0 : 2.18;
    const baseMonolithY = isPortrait ? 1.05 : 0.05;
    const baseMonolithZ = isPortrait ? 2.65 : 3.85;

    const floatY = overrides.reducedMotion ? 0 : Math.sin(elapsedTime * 1.15) * 0.11;
    const floatX = overrides.reducedMotion ? 0 : Math.cos(elapsedTime * 0.85) * 0.05;

    // Monolith flies in from deep 3D space (below & behind) as the user scrolls from Hero to About
    this.monolithPivot.position.set(
      baseMonolithX + floatX + scatterFactor * 2.4 + pointerX * 0.18,
      baseMonolithY + floatY - scatterFactor * 4.2 + pointerY * 0.14,
      baseMonolithZ - scatterFactor * 7.5
    );

    const monolithScale = (isPortrait ? 0.78 : 1.0) * (0.25 + easedReveal * 0.75);
    this.monolithPivot.scale.setScalar(monolithScale);

    // Rotate the 3D Obsidian Rock smoothly with scroll chapter progress, user slider/drag, and pointer parallax
    const targetRotY =
      -0.24 +
      state.aboutChapterProgress * 0.62 +
      state.aboutRockUserYaw +
      pointerX * 0.28 +
      (overrides.reducedMotion ? 0 : Math.sin(elapsedTime * 0.45) * 0.12) +
      scatterFactor * 1.8;

    const targetRotX =
      0.08 +
      state.aboutRockUserPitch -
      pointerY * 0.18 +
      (overrides.reducedMotion ? 0 : Math.cos(elapsedTime * 0.55) * 0.06) +
      scatterFactor * 0.65;

    this.dampedRotY = THREE.MathUtils.lerp(this.dampedRotY, targetRotY, 0.12);
    this.dampedRotX = THREE.MathUtils.lerp(this.dampedRotX, targetRotX, 0.12);

    this.monolithPivot.rotation.set(
      this.dampedRotX,
      this.dampedRotY,
      -0.06 + Math.sin(elapsedTime * 0.5) * 0.03
    );

    // Pulse the internal Teal & Violet Crystal lights
    const pulseTeal = 0.85 + 0.25 * Math.sin(elapsedTime * 2.4);
    const pulsePurple = 0.85 + 0.25 * Math.cos(elapsedTime * 2.1 + 1.0);

    // Emphasize crystal glow based on active About chapter (0 = Teal focus, 1 = Dual, 2 = Violet focus)
    const chapter = state.aboutChapterProgress;
    const tealBoost = chapter < 1.0 ? 1.25 : 0.95;
    const purpleBoost = chapter >= 0.8 ? 1.3 : 0.95;

    this.tealLight.intensity = 4.5 * pulseTeal * tealBoost * easedReveal;
    this.purpleLight.intensity = 4.2 * pulsePurple * purpleBoost * easedReveal;
    this.tealCrystalMat.emissiveIntensity = 0.95 * pulseTeal * tealBoost;
    this.purpleCrystalMat.emissiveIntensity = 1.05 * pulsePurple * purpleBoost;

    this.obsidianRimLightRight.intensity = 3.4 * easedReveal;
    this.obsidianRimLightBottom.intensity = 3.2 * easedReveal;

    this.obsidianMat.wireframe = overrides.showWireframeOverlay;
    this.tealCrystalMat.wireframe = overrides.showWireframeOverlay;
    this.purpleCrystalMat.wireframe = overrides.showWireframeOverlay;

    // Update Satellite Obsidian Rocks
    for (let i = 0; i < this.satelliteRocks.length; i++) {
      const sat = this.satelliteRocks[i];
      const bob = overrides.reducedMotion
        ? 0
        : Math.sin(elapsedTime * 1.4 + sat.phase) * 0.16;

      sat.mesh.position.set(
        sat.basePos.x + sat.scatterOffset.x * scatterFactor + pointerX * 0.12,
        sat.basePos.y + bob + sat.scatterOffset.y * scatterFactor + pointerY * 0.1,
        sat.basePos.z + sat.scatterOffset.z * scatterFactor
      );
      sat.mesh.scale.setScalar(easedReveal);
      sat.mesh.rotation.x = elapsedTime * sat.rotSpeed.x;
      sat.mesh.rotation.y = elapsedTime * sat.rotSpeed.y + state.aboutChapterProgress * 0.5;
      sat.mesh.rotation.z = elapsedTime * sat.rotSpeed.z;
    }

    // Update Diagonal Stream of 460 3D Faceted Micro-Shards (sweeping bottom-left -> top-right)
    const motionMult = overrides.reducedMotion ? 0.05 : 1.0;
    for (let i = 0; i < this.shardCount; i++) {
      const d = this.shardData[i];
      const curT = (d.t + elapsedTime * d.speed * motionMult) % 1.0;

      // Diagonal S-curve trajectory from bottom-left (-7.2, -1.8) to top-right (+7.2, +2.3)
      const streamX = (curT - 0.5) * 14.8;
      const streamY =
        (curT - 0.5) * 3.8 +
        Math.sin(curT * Math.PI * 2.0 + elapsedTime * 0.4) * 0.38 +
        d.spreadY;
      // Curves behind and around the main Obsidian Rock at x ~ 2.15
      const streamZ =
        2.5 +
        Math.cos((curT - 0.62) * Math.PI * 2.2) * 1.35 +
        d.spreadZ;

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
      this.shardInstancedMesh.setMatrixAt(i, _dummyObj.matrix);
    }
    this.shardInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  public dispose() {
    this.obsidianMat.dispose();
    this.tealCrystalMat.dispose();
    this.tealCoreMat.dispose();
    this.purpleCrystalMat.dispose();
    this.purpleCoreMat.dispose();
    this.shardMat.dispose();

    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
      }
    });
  }
}
