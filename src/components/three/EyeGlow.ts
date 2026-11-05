import * as THREE from 'three';
import { CinematicState, DirectorOverrides } from '../../types/cinematic';

export class EyeGlowSystem {
  public readonly group: THREE.Group;

  private leftPointLight: THREE.PointLight;
  private rightPointLight: THREE.PointLight;

  private leftCoreSprite: THREE.Sprite;
  private rightCoreSprite: THREE.Sprite;

  private leftHaloSprite: THREE.Sprite;
  private rightHaloSprite: THREE.Sprite;

  private leftFlareSprite: THREE.Sprite;
  private rightFlareSprite: THREE.Sprite;

  private leftCoronaRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private rightCoronaRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;

  private radialGlowTex: THREE.CanvasTexture;
  private anamorphicFlareTex: THREE.CanvasTexture;

  constructor() {
    this.group = new THREE.Group();

    this.radialGlowTex = this.createRadialGlowTexture();
    this.anamorphicFlareTex = this.createAnamorphicFlareTexture();

    // 1. Subtle PointLights positioned at Galactus's eyes (comfortable intensity)
    this.leftPointLight = new THREE.PointLight('#ec4899', 0.45, 5.5, 1.8);
    this.rightPointLight = new THREE.PointLight('#06b6d4', 0.45, 5.5, 1.8);
    this.group.add(this.leftPointLight, this.rightPointLight);

    // 2. Crisp, compact inner eye core sprites
    const coreMatLeft = new THREE.SpriteMaterial({
      map: this.radialGlowTex,
      color: new THREE.Color('#e0f2fe'),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const coreMatRight = coreMatLeft.clone();
    this.leftCoreSprite = new THREE.Sprite(coreMatLeft);
    this.rightCoreSprite = new THREE.Sprite(coreMatRight);
    this.leftCoreSprite.renderOrder = 15;
    this.rightCoreSprite.renderOrder = 15;
    this.group.add(this.leftCoreSprite, this.rightCoreSprite);

    // 3. Soft, restrained outer halo sprites
    const haloMatLeft = new THREE.SpriteMaterial({
      map: this.radialGlowTex,
      color: new THREE.Color('#c084fc'),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const haloMatRight = haloMatLeft.clone();
    this.leftHaloSprite = new THREE.Sprite(haloMatLeft);
    this.rightHaloSprite = new THREE.Sprite(haloMatRight);
    this.leftHaloSprite.renderOrder = 14;
    this.rightHaloSprite.renderOrder = 14;
    this.group.add(this.leftHaloSprite, this.rightHaloSprite);

    // 4. Subtle horizontal lens streak
    const flareMatLeft = new THREE.SpriteMaterial({
      map: this.anamorphicFlareTex,
      color: new THREE.Color('#38bdf8'),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });
    const flareMatRight = flareMatLeft.clone();
    this.leftFlareSprite = new THREE.Sprite(flareMatLeft);
    this.rightFlareSprite = new THREE.Sprite(flareMatRight);
    this.leftFlareSprite.renderOrder = 16;
    this.rightFlareSprite.renderOrder = 16;
    this.group.add(this.leftFlareSprite, this.rightFlareSprite);

    // 5. Delicate iris ring
    const coronaGeo = new THREE.RingGeometry(0.08, 0.12, 32);
    const coronaMatLeft = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#e879f9'),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coronaMatRight = coronaMatLeft.clone();
    this.leftCoronaRing = new THREE.Mesh(coronaGeo, coronaMatLeft);
    this.rightCoronaRing = new THREE.Mesh(coronaGeo, coronaMatRight);
    this.leftCoronaRing.renderOrder = 15;
    this.rightCoronaRing.renderOrder = 15;
    this.group.add(this.leftCoronaRing, this.rightCoronaRing);
  }

  private createRadialGlowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(128, 128, 2, 128, 128, 126);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.22, 'rgba(192, 132, 252, 0.45)');
    grad.addColorStop(0.55, 'rgba(56, 189, 248, 0.16)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private createAnamorphicFlareTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const hGrad = ctx.createLinearGradient(0, 32, 512, 32);
    hGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0)');
    hGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.18)');
    hGrad.addColorStop(0.47, 'rgba(236, 72, 153, 0.48)');
    hGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)');
    hGrad.addColorStop(0.53, 'rgba(236, 72, 153, 0.48)');
    hGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.18)');
    hGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = hGrad;
    ctx.fillRect(0, 24, 512, 16);

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

