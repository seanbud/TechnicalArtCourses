# Master Cheat Sheet: Unity Technical Artist Quick Reference

## How to Use This Document

This cheat sheet consolidates the key concepts from all 13 lessons. Use it for quick review before an interview, or pull it into NotebookLM alongside specific lessons for focused podcast generation.

---

## Lesson 01: Engine Loop

**Core Concept**: Unity runs a deterministic frame loop—Physics → Game Logic → Rendering → repeat.

**Key Functions**:
- `Update()`: Once per frame, variable timing via `Time.deltaTime`
- `FixedUpdate()`: Fixed timestep (default 0.02s), runs multiple times to catch up if frames are slow
- `LateUpdate()`: After animation, ideal for camera follow

**Critical Rule**: Always multiply movement by `Time.deltaTime` in Update for frame-rate independence.

**WebGL Note**: Single-threaded. Heavy Update blocks everything.

---

## Lesson 02: Render Pipeline

**Five Stages**: Culling → Collecting → Batching → GPU Execution → Output

**Culling Types**:
- Frustum: Skip objects outside camera view pyramid
- Occlusion: Skip objects hidden behind walls (needs baked data)

**Render Queue Order**: Background (1000) → Geometry (2000) → AlphaTest (2450) → Transparent (3000) → Overlay (4000)

**Sorting**: Opaque = front-to-back (for early-Z). Transparent = back-to-front (for correct blending).

**Batching Types**:
- Static: Pre-merge immovable meshes (memory trade-off)
- Dynamic: Runtime merge small meshes (CPU overhead)
- GPU Instancing: Same mesh, many copies, one call
- SRP Batcher: Reduces *cost* per call, not call count

---

## Lesson 03: Shaders

**Key Stages**: Vertex Shader (per-vertex, transforms position) → Rasterization (fixed function, creates fragments) → Fragment Shader (per-pixel, calculates color)

**ShaderLab Structure**: Shader → Properties → SubShader → Tags → Pass → HLSL code

**Variants**: Keywords create compiled variants. Use `shader_feature` to strip unused. Variants compile at first use in browser—causes stalls.

**Compute Shaders**: Not part of graphics pipeline. General-purpose GPU. **Not supported in WebGL 2.0**.

---

## Lesson 04: Forward vs Deferred

| Aspect | Forward | Deferred | Forward+ |
|--------|---------|----------|----------|
| Many Lights | Limited | Excellent | Excellent |
| MSAA | ✓ | ✗ | ✓ |
| Transparency | Easy | Hard | Easy |
| Memory | Low | High | Medium |
| WebGL | Best | Avoid | Limited |

**VRify Recommendation**: Forward rendering for browser targets.

---

## Lesson 05: URP Settings

**Key Settings for Browser**:
- Render Path: Forward
- HDR: Off
- MSAA: 2x or Off (use FXAA)
- Shadows: 512-1024 resolution, 1-2 cascades, minimal distance
- SRP Batcher: Enabled

**SRP Batcher**: Caches material data in GPU buffer—reduces CPU overhead per draw call.

**Camera Stacking**: Base Camera (3D world) + Overlay Cameras (UI layers).

---

## Lesson 06: GPU Architecture

**SIMD**: Single Instruction, Multiple Data. 32-64 threads execute same instruction simultaneously.

**Warp Divergence**: Branching forces execution of all paths. Uniform branches (same for all threads) are okay. Per-pixel branches are expensive.

**Memory Hierarchy** (fast to slow): Registers → Shared Memory → L1/L2 Cache → Texture Cache → Global VRAM

**Texture2D Arrays**: Bundle same-size textures, sample with layer index. Enables batching with texture variety.

**Compute Shaders**: Powerful but **unavailable in WebGL 2.0**.

---

## Lesson 07: Mesh Fundamentals

**Vertex Attributes**: Position, Normal, UV, Tangent, Color, BoneWeights. Memory adds up (~32-60 bytes per vertex).

**Index Buffer**: Stores which vertices form each triangle, enabling vertex sharing.

**Components**: MeshFilter (geometry data) + MeshRenderer (how to draw).

**Access**: `.sharedMesh` for read-only. `.mesh` creates instance copy.

**SubMeshes**: Multiple materials per mesh. Each submesh = separate draw call.

**Bounds**: AABB for frustum culling. Call `RecalculateBounds()` after procedural changes.

---

## Lesson 08: UI Rendering

**Canvas Modes**:
- Screen Space Overlay: Always on top, ignores cameras
- Screen Space Camera: Rendered by specific camera
- World Space: Exists as 3D object in scene

**Batching Rule**: Same texture + same material = batches. Different breaks it.

**Canvas Rebuild**: When any element changes, whole Canvas regenerates mesh. Solution: Separate static and dynamic content into different Canvases.

