# Course Overview: Unity Technical Artist Fundamentals

This is a focused crash course on the technical foundations every Unity Technical Artist should know—particularly for roles involving real-time 3D visualization in browsers.

## What This Course Covers

The curriculum is organized into four groups:

**Foundations** (Lessons 1-3)
1. **Engine Loop** — How Unity's frame loop works, Update vs FixedUpdate, frame-rate independence
2. **Render Pipeline** — Culling, batching, draw calls, and the journey from scene to screen
3. **Shaders** — Vertex and fragment stages, ShaderLab structure, variants and compilation

**Rendering Deep Dive** (Lessons 4-6)
4. **Forward vs Deferred** — Comparing rendering paths and when to use each
5. **URP Settings** — Configuring Universal Render Pipeline for performance
6. **GPU Architecture** — SIMD execution, warp divergence, memory hierarchy

**Geometry & UI** (Lessons 7-8)
7. **Mesh Fundamentals** — Vertex attributes, index buffers, MeshFilter/MeshRenderer
8. **UI Rendering** — Canvas modes, batching, rebuilds, and overdraw

**Pipeline & Automation** (Lessons 9-13)
9. **3D File Formats** — CAD, geospatial, and exchange formats; coordinate precision
10. **Mesh Optimization** — Decimation, hole repair, LOD generation
11. **WebGL & Browser** — Memory constraints, texture compression, load time
12. **Unity Asset Transform** — Native CAD import and automation
13. **Editor Automation** — Building tools with AssetPostprocessors and Editor scripting

**Shading Deep Dive** (Lesson 15)
15. **Lighting Algorithms** — Lambert, Blinn-Phong, Fresnel; how vertex data reaches pixels

**Advanced Rendering** (Lesson 16-19)
16. **GPU Instancing** — Procedural drawing, phantom geometry, and rendering 100k+ objects
16e. **Advanced API Internals** — Memory architecture, buffer initialization, and low-level C# implementation
17. **Compute Shaders** — WebGPU, kernels, and simulation handling without CPU
18. **Render Features** — Custom passes, command buffers, and pipeline injection
19. **Rendering Techniques** — Shadows at scale, stencils, and depth buffer hacks

## Context


This course emphasizes browser-based (WebGL) constraints and automation workflows for ingesting diverse 3D data at scale—skills relevant to digital twin platforms, geospatial visualization, and industrial applications.

*This material was prepared for a Technical Artist interview at VRify, a company building browser-based digital twins for the mining industry.*

The **Cheat Sheet** (Lesson 14) provides a consolidated quick reference of all key concepts.