  public update(
    elapsedTime: number,
    leftEyeWorld: THREE.Vector3,
    rightEyeWorld: THREE.Vector3,
    state: CinematicState,
    overrides: DirectorOverrides
  ) {
    // Keep intensity comfortable and well-controlled so it never hurts visibility
    const intensity = Math.min(0.55, state.eyeGlowIntensity * overrides.beamBrightness) * state.characterDimming;
    const pulse = overrides.reducedMotion ? 1.0 : 1.0 + Math.sin(elapsedTime * 5.0) * 0.05;

    this.leftPointLight.position.copy(leftEyeWorld).z += 0.22;
    this.rightPointLight.position.copy(rightEyeWorld).z += 0.22;

    this.leftCoreSprite.position.copy(leftEyeWorld);
    this.rightCoreSprite.position.copy(rightEyeWorld);

    this.leftHaloSprite.position.copy(leftEyeWorld);
    this.rightHaloSprite.position.copy(rightEyeWorld);

    this.leftFlareSprite.position.copy(leftEyeWorld);
    this.rightFlareSprite.position.copy(rightEyeWorld);

    this.leftCoronaRing.position.copy(leftEyeWorld).z += 0.03;
    this.rightCoronaRing.position.copy(rightEyeWorld).z += 0.03;

    // Subtle multicolor prism shift on the eyes when shooting multicolor lasers
    const awakenMix = THREE.MathUtils.smoothstep(state.eyeGlowIntensity, 0.12, 0.38);
    const coldHue = new THREE.Color('#60a5fa');
    const prismHue = new THREE.Color().setHSL((elapsedTime * 0.15) % 1.0, 0.85, 0.65);
    const activeColor = coldHue.lerp(prismHue, awakenMix * 0.65);

    this.leftPointLight.color.copy(activeColor);
    this.rightPointLight.color.copy(activeColor);
    this.leftPointLight.intensity = intensity * 1.15 * pulse;
    this.rightPointLight.intensity = intensity * 1.15 * pulse;

    this.leftHaloSprite.material.color.copy(activeColor);
    this.rightHaloSprite.material.color.copy(activeColor);

    this.leftFlareSprite.material.color.copy(activeColor);
    this.rightFlareSprite.material.color.copy(activeColor);

    // Compact, comfortable scale & opacity
    const coreScale = (0.15 + intensity * 0.22) * pulse;
    this.leftCoreSprite.scale.set(coreScale * 1.35, coreScale * 0.72, 1);
    this.rightCoreSprite.scale.set(coreScale * 1.35, coreScale * 0.72, 1);
    this.leftCoreSprite.material.opacity = THREE.MathUtils.clamp(intensity * 0.75, 0, 0.52);
    this.rightCoreSprite.material.opacity = THREE.MathUtils.clamp(intensity * 0.75, 0, 0.52);

    const haloScale = (0.32 + intensity * 0.48) * pulse;
    this.leftHaloSprite.scale.set(haloScale * 1.35, haloScale * 0.9, 1);
    this.rightHaloSprite.scale.set(haloScale * 1.35, haloScale * 0.9, 1);
    this.leftHaloSprite.material.opacity = THREE.MathUtils.clamp(intensity * 0.52, 0, 0.36);
    this.rightHaloSprite.material.opacity = THREE.MathUtils.clamp(intensity * 0.52, 0, 0.36);

    const flareWidth = (0.42 + state.eyeFlareScale * 0.85) * pulse;
    const flareHeight = 0.09 + state.eyeFlareScale * 0.12;
    this.leftFlareSprite.scale.set(flareWidth, flareHeight, 1);
    this.rightFlareSprite.scale.set(flareWidth, flareHeight, 1);
    this.leftFlareSprite.material.opacity = THREE.MathUtils.clamp(intensity * 0.55, 0, 0.38);
    this.rightFlareSprite.material.opacity = THREE.MathUtils.clamp(intensity * 0.55, 0, 0.38);

    const coronaOpacity = THREE.MathUtils.smoothstep(state.eyeGlowIntensity, 0.22, 0.42) * 0.32 * state.characterDimming;
    this.leftCoronaRing.material.opacity = coronaOpacity;
    this.rightCoronaRing.material.opacity = coronaOpacity;
    const coronaScale = 0.65 + awakenMix * 0.45;
    this.leftCoronaRing.scale.setScalar(coronaScale);
    this.rightCoronaRing.scale.setScalar(coronaScale);
    this.leftCoronaRing.rotation.z = elapsedTime * 1.5;
    this.rightCoronaRing.rotation.z = -elapsedTime * 1.5;
  }

  public dispose() {
    this.radialGlowTex.dispose();
    this.anamorphicFlareTex.dispose();
    this.leftCoreSprite.material.dispose();
    this.rightCoreSprite.material.dispose();
    this.leftHaloSprite.material.dispose();
    this.rightHaloSprite.material.dispose();
    this.leftFlareSprite.material.dispose();
    this.rightFlareSprite.material.dispose();
    this.leftCoronaRing.geometry.dispose();
    this.leftCoronaRing.material.dispose();
    this.rightCoronaRing.geometry.dispose();
    this.rightCoronaRing.material.dispose();
  }
}
