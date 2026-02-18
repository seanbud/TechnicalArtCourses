# Lesson 10: Mesh Optimization

## Why Optimize?

Real-time rendering has a budget. A browser-based visualization might target 100,000 to 500,000 triangles total on screen at any moment. Meanwhile, a single detailed CAD export might contain millions of triangles.

The math doesn't work unless you optimize. This lesson covers the techniques: decimation to reduce triangle count, hole detection and repair to fix mesh issues, and LOD systems to dynamically adjust detail by distance.

## Decimation: Reducing Triangle Count

Decimation is the process of reducing a mesh's complexity while preserving its visual appearance. The standard algorithm is called **Quadric Error Metrics** (QEM).

Here's the intuition. QEM assigns a "cost" to collapsing each edge—merging its two vertices into one. The cost estimates how much the surface shape changes if that edge is removed. Flat areas have low collapse cost (removing triangles changes almost nothing visually). Corners, edges, and details have high collapse cost (removing triangles destroys the shape).

The algorithm repeatedly collapses the lowest-cost edge, recalculates costs for affected edges, and repeats until you reach your target triangle count.

Your notes have a diagram showing this. On the left, a dense mesh. Arrow pointing to QEM processing. On the right, a simplified mesh that looks similar but has far fewer triangles.

The key insight: decimation is not uniform reduction. It intelligently preserves sharp edges and removes triangles where they're least needed.

Feature preservation considerations:

**Sharp edges** need special handling. Some decimators can detect and lock edges based on angle thresholds.

**UV seams** can be distorted by decimation. If vertex positions change, UV mapping stretches.

**Vertex colors** must be interpolated when vertices collapse.

For VRify, you'd typically expose decimation targets per asset type—perhaps 50% reduction for facility buildings, 75% reduction for terrain meshes, minimal reduction for critical equipment.

## Hole Detection and Repair

CAD exports and scans often have holes—missing geometry, gaps between parts, non-manifold edges.

**Manifold geometry** is "watertight"—every edge is shared by exactly two faces, and the surface completely encloses a volume.

**Non-manifold geometry** has issues: holes (edges with only one face), overlapping faces, vertices shared in unusual ways.

Why does this matter? Non-manifold meshes cause rendering artifacts, break some optimization algorithms, and fail certain operations like boolean combinations.

Hole detection algorithm (simplified):

Find all edges in the mesh. Count how many faces share each edge. Any edge shared by only one face is a **boundary edge**—it's on the edge of a hole. Connected boundary edges form hole loops. The algorithm then fills these loops with new triangles.

Your notes show a visual: a mesh with gaps, boundary edges highlighted in red, then the same mesh with the holes filled.

Common repair operations:

**Hole filling** generates new triangles to close gaps. Simple fills just connect boundary vertices; advanced fills try to match surrounding curvature.

**Normal flipping** fixes faces that point the wrong direction—usually from modeling errors or coordinate system confusion.

**Vertex welding** merges vertices that are nearly coincident but not actually connected—common from combining separate meshes.

**Degenerate removal** eliminates triangles with zero area (collapsed triangles, slivers).

## Level of Detail (LOD)

LOD is the practice of using simpler geometry when objects are far from the camera.

The principle: a building 500 meters away only occupies a few pixels on screen. Rendering it at full 10,000-triangle detail is wasteful—those triangles become sub-pixel and don't contribute to visual quality.

Instead, prepare multiple versions:

**LOD 0**: Full detail (10,000 triangles). Used when close.
**LOD 1**: Medium detail (3,000 triangles). Used at medium distance.
**LOD 2**: Low detail (500 triangles). Used far away.
**LOD 3**: Impostor or billboard. A simple flat quad with a baked texture. Used very far away.

Unity's **LODGroup** component manages this. You assign meshes to LOD levels and define distance thresholds (or screen-size thresholds). Unity automatically switches between levels.

Your notes have a diagram showing a building at different LODs with their triangle counts and distance ranges.

LOD generation can be automated using decimation. Start with LOD0, decimate to 30% for LOD1, decimate to 10% for LOD2.

For VRify's geospatial scenes with potentially huge view distances, LOD is essential. Objects kilometers away should be extremely simplified or represented as impostors.

## Cross-Fade vs Pop

When switching between LOD levels, there are two approaches:

**Pop** is an instant switch. At the threshold distance, LOD0 disappears and LOD1 appears. It's fast but visible—you see objects "pop" to different detail levels.

**Cross-fade** blends between levels over a distance range. Both meshes render with varying opacity, creating a smooth transition. It looks better but costs more—you render both meshes for the duration of the blend.

In URP, cross-fade uses dithering rather than true transparency, which is cheaper than alpha blending.

For browser performance, you might prefer pop transitions despite the visual artifact—the rendering cost of cross-fading may not be worth it.

## Practical Guidelines

Here are practical numbers to keep in mind:

For browser targets, aim for 100K-300K total triangles on screen. That's everything visible combined.

Individual objects might range from 100 triangles (simple props) to 10,000 triangles (hero assets), with most in between.

LOD thresholds depend on object size. A small rock might switch to LOD1 at 10 meters. A large building might keep LOD0 until 50 meters.

Screen-size thresholds (percentage of screen height) are often better than distance thresholds—they account for camera FOV and object scale automatically.

## Key Takeaways

Decimation reduces triangle count while preserving shape. QEM prioritizes collapsing where visual change is minimal.

Feature preservation (sharp edges, UV seams) requires attention during decimation.

Hole detection finds boundary edges (edges with only one face). Repair fills these holes with new geometry.

Common repairs: hole filling, normal flipping, vertex welding, degenerate removal.

LOD uses simpler meshes at greater distances—essential for large scenes.

LODGroup component manages automatic switching. Define screen-size or distance thresholds.

Cross-fade transitions look better but cost more. Pop transitions are cheaper but visually abrupt.

For browser targets, aggressive LOD and optimization are necessary to hit performance budgets.

Next lesson, we'll look at WebGL-specific constraints and browser optimization strategies.
