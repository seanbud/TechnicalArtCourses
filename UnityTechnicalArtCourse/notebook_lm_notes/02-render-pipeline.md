# Lesson 02: Render Pipeline Overview

## The Journey of a Triangle

In the last lesson, we ended with the "Rendering" phase of Unity's frame loop. Now let's crack that open and see what actually happens.

Every frame, Unity needs to transform your 3D scene—all those GameObjects with meshes, materials, and positions—into a flat 2D image on the screen. This is a multi-stage pipeline, and understanding it will help you diagnose performance problems and make smart optimization decisions.

The pipeline has five main stages: **Culling** (what can we skip?), **Collecting** (gather what needs to render), **Batching** (group things efficiently), **GPU Execution** (the actual graphics work), and **Output** (final image).

## Stage 1: Culling — What Can We Skip?

Before Unity draws anything, it figures out what *doesn't* need to be drawn. This is critical for performance—the fastest draw call is the one you don't make.

**Frustum Culling** is the first check. The camera's view is shaped like a truncated pyramid called a frustum—near plane at the front, far plane at the back, and sides angling outward. Any object completely outside this volume gets skipped entirely. Unity doesn't check every triangle for this; instead, it uses the object's bounding box for a fast test. This is why `Renderer.bounds` matters for culling accuracy.

**Occlusion Culling** is the second check. Even if an object is inside the frustum, if it's completely hidden behind a wall or other geometry, we can skip it. This requires pre-baked occlusion data—Unity builds a spatial database of what can occlude what. It's particularly valuable for interior scenes with rooms and walls.

## Stage 2: Collecting Renderables

After culling, Unity gathers everything that has a Renderer component—MeshRenderers, SkinnedMeshRenderers, SpriteRenderers, and so on.

These get sorted by their material's **Render Queue** value. The render queue determines draw order:

Background is queue 1000—skyboxes and backdrop elements.
Geometry is queue 2000—this is the default for opaque objects.
AlphaTest is queue 2450—things like grass and leaves with cutout transparency.
Transparent is queue 3000—objects that need alpha blending.
Overlay is queue 4000—UI elements and lens flares.

Here's the sorting strategy that often trips people up:

**Opaque objects** are sorted front-to-back. Why? Because of Early-Z rejection. When the GPU draws a pixel and writes its depth to the depth buffer, subsequent pixels that are *behind* that get rejected early—they fail the depth test before the expensive fragment shader runs. By drawing front objects first, you reject more back objects early.

**Transparent objects** are sorted back-to-front. Why? Because alpha blending needs to know what's behind the transparent object to blend correctly. You have to draw the back layer first, then blend the front layer on top.

This distinction between opaque and transparent sorting is fundamental to how 3D rendering works.

## Stage 3: Batching — The Painter Metaphor

Now we get to something directly relevant to your VRify interview. Every time Unity tells the GPU to draw something, it issues a **draw call**. Each draw call has overhead—state setup, buffer binding, command submission.

Think of it like a painter who has to change brushes. If the painter does all the red strokes, then all the blue strokes, they only change brushes once. But if they alternate red-blue-red-blue, they're constantly switching, wasting time.

In rendering, **materials trigger brush changes**. Each unique material—or material with different property values—typically requires a separate draw call.

Unity has several batching strategies to reduce draw call count:

**Static Batching** combines meshes marked as Static at build time. Unity literally merges them into one big mesh in memory. The objects can't move at runtime, but they draw in fewer calls. The trade-off is higher memory usage.

**Dynamic Batching** combines small meshes (under 300 vertices) at runtime. This has CPU overhead each frame to perform the combination, so it's often disabled because the overhead exceeds the benefit.

**GPU Instancing** draws multiple copies of the *same* mesh in one call. Each instance can have different transforms and some per-instance properties. This is fantastic for forests, crowds, rocks—anywhere you have many copies of the same object.

**SRP Batcher** is the modern approach in URP and HDRP. Unlike the others, it doesn't reduce draw call *count*—it reduces the *cost per draw call*. It caches material data on the GPU so Unity doesn't have to re-upload it every call. Different materials using compatible shaders can benefit from this.

In your notes, there's a diagram showing a worst-case scenario: 100 objects with 100 different materials means 100+ draw calls. But 100 objects sharing one texture atlas and one material might only be 1-5 draw calls. This difference is massive for performance, especially on browsers.

For VRify specifically, expect material chaos from client data. Part of your pipeline work would be consolidating materials—combining textures into atlases, standardizing shaders.

## Stage 4: GPU Execution

Once Unity has prepared the draw calls, it sends commands to the GPU. This is the graphics pipeline proper, which we'll cover in depth in the shader lesson, but here's the overview:

**Vertex Shader** runs per-vertex, transforming 3D coordinates to screen space.

**Rasterization** determines which pixels each triangle covers—this is fixed hardware function.

**Fragment Shader** runs per-pixel, calculating the final color including lighting and texturing.

**Output** merges the result with the framebuffer using depth testing and blending.

## Stage 5: Camera and Final Output

Cameras define *what* renders and *where* it goes.

You can render to a **RenderTexture** instead of the screen—this is how you do reflections, portals, and minimaps.

Camera **Depth** controls render order among multiple cameras. Higher depth renders later, on top.

**Clear Flags** determine what happens before rendering—clear to a solid color, render the skybox, or don't clear at all.

URP introduces **Camera Stacking**, where a Base Camera renders the 3D world, and Overlay Cameras render additional layers (like UI) on top without clearing. Your notes show a simple diagram of this: Base Camera at the bottom, Overlay Camera on top, composited together.

## Using the Statistics Window

To actually see what's happening in your project, use **Window → Analysis → Frame Debugger** and the Game view Stats panel.

**Batches** is the number of draw calls—lower is better.
**SetPass calls** are material or shader switches—lower is better.
**Triangles and Vertices** tell you geometry complexity.
**Saved by batching** shows how many draws were combined.

These numbers are your friends when optimizing.

## Key Takeaways

Culling—both frustum and occlusion—determines what to skip before any rendering happens.

Objects are sorted by render queue: opaque front-to-back, transparent back-to-front.

Draw calls are expensive; minimize them through batching and material consolidation.

The "changing brushes" metaphor: group objects by material to avoid constant switching.

SRP Batcher is the modern URP approach—it reduces CPU overhead per draw call rather than reducing count.

Use the Frame Debugger to understand exactly what's being drawn and why.

Next lesson, we'll look inside those shaders and understand what's happening in the vertex and fragment stages.