**Overdraw**: Stacked transparent panels draw pixels multiple times. Disable Raycast Target on decorative elements. Use Overdraw view to diagnose.

**Text**: Use TextMeshPro with SDF fonts for crisp rendering at any size.

---

## Lesson 09: 3D File Formats

**Format Categories**:
- Universal: OBJ (basic), FBX (rich), glTF/GLB (web-optimized)
- CAD: STEP, IGES (need tessellation)
- Geospatial: DXF (2D/3D), LAS/LAZ (point clouds)

**Tessellation Controls**: Chord tolerance (surface deviation), angle tolerance (normal smoothness).

**Coordinate Precision Problem**: Floats lose precision at large values. Mining sites at world coordinates cause jitter.

**Solution**: **Origin Shifting**—subtract reference point to keep coordinates small.

```csharp
Vector3 localCoord = worldCoord - referenceOrigin;
```

---

## Lesson 10: Mesh Optimization

**Decimation (QEM)**: Collapses edges with lowest visual impact. Preserves sharp features, removes triangles in flat areas.

**Hole Detection**: Find boundary edges (edges with only one face). Fill loops with new triangles.

**Common Repairs**: Hole filling, normal flipping, vertex welding, degenerate removal.

**LOD (Level of Detail)**:
- LOD0: Full detail, close range
- LOD1-2: Reduced detail, medium-far
- LOD3: Billboard/impostor, very far

Use LODGroup component. Screen-size thresholds often better than distance.

---

## Lesson 11: WebGL Constraints

**Memory Limits**: 2-4GB desktop, 256MB-1GB mobile. Budget textures and meshes carefully.

**Texture Compression**:
- ETC2: Standard for WebGL 2.0 (4:1)
- ASTC: Newer, variable ratios, check support

**Load Time**: Use Brotli compression. Use Addressables to split content.

**Shader Stalls**: Compilation at first use. Pre-warm with variant collections.

**Single-Threaded**: Heavy work freezes browser. Optimize aggressively.

**Browser Testing**: Chrome, Firefox, Safari, Edge. Low-end Android is stress test.

---

## Lesson 12: Unity Asset Transform

**Purpose**: Native CAD import (STEP, IGES, JT) with tessellation, decimation, and LOD generation.

**Capabilities**:
- Import native CAD formats
- Control tessellation quality
- Automatic decimation
- Generate LOD chains
- Preserve hierarchy
- Map materials

**Licensing**: Full features require industrial license.

**Scripting**: API enables automation for multi-client pipelines.

---

## Lesson 13: Editor Automation

**Editor Folder Rule**: Scripts in "Editor" folder are excluded from builds.

**Tooling Types**:
| Type | Purpose |
|------|---------|
| Menu Item | Simple command entry |
| Editor Window | Custom UI panel |
| Custom Inspector | Override property display |
| AssetPostprocessor | Automatic import processing |
| ScriptableWizard | One-off task with settings |

**AssetPostprocessor**: Key for automation. Runs on every import. Enforce standards automatically.

```csharp
void OnPreprocessModel() {
    ModelImporter importer = (ModelImporter)assetImporter;
    importer.optimizeMeshPolygons = true;
}
```

---

## Lesson 15: Lighting Algorithms

**Interpolation**: GPU blends vertex attributes across triangles using barycentric coordinates. Re-normalize normals in fragment shader.

**Lambert Diffuse**: `max(0, dot(N, L))` — matte surface lighting foundation.

**Half-Lambert**: `(N·L) * 0.5 + 0.5` — Valve's trick for softer shadows.

**Blinn-Phong Specular**: Uses half vector `H = normalize(L + V)`. Industry standard.
```hlsl
float spec = pow(max(0, dot(N, H)), shininess);
```

**Fresnel**: `pow(1 - dot(N, V), power)` — edge glow at grazing angles.

**TBN Matrix**: Transforms normal map data from tangent space to world space.

**Classic Equation**: `Final = Ambient + Diffuse + Specular`

---

## VRify Interview Quick Points


1. **Pipeline Engineering**: Position yourself as building systems, not just fixing assets.

2. **Scale Challenge**: 250+ clients sending uncoordinated data requires automation, not manual review.

3. **WebGL First**: Forward rendering, aggressive LOD, texture compression, minimal memory footprint.

4. **Origin Shifting**: Essential for geospatial precision. Know the float precision problem and solution.

5. **AssetPostprocessor**: Your tool for enforcing standards at scale.

6. **SRP Batcher**: Modern URP optimization. Reduces CPU cost, not draw count.

7. **Warp Divergence**: Why branching hurts GPU performance. Keep branches uniform or trivial.

8. **UAT Knowledge**: Demonstrates awareness of industrial CAD workflows.

---

Good luck with your interview!
