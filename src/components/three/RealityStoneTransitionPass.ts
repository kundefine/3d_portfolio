import * as THREE from 'three';

/**
 * ============================================================================
 * REALITY STONE PROCEDURAL ENVIRONMENT WIPE — DUAL RENDER TARGET PASS
 * ============================================================================
 * Renders two distinct 3D scenes into separate offscreen WebGLRenderTargets:
 *   - rtSceneA (tSceneA): Section 1 ("About" — 3D Iron Man Hologram & warm amber debris)
 *   - rtSceneB (tSceneB): Section 2 ("My Skills" — 3D Deep-Space Galaxy & 3D Hovering Thanos Chair Throne)
 *
 * Composites both render targets on a full-screen post-processing quad driven by:
 *   - uProgress (0.0 -> 1.0): Scrubbed via GSAP virtual scroll or triggered via UI button
 *   - uTime: Continuous elapsed time for organic turbulent motion along the Reality seam
 *
 * Shader Features (Inspired by Avengers: Infinity War Titan Reality Stone Scene):
 *   1. 2D Simplex FBM Noise Edge: Distorts the horizontal transition boundary (vUv.x)
 *      into a jagged, organic, tearing reality seam.
 *   2. Glowing Crimson/Red-Orange Aether Energy Seam: Narrow smoothstep/exponential band
 *      colored with fiery emissive glow (vec3(1.0, 0.15, 0.05) * intensity) + bloom halo.
 *   3. Heat Distortion: Applies UV displacement along the transition seam so both
 *      tSceneA and tSceneB warp refractively as the red energy wave passes over them.
 *
 * How to Swap Scene A / Scene B with Custom 3D .glb Models or DOM Section Textures:
 *   - Pass any THREE.Scene containing loaded GLTFLoader (.glb) meshes into renderTransition(),
 *     or bind a THREE.CanvasTexture / HTML texture to uniform `tSceneA` / `tSceneB`.
 * ============================================================================
 */
export class RealityStoneTransitionPass {
  public readonly rtSceneA: THREE.WebGLRenderTarget;
  public readonly rtSceneB: THREE.WebGLRenderTarget;
  public readonly postScene: THREE.Scene;
  public readonly postCamera: THREE.OrthographicCamera;
  public readonly material: THREE.ShaderMaterial;
  private readonly quadMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;

  constructor(width: number, height: number, pixelRatio: number) {
    const rtWidth = Math.max(1, Math.floor(width * pixelRatio));
    const rtHeight = Math.max(1, Math.floor(height * pixelRatio));

    const rtParams: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      colorSpace: THREE.SRGBColorSpace,
      depthBuffer: true,
      stencilBuffer: false,
    };

