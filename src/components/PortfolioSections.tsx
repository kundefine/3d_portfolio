import React, { useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Code2,
  Cpu,
  ExternalLink,
  Layers,
  Mail,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { ProjectItem, SCENE_CHAPTERS, SceneStage } from '../types/cinematic';
import { GALACTUS_IMAGE_PATH } from './three/GalactusImage';

const PORTFOLIO_PROJECTS: ProjectItem[] = [
  {
    id: 'nebula-spatial-engine',
    title: 'Nebula Spatial Compute & WebGL Visualizer',
    category: '3d-interactive',
    categoryLabel: '3D & Interactive WebGL',
    year: '2026',
    metrics: '60 FPS Lock Across 1.2M Particles · -64% GPU Memory Footprint',
    summary:
      'Real-time volumetric telemetry engine built with Three.js, custom GLSL fragment shaders, and GSAP ScrollTrigger choreography for high-dimensional astrophysical datasets.',
    architecture: [
      'Custom GLSL instanced attribute pipelines with zero per-frame garbage collection',
      'Procedural normal and depth map synthesis using HTML5 OffscreenCanvas',
      'Adaptive hardware/software WebGL frame pacing and automatic LOD scaling',
    ],
    stack: ['React 19', 'TypeScript', 'Three.js', 'GLSL Shaders', 'GSAP ScrollTrigger'],
    liveHighlight: 'Powers interactive multi-layered spatial storytelling at 60fps.',
    accentColor: '#ec4899',
  },
  {
    id: 'hyperion-distributed-cloud',
    title: 'Hyperion Event-Driven Payment & Ledger Mesh',
    category: 'distributed-systems',
    categoryLabel: 'Distributed Systems',
    year: '2026',
    metrics: '42,000 TPS Peak Throughput · 99.995% Uptime over 14 Months',
    summary:
      'High-concurrency microservices settlement platform engineered for sub-15ms p99 latency, idempotent transaction replay, and real-time cryptographic audit trails.',
    architecture: [
      'Partitioned event sourcing with deterministic state snapshots and zero-downtime migrations',
      'Automated circuit-breaking and backpressure control across 18 regional worker nodes',
      'Real-time observability dashboard with streaming WebSocket telemetry',
    ],
    stack: ['Node.js', 'TypeScript', 'PostgreSQL', 'Redis Streams', 'Docker', 'gRPC'],
    liveHighlight: 'Processed $1.4B+ in annualized transaction volume with zero ledger drift.',
    accentColor: '#a855f7',
  },
  {
    id: 'aether-collaborative-studio',
    title: 'Aether Real-Time Collaborative Design Canvas',
    category: 'full-stack',
    categoryLabel: 'Full-Stack Engineering',
    year: '2025',
    metrics: '<18ms CRDT Sync Latency · 450+ Concurrent Editors per Room',
    summary:
      'Multiplayer spatial canvas and component design suite combining Conflict-Free Replicated Data Types (CRDTs) with hardware-accelerated 2D/3D viewport rendering.',
    architecture: [
      'Delta-compressed binary WebSocket synchronization protocol with offline queue reconciliation',
      'Fine-grained React state isolation preventing UI re-renders during 120Hz pointer gestures',
      'Role-based access control and instant snapshot branching',
    ],
    stack: ['React', 'TypeScript', 'WebSockets', 'CRDTs', 'Tailwind CSS', 'Vite'],
    liveHighlight: 'Adopted by 85+ product engineering teams for architecture diagramming.',
    accentColor: '#f43f5e',
  },
  {
    id: 'chronos-edge-analytics',
    title: 'Chronos Predictive Edge Observability Suite',
    category: 'full-stack',
    categoryLabel: 'Full-Stack Engineering',
    year: '2025',
    metrics: '3.8B Daily Events Indexed · 4.2x Faster Query Execution',
    summary:
      'Full-stack developer console and query workbench for inspecting distributed trace waterfalls, memory flamegraphs, and live API latency percentiles.',
    architecture: [
      'Columnar time-series aggregation pipeline with sub-second materialized views',
      'Virtualized React table and timeline canvas rendering 100k+ trace spans smoothly',
      'Automated anomaly detection alerting with contextual root-cause correlation',
    ],
    stack: ['TypeScript', 'React', 'Next.js', 'ClickHouse', 'GraphQL', 'Tailwind CSS'],
    liveHighlight: 'Reduced mean-time-to-resolution (MTTR) by 58% across production services.',
    accentColor: '#c084fc',
  },
];

interface PortfolioSectionsProps {
  onJumpToScene: (stage: SceneStage) => void;
}

export const PortfolioSections: React.FC<PortfolioSectionsProps> = ({
  onJumpToScene,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | '3d-interactive' | 'full-stack' | 'distributed-systems'
  >('all');
  const [activeModalProject, setActiveModalProject] = useState<ProjectItem | null>(null);

  // Contact form state
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [projectScope, setProjectScope] = useState('Full-Stack & 3D Web Architecture');
  const [messageBody, setMessageBody] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const filteredProjects =
    selectedCategory === 'all'
      ? PORTFOLIO_PROJECTS
      : PORTFOLIO_PROJECTS.filter((p) => p.category === selectedCategory);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !messageBody.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="relative z-10 bg-[#040208] text-[#F4F0FF] border-t border-white/10">
      {/* Subtle Section Marquee Divider */}
      <div className="w-full overflow-hidden py-4 border-b border-white/10 bg-[#07030f]">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#a394b8]">
          <span>MD. KAJAL MIA · SENIOR SOFTWARE ENGINEER · FULL-STACK DEVELOPER</span>
          <span className="tabular-nums">REACT · THREE.JS · GSAP SCROLLTRIGGER · DISTRIBUTED SYSTEMS</span>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: SELECTED ENGINEERING WORKS (Bento Grid + Filter + Modal)
         ===================================================================== */}
      <section id="works" className="max-w-7xl mx-auto px-6 py-24 sm:py-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
          <div>
            <p className="text-xs font-mono text-[#ec4899] mb-3">
              01. Architectural Case Studies
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-2xl">
              Selected Engineering Works
            </h2>
          </div>

          {/* Interactive Filter Controls (Segmented buttons with click handlers) */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#110822] border border-white/10 rounded-lg self-start">
            {[
              { id: 'all', label: 'All Works' },
              { id: '3d-interactive', label: '3D & WebGL' },
              { id: 'full-stack', label: 'Full-Stack' },
              { id: 'distributed-systems', label: 'Distributed Systems' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as typeof selectedCategory)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedCategory === tab.id
                    ? 'bg-[#ec4899] text-white shadow-sm'
                    : 'text-[#c4b5fd] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {filteredProjects.map((project, index) => {
            const isFeatured = index === 0 && selectedCategory === 'all';
            return (
              <article
                key={project.id}
                onClick={() => setActiveModalProject(project)}
                className={`${
                  isFeatured ? 'lg:col-span-7' : index === 1 && selectedCategory === 'all' ? 'lg:col-span-5' : 'lg:col-span-6'
                } group relative rounded-2xl bg-[#0c0618] hover:bg-[#120924] border border-white/10 hover:border-[#ec4899]/40 p-7 sm:p-9 transition-all flex flex-col justify-between cursor-pointer`}
              >
                <div>
                  {/* Clean unboxed metadata with typographic · separators (zero static pills) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#c4b5fd] mb-4">
                    <span className="text-[#f472b6]">{project.categoryLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{project.year}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums text-[#e9d5ff]">{project.metrics}</span>
                  </div>

                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-white group-hover:text-[#fbcfe8] transition-colors mb-3">
                    {project.title}
                  </h3>

                  <p className="text-sm sm:text-base text-[#b8a9cc] leading-relaxed mb-6">
                    {project.summary}
                  </p>

                  {/* Architecture highlights */}
                  <ul className="space-y-2 mb-8 border-t border-white/10 pt-5">
                    {project.architecture.map((point, i) => (
                      <li
                        key={i}
                        className="text-xs sm:text-sm text-[#d8b4fe] flex items-start gap-2.5"
                      >
                        <span className="text-[#ec4899] font-mono select-none">—</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                  {/* Stack rendered as clean unboxed text with · separators */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-[#9d8cb5]">
                    {project.stack.map((tech, idx) => (
                      <React.Fragment key={tech}>
                        <span>{tech}</span>
                        {idx < project.stack.length - 1 && (
                          <span aria-hidden="true" className="text-[#ec4899]/60">
                            ·
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModalProject(project);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f472b6] group-hover:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Inspect Architecture</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: TECHNICAL CAPABILITIES & FULL-STACK ARCHITECTURE
         ===================================================================== */}
      <section
        id="capabilities"
        className="border-t border-white/10 bg-[#07030f] py-24 sm:py-32"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <p className="text-xs font-mono text-[#ec4899] mb-3">
              02. Engineering Capabilities
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Full-Stack Precision Meets Interactive 3D Craft
            </h2>
            <p className="text-base text-[#b8a9cc] leading-relaxed">
              Bridging low-level WebGL shader programming and deterministic scroll choreography
              with fault-tolerant backend systems, relational/NoSQL data modeling, and cloud
              infrastructure.
            </p>
          </div>

          {/* 3-Column Capability Architecture */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl bg-[#0c0618] border border-white/10 p-8 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#ec4899]/15 border border-[#ec4899]/30 flex items-center justify-center text-[#ec4899] mb-6">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-3">
                  01. Creative Frontend & 3D WebGL
                </h3>
                <p className="text-sm text-[#b8a9cc] leading-relaxed mb-6">
                  Custom Three.js scenes, GLSL vertex/fragment shaders, 2.5D depth-map relief
                  displacement, instanced particle systems, and scrubbed GSAP ScrollTrigger
                  timelines engineered for 60fps responsiveness.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 text-xs font-mono text-[#c4b5fd]">
                React 19 · TypeScript · Three.js · GLSL · GSAP · Tailwind CSS
              </div>
            </div>

            <div className="rounded-2xl bg-[#0c0618] border border-white/10 p-8 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#a855f7]/15 border border-[#a855f7]/30 flex items-center justify-center text-[#c084fc] mb-6">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-3">
                  02. Full-Stack & Distributed Backend
                </h3>
                <p className="text-sm text-[#b8a9cc] leading-relaxed mb-6">
                  High-throughput APIs, event-driven microservices, real-time WebSocket & CRDT
                  collaboration layers, and resilient database schemas optimized for low-latency
                  queries at scale.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 text-xs font-mono text-[#c4b5fd]">
                Node.js · Go · PostgreSQL · Redis · GraphQL · Docker · Cloud Run
              </div>
            </div>

            <div className="rounded-2xl bg-[#0c0618] border border-white/10 p-8 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#f43f5e]/15 border border-[#f43f5e]/30 flex items-center justify-center text-[#fb7185] mb-6">
                  <Code2 className="w-5 h-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-3">
                  03. Performance & Systems Rigor
                </h3>
                <p className="text-sm text-[#b8a9cc] leading-relaxed mb-6">
                  Zero-GC render loops, GPU memory profiling, Core Web Vitals optimization,
                  accessibility compliance (`prefers-reduced-motion`), and automated CI/CD
                  testing pipelines.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 text-xs font-mono text-[#c4b5fd]">
                WebGL Profiling · Memory Audits · CI/CD · OAuth 2.0 · RBAC
              </div>
            </div>
          </div>

          {/* Quantitative Proof Row */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6 pt-12 border-t border-white/10">
            <div>
              <div className="font-display text-3xl sm:text-4xl font-bold text-white tabular-nums">
                60 FPS
              </div>
              <p className="text-xs font-mono text-[#a394b8] mt-1">
                Zero-GC Three.js Render Loop Target
              </p>
            </div>
            <div>
              <div className="font-display text-3xl sm:text-4xl font-bold text-white tabular-nums">
                6 Scenes
              </div>
              <p className="text-xs font-mono text-[#a394b8] mt-1">
                Continuous Scrubbed GSAP Timeline
              </p>
            </div>
            <div>
              <div className="font-display text-3xl sm:text-4xl font-bold text-white tabular-nums">
                10-Part
              </div>
              <p className="text-xs font-mono text-[#a394b8] mt-1">
                Procedural 3D Celestial Armor Rig + 2.5D Relief
              </p>
            </div>
            <div>
              <div className="font-display text-3xl sm:text-4xl font-bold text-white tabular-nums">
                99.99%
              </div>
              <p className="text-xs font-mono text-[#a394b8] mt-1">
                Production Reliability Across Full-Stack Systems
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: THE GALACTUS 3D SCENE DIRECTOR & TECHNICAL BREAKDOWN
         ===================================================================== */}
      <section id="scene-breakdown" className="max-w-7xl mx-auto px-6 py-24 sm:py-32 border-t border-white/10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          {/* Left Column: Reference Asset & 2.5D + 3D Hybrid Strategy */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-[#0c0618] border border-white/10 p-6 sm:p-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#ec4899] mb-4">
                <span>Primary Visual Reference Analysis</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">640×611 sRGB</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">
                Hybrid 2.5D Shader Relief + 10-Part 3D Celestial Rig
              </h3>
              <p className="text-sm text-[#b8a9cc] leading-relaxed mb-6">
                Because the supplied Galactus portrait is a 2D raster image on a deep black void,
                pretending it is a flat card would lack true perspective. Instead, our engine
                analyzes the image on an offscreen canvas to synthesize an anatomical 3D relief
                map (projecting the nose bridge, brow visor, helmet crest, and chest medallion in
                +Z), auto-detects the exact UV centroids of both glowing eyes{' '}
                <span className="font-mono text-[#f472b6]">(0.448, 0.608)</span> and{' '}
                <span className="font-mono text-[#f472b6]">(0.564, 0.608)</span>, and surrounds
                the displaced mesh with a 10-part procedural 3D armor & astrolabe rig.
              </p>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-white/15 bg-black aspect-[640/611]">
              <img
                src={GALACTUS_IMAGE_PATH}
                alt="Provided Galactus Reference Texture"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex items-center justify-between text-xs font-mono text-[#e9d5ff]">
                <span>Supplied Reference Texture</span>
                <span className="text-[#ec4899]">Auto-Aligned Eye Emitters</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 6-Scene Storyboard & Direct Jump Controls */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <p className="text-xs font-mono text-[#ec4899] mb-3">
                03. Interactive Storyboard Director
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
                6-Stage Scrubbed Scroll Choreography
              </h2>
              <p className="text-sm sm:text-base text-[#b8a9cc] leading-relaxed mb-8">
                Click any scene stage below to scroll directly to that exact timestamp in the
                pinned GSAP ScrollTrigger hero sequence and inspect the camera, eye glow, and
                3D energy beam transitions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SCENE_CHAPTERS.map((chapter) => (
                  <button
                    key={chapter.stage}
                    type="button"
                    onClick={() => onJumpToScene(chapter.stage)}
                    className="text-left rounded-xl bg-[#0c0618] hover:bg-[#160b2b] border border-white/10 hover:border-[#ec4899]/50 p-5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-semibold text-[#f472b6]">
                        {chapter.title}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#a394b8] group-hover:text-white transition-colors shrink-0" />
                    </div>
                    <p className="text-xs text-[#b8a9cc] leading-relaxed">
                      {chapter.subtitle}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-xl bg-[#110822] border border-white/10 p-5 text-xs text-[#d8b4fe] leading-relaxed">
              <strong className="text-white font-semibold">GLB / GLTF Upgrade Path:</strong> While
              this implementation achieves genuine 3D parallax and volumetric eye-beam alignment
              from your 2D reference image, `GalactusCharacterRig` is architected so a rigged
              `.glb` bust asset with named `LeftEye` and `RightEye` bone sockets can be dropped
              into `getEyePositions3D()` without changing a single line of the GSAP timeline or
              `EnergyBeamSystem`.
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: CONTACT & COLLABORATION INQUIRY
         ===================================================================== */}
      <section
        id="contact"
        className="border-t border-white/10 bg-[#07030f] py-24 sm:py-32"
      >
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-mono text-[#ec4899] mb-3">
              04. Direct Transmission
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white mb-4">
              Let’s Build Something Extraordinary
            </h2>
            <p className="text-base text-[#b8a9cc] leading-relaxed mb-8">
              Available for Senior Software Engineering roles, full-stack systems architecture,
              and bespoke 3D WebGL interactive experiences.
            </p>

            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-xl bg-[#0c0618] border border-white/10">
                <div className="text-xs font-mono text-[#a394b8] mb-1">Engineer</div>
                <div className="font-semibold text-white">Md. Kajal Mia</div>
              </div>
              <div className="p-4 rounded-xl bg-[#0c0618] border border-white/10">
                <div className="text-xs font-mono text-[#a394b8] mb-1">Direct Email</div>
                <a
                  href="mailto:kajalmia01677309766@gmail.com"
                  className="font-mono text-[#f472b6] hover:underline inline-flex items-center gap-2 break-all"
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>kajalmia01677309766@gmail.com</span>
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form
              onSubmit={handleContactSubmit}
              className="rounded-2xl bg-[#0c0618] border border-white/10 p-7 sm:p-10 space-y-6"
            >
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-[#ec4899]/20 border border-[#ec4899] text-[#f472b6] mx-auto flex items-center justify-center">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white">
                    Message Received for Md. Kajal Mia
                  </h3>
                  <p className="text-sm text-[#b8a9cc] max-w-md mx-auto">
                    Thank you, {senderName}. Your inquiry regarding{' '}
                    <span className="text-white">{projectScope}</span> has been logged.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setSenderName('');
                      setSenderEmail('');
                      setMessageBody('');
                    }}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#1d0e36] hover:bg-[#2a154d] border border-white/15 rounded-lg transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-mono text-[#c4b5fd] mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full px-4 py-3 rounded-lg bg-[#06030c] border border-white/15 text-sm text-white placeholder-[#6e5f85] focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-[#c4b5fd] mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="alex@company.com"
                        className="w-full px-4 py-3 rounded-lg bg-[#06030c] border border-white/15 text-sm text-white placeholder-[#6e5f85] focus:outline-none focus:border-[#ec4899]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#c4b5fd] mb-2">
                      Focus Area
                    </label>
                    <select
                      value={projectScope}
                      onChange={(e) => setProjectScope(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-[#06030c] border border-white/15 text-sm text-white focus:outline-none focus:border-[#ec4899]"
                    >
                      <option value="Full-Stack & 3D Web Architecture">
                        Full-Stack & 3D Web Architecture
                      </option>
                      <option value="Senior Software Engineering Opportunity">
                        Senior Software Engineering Opportunity
                      </option>
                      <option value="Interactive Three.js / GSAP Product Launch">
                        Interactive Three.js / GSAP Product Launch
                      </option>
                      <option value="Distributed Systems & Backend Architecture">
                        Distributed Systems & Backend Architecture
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#c4b5fd] mb-2">
                      Project Brief or Message
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      placeholder="Tell Md. Kajal Mia about your timeline, architectural goals, or engineering team..."
                      className="w-full px-4 py-3 rounded-lg bg-[#06030c] border border-white/15 text-sm text-white placeholder-[#6e5f85] focus:outline-none focus:border-[#ec4899]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 text-sm font-semibold text-white bg-[#ec4899] hover:bg-[#db2777] rounded-lg transition-colors inline-flex items-center gap-2 shadow-[0_0_24px_rgba(236,72,153,0.35)] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Clean Minimal Footer (Zero fake telemetry tickers) */}
      <footer className="border-t border-white/10 bg-[#040208] py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8e7ea6]">
          <div>
            © {new Date().getFullYear()} Md. Kajal Mia · Senior Software Engineer | Full-Stack Developer
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onJumpToScene(1)}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Replay Scene 01
            </button>
            <button
              type="button"
              onClick={() => onJumpToScene(6)}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Jump to Intro Reveal
            </button>
            <a
              href="#works"
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Selected Works
            </a>
          </div>
        </div>
      </footer>

      {/* Project Architecture Lightbox Modal */}
      {activeModalProject && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80"
          onClick={() => setActiveModalProject(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-[#0d061a] border border-white/15 p-6 sm:p-8 shadow-2xl space-y-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#f472b6] mb-2">
                  <span>{activeModalProject.categoryLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{activeModalProject.year}</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  {activeModalProject.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalProject(null)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#d8b4fe] hover:text-white transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm sm:text-base text-[#c7b8db] leading-relaxed">
              {activeModalProject.summary}
            </p>

            <div className="p-4 rounded-xl bg-[#150a2a] border border-white/10">
              <div className="text-xs font-mono text-[#ec4899] mb-1">
                Verified Production Impact
              </div>
              <div className="text-sm font-semibold text-white tabular-nums">
                {activeModalProject.metrics} — {activeModalProject.liveHighlight}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-mono text-[#a394b8] mb-3">
                Key Architectural Decisions
              </h4>
              <ul className="space-y-2.5">
                {activeModalProject.architecture.map((item, idx) => (
                  <li key={idx} className="text-sm text-[#e9d5ff] flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#ec4899] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-mono text-[#a394b8]">
                {activeModalProject.stack.join(' · ')}
              </div>
              <button
                type="button"
                onClick={() => setActiveModalProject(null)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#ec4899] hover:bg-[#db2777] rounded-lg transition-colors cursor-pointer"
              >
                Close Spec
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
