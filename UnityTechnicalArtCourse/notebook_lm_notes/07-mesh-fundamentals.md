# Lesson 07: Mesh Fundamentals

## What Is a Mesh?

A mesh is the **geometric data** that defines a 3D shape. It's composed of vertices, edges, and faces—always triangles in real-time rendering. In Unity, a mesh is a data container; the actual rendering is handled by other components.

Your notes have a simple diagram: three vertices connected into a triangle, with labels for positions and indices. That's the fundamental building block of all 3D geometry.

## Vertex Attributes

Here's something important to understand: a vertex isn't just a position in space. It's a bundle of attributes that the shader uses.

**Position** is a Vector3—the location in object space.

**Normal** is a Vector3—the direction the surface faces at this point. This is critical for lighting calculations.

**UV** (or UV0) is a Vector2—texture coordinates that map this vertex to a location on the texture. Values 0-1 span the full texture.

**UV2, UV3, and so on** are additional texture coordinate sets. UV2 is commonly used for lightmap UVs.

**Tangent** is a Vector4—used alongside normals for normal mapping. It defines the "right" direction for the per-pixel normal calculations.

**Color** is per-vertex color data. Useful for baking lighting, LOD transitions, or custom effects.

**BoneWeights** store skeletal animation influence for skinned meshes.

The memory adds up. A basic vertex with position, normal, and UV is about 32 bytes. Add tangent, color, and multiple UVs, and it might reach 60+ bytes. A 100K vertex mesh at 60 bytes per vertex is 6 megabytes of vertex data.

## Triangles and the Index Buffer

GPUs render triangles. All mesh faces get triangulated. But vertices are expensive, so we don't want duplicates.

The **index buffer** solves this. Instead of storing 3 vertices per triangle (which would duplicate shared corners), you store vertices once and then list which vertices form each triangle by index.

Your notes show a concise example: four vertices labeled 0, 1, 2, 3 forming a diamond shape. Triangle A uses vertices 0, 1, 2. Triangle B uses vertices 0, 2, 3. Vertex 0 and 2 are shared—we only store them once, but we reference them twice.

Without indexing, a cube with 6 faces (12 triangles) would need 36 vertices. With indexing, you need only 8 vertices plus 36 indices. Indices are cheap (just integers), so this saves significant memory.

## MeshFilter vs MeshRenderer

This distinction comes up in interviews. The two components work together but have distinct roles.

**MeshFilter** holds a reference to the Mesh asset—the actual geometry data. It has no visual effect by itself. Think of it as "what shape."

**MeshRenderer** handles how that shape gets drawn—which materials to use, shadow casting settings, lighting probe usage, bounds for culling. Think of it as "how to draw."

You need both. MeshFilter provides the geometry; MeshRenderer provides the rendering configuration.

## .mesh vs .sharedMesh

This is a common source of bugs.

**sharedMesh** gives you direct access to the shared asset. If you modify it, you're modifying the original asset—which affects every object using that mesh. This is usually what you want for read-only access.

**mesh** creates an **instance copy** of the mesh the first time you access it. Modifications only affect this instance, not the original. But it uses more memory, and if you don't clean up, you leak memory.

Rule of thumb: use `.sharedMesh` for reading. Only use `.mesh` if you actually need to modify vertex data at runtime, and make sure to destroy any created instances when done.

## SubMeshes

A single mesh can have multiple **submeshes**, each drawn with a different material.

Think of a car: the body panels might be one submesh using paint material, windows are another submesh using glass material, chrome accents are another submesh, tires are another.

Each submesh maps to an entry in the MeshRenderer's materials array. `renderer.materials[0]` draws submesh 0, `materials[1]` draws submesh 1, and so on.

The performance implication: **each submesh is a separate draw call**. A mesh with 4 submeshes draws 4 times. For optimization, you want to minimize submesh count—combine materials using atlases, or split complex objects into separate meshes only when necessary.

For VRify, CAD data often comes with many materials. Part of your pipeline work would be consolidating submeshes where possible.

## How Mesh Data Gets to the GPU

Understanding the data flow helps explain performance characteristics.

At load time, mesh data in CPU memory (vertices, indices, normals, UVs) gets **uploaded** to GPU VRAM—the Vertex Buffer and Index Buffer.

For **static meshes**, this upload happens once. The data stays in VRAM and the CPU-side copy can be discarded. Static meshes are candidates for static batching.

For **dynamic meshes** that change at runtime—procedural geometry, deforming effects—the data must be re-uploaded each time it changes. This has CPU overhead. Dynamic meshes might use dynamic batching if they're small enough.

Mark meshes as Static in the Inspector when they won't move. This enables optimizations and potentially allows Unity to discard the CPU copy.

## Bounds and Culling

Every Renderer has **bounds**—an axis-aligned bounding box (AABB) used for frustum culling and spatial queries.

**Mesh.bounds** is in local space—relative to the mesh origin.

**Renderer.bounds** is in world space—affected by the object's transform.

Culling uses these bounds. If a renderer's bounds are completely outside the camera frustum, the object is skipped entirely.

There's a subtle gotcha: the bounding box is axis-aligned, meaning it's always a rectangle aligned with world axes. When an object rotates, its AABB expands to encompass the rotated mesh. A long thin object can have a much larger AABB when rotated diagonally.

Wrong bounds cause visible objects to be culled (they pop in and out as you move). This can happen with procedural meshes if you forget to call `RecalculateBounds()`.

## Mesh Topology

Unity supports different primitive types:

**Triangles** are the default for 3D geometry.

**Lines** are for debug visualization and wireframes.

**Points** are individual vertices—used for point clouds and some particle systems.

**Quads** are legacy and get triangulated internally anyway.

For VRify, point cloud data naturally uses Points topology. But WebGL rendering of points can be inconsistent across browsers. Often point clouds are rendered as small quads (billboards) or converted to mesh patches for better cross-platform behavior.

## Creating Meshes at Runtime

Your notes include a code example of procedural mesh creation. The key steps are:

Create a new Mesh object.

Set `vertices` array with Vector3 positions.

Set `triangles` array with integer indices (groups of 3).

Call `RecalculateNormals()` to compute lighting directions.

Call `RecalculateBounds()` for correct culling.

Assign to a MeshFilter's `mesh` property.

For anything beyond trivial geometry, you'd also set UVs, tangents, and other attributes as needed.

## Key Takeaways

A mesh is geometry data: vertices with attributes plus triangle indices.

Vertex attributes include position, normal, UV, tangent, color, bone weights. Memory adds up.

Index buffers enable vertex sharing, saving memory.

MeshFilter holds the geometry; MeshRenderer draws it with materials.

Use `.sharedMesh` for read-only access; `.mesh` creates a copy.

SubMeshes allow multiple materials per mesh—each submesh is a draw call.

Bounds determine culling. Wrong bounds cause pop-in issues.

For WebGL, be aware that point primitive support varies across browsers.

Next lesson, we'll look at UI rendering—which works completely differently from 3D geometry.