    this.rtSceneA = new THREE.WebGLRenderTarget(rtWidth, rtHeight, rtParams);
    this.rtSceneB = new THREE.WebGLRenderTarget(rtWidth, rtHeight, rtParams);

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      uniforms: {
        tSceneA: { value: this.rtSceneA.texture },
        tSceneB: { value: this.rtSceneB.texture },
        uProgress: { value: 0.0 },
        uTime: { value: 0.0 },
        uResolution: { value: new THREE.Vector2(rtWidth, rtHeight) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tSceneA;
        uniform sampler2D tSceneB;
        uniform float uProgress;
        uniform float uTime;
        uniform vec2 uResolution;

        varying vec2 vUv;

        // ---------------------------------------------------------------------
        // 2D Simplex Noise (Ashima Arts / Ian McEwan) + Fractal Brownian Motion
        // ---------------------------------------------------------------------
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(
            0.211324865405187,  // (3.0 - sqrt(3.0)) / 6.0
            0.366025403784439,  // 0.5 * (sqrt(3.0) - 1.0)
           -0.577350269189626,  // -1.0 + 2.0 * C.x
            0.024390243902439   // 1.0 / 41.0
          );
          vec2 i  = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
          m = m * m;
          m = m * m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        // Multi-octave FBM for jagged tearing Reality Stone Aether edge
        float fbm(vec2 p) {
          float value = 0.0;
          float amp = 0.55;
          float freq = 1.0;
          for (int i = 0; i < 4; i++) {
            value += amp * snoise(p * freq);
            freq *= 2.15;
            amp *= 0.48;
          }
          return value;
        }

        void main() {
          float aspect = uResolution.x / max(1.0, uResolution.y);
          vec2 aspectUv = vec2(vUv.x * aspect, vUv.y);

          // 1. Procedural Noise Edge distorting the horizontal boundary (vUv.x)
          float n1 = fbm(vec2(aspectUv.x * 2.2 - uTime * 0.45, aspectUv.y * 3.8 + uTime * 0.28));
          float n2 = snoise(vec2(aspectUv.x * 7.5 + uTime * 0.9, aspectUv.y * 11.0 - uTime * 0.65));
          float noiseOffset = (n1 * 0.14 + n2 * 0.045);

          // Expand sweep range slightly beyond [0, 1] so the noisy seam enters & exits cleanly
          float sweepThreshold = mix(-0.22, 1.22, uProgress);

          // Signed distance from the jagged Reality Stone wave front
          // dist < 0.0 => Revealed Scene B (Skills), dist > 0.0 => Unwiped Scene A (About)
          float dist = (vUv.x + noiseOffset) - sweepThreshold;

          // Envelope that fades seam at the very start (0.0) and very end (1.0)
          float activeEnvelope = smoothstep(0.0, 0.04, uProgress) * (1.0 - smoothstep(0.96, 1.0, uProgress));

          // 2. Heat Distortion & Chromatic Refraction along the Reality Seam
          float heatBand = exp(-abs(dist) * 18.0) * activeEnvelope;
          vec2 warpOffset = vec2(
            n1 * 0.036 + sin(vUv.y * 28.0 + uTime * 7.0) * 0.008,
            n2 * 0.028 + cos(vUv.x * 24.0 - uTime * 6.0) * 0.008
          ) * heatBand;

          vec2 uvA = clamp(vUv + warpOffset * 1.15, 0.001, 0.999);
          vec2 uvB = clamp(vUv - warpOffset * 0.85, 0.001, 0.999);

          // Subtle RGB chromatic split right on the tearing reality seam
          float chromaShift = heatBand * 0.009;
          vec3 colA = vec3(
            texture2D(tSceneA, clamp(uvA + vec2(chromaShift, 0.0), 0.001, 0.999)).r,
            texture2D(tSceneA, uvA).g,
            texture2D(tSceneA, clamp(uvA - vec2(chromaShift, 0.0), 0.001, 0.999)).b
          );

          vec3 colB = vec3(
            texture2D(tSceneB, clamp(uvB + vec2(chromaShift * 0.7, 0.0), 0.001, 0.999)).r,
            texture2D(tSceneB, uvB).g,
            texture2D(tSceneB, clamp(uvB - vec2(chromaShift * 0.7, 0.0), 0.001, 0.999)).b
          );

          // Warm amber dust tint on Scene A right ahead of the Reality Stone wave
          float aheadGlow = smoothstep(0.28, 0.0, dist) * step(0.0, dist) * activeEnvelope;
          colA += vec3(0.45, 0.16, 0.04) * aheadGlow * 0.42;

          // Smoothly blend from Scene A (About) to Scene B (My Skills) across the noisy threshold
          float mixFactor = 1.0 - smoothstep(-0.018, 0.018, dist);
          vec3 baseColor = mix(colA, colB, mixFactor);

          // 3. Glowing Reality Stone Crimson / Red-Orange Energy Seam + Bloom Halo
          float coreBand = (1.0 - smoothstep(0.0, 0.022, abs(dist))) * activeEnvelope;
          float innerSeam = (1.0 - smoothstep(0.0, 0.068, abs(dist))) * activeEnvelope;
          float outerBloom = exp(-abs(dist) * 10.5) * activeEnvelope;

          // Reality Stone Aether signature color: vec3(1.0, 0.15, 0.05) * intensity + white-hot core
          float emberPulse = 0.88 + 0.24 * sin(uTime * 14.0 + vUv.y * 22.0 + n2 * 6.0);
          vec3 aetherCrimson = vec3(1.0, 0.15, 0.05) * 3.2 * emberPulse;
          vec3 moltenCore = vec3(1.0, 0.72, 0.45) * 2.4;
          vec3 deepAetherBloom = vec3(0.82, 0.03, 0.12) * 1.35;

          // Floating reality ember sparks inside the seam
          float sparkNoise = snoise(vec2(aspectUv.x * 26.0 - uTime * 3.5, aspectUv.y * 32.0 + uTime * 2.2));
          float sparks = smoothstep(0.62, 0.92, sparkNoise) * innerSeam * 2.2;

          vec3 seamEmission =
            aetherCrimson * pow(innerSeam, 1.35) +
            moltenCore * pow(coreBand, 2.0) +
            deepAetherBloom * outerBloom +
            vec3(1.0, 0.35, 0.12) * sparks;

          vec3 finalColor = baseColor + seamEmission;

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(quadGeo, this.material);
    this.quadMesh.frustumCulled = false;
    this.postScene.add(this.quadMesh);
  }

  public setSize(width: number, height: number, pixelRatio: number) {
    const rtWidth = Math.max(1, Math.floor(width * pixelRatio));
    const rtHeight = Math.max(1, Math.floor(height * pixelRatio));
    this.rtSceneA.setSize(rtWidth, rtHeight);
    this.rtSceneB.setSize(rtWidth, rtHeight);
    this.material.uniforms.uResolution.value.set(rtWidth, rtHeight);
  }

  /**
   * Renders Scene A (About) and Scene B (My Skills) into separate WebGLRenderTargets
   * and composites them to the screen with the Reality Stone GLSL shader.
   */
  public renderTransition(
    renderer: THREE.WebGLRenderer,
    sceneA: THREE.Scene,
    sceneB: THREE.Scene,
    sharedCamera: THREE.Camera,
    progress: number,
    elapsedTime: number
  ) {
    this.material.uniforms.uProgress.value = THREE.MathUtils.clamp(progress, 0, 1);
    this.material.uniforms.uTime.value = elapsedTime;

    // 1. Render Scene A (About Section) into offscreen render target A
    renderer.setRenderTarget(this.rtSceneA);
    renderer.clear();
    renderer.render(sceneA, sharedCamera);

    // 2. Render Scene B (Skills Section: 3D Galaxy + 3D Thanos Throne) into offscreen render target B
    renderer.setRenderTarget(this.rtSceneB);
    renderer.clear();
    renderer.render(sceneB, sharedCamera);

    // 3. Composite both render targets to screen using the Reality Stone full-screen quad shader
    renderer.setRenderTarget(null);
    renderer.render(this.postScene, this.postCamera);
  }

  public dispose() {
    this.rtSceneA.dispose();
    this.rtSceneB.dispose();
    this.material.dispose();
    this.quadMesh.geometry.dispose();
  }
}
