# Lesson 04: Forward vs Deferred & Forward+

## The Core Problem: Lights Are Expensive

The fundamental difference between rendering paths comes down to one question: **how do you handle many lights?**

Lighting is expensive. Every light that affects an object requires calculations. In a naive approach, the cost is Objects × Lights. A hundred objects with 50 lights? That's 5,000 lighting calculations.

Forward, Deferred, and Forward+ are different strategies for tackling this multiplication problem. Each has trade-offs, and understanding them helps you make the right choice for your target platform.

## Forward Rendering

Forward is the traditional approach and Unity URP's default mode. The concept is straightforward: objects are rendered one by one, and lighting is calculated during the fragment shader for each object.

Walk through the flow: For each object, run the vertex shader, then in the fragment shader, calculate lighting from all relevant lights. Output the final color directly to the framebuffer.

The **advantages** of Forward rendering are significant:

Transparency works naturally. When you're drawing transparent objects, you just blend with what's already there. There's no complex multi-layer problem.

**MSAA** (Multi-Sample Anti-Aliasing) works efficiently. This is hardware-level anti-aliasing that samples at multiple points per pixel. It's the crispest form of AA available.

Memory usage is low. You don't need additional large textures to store intermediate data.

The shader workflow is simpler. Everything happens in one pass; you don't need to understand deferred-specific constraints.

Most importantly for VRify: **Forward is best for mobile and browser targets.** It requires fewer GPU features and has lower bandwidth requirements.

The **disadvantages** center on lights:

Light count per object is limited—URP typically caps it at 4-8 additional lights. Beyond that, you have to decide which lights to skip.

If you have overdraw—pixels being drawn multiple times due to overlapping geometry—you're recalculating lighting for fragments that might get overwritten.

For VRify's browser target, Forward rendering is almost certainly your safest choice. Memory constraints, MSAA support variations, and the complexity of alternatives make Forward the pragmatic default.

## Deferred Rendering

Deferred is available in HDRP and as a URP option for desktop. The key innovation is separating geometry rendering from lighting using something called a **GBuffer**—a Geometry Buffer.

Here's how it works:

**Pass 1: Geometry Pass.** Render every object, but instead of calculating lighting, write surface properties to a set of textures. One texture stores albedo (base color). Another stores world-space normals. Another stores depth. Another stores metallic and roughness values. This collection of textures is the GBuffer.

**Pass 2: Lighting Pass.** Now, for each light in the scene, read from the GBuffer and calculate lighting. Since the GBuffer already has all the surface information per-pixel, you don't need to re-render geometry. Each light only affects the pixels within its range.

The brilliant efficiency insight: in Deferred, **geometry is rendered once** regardless of light count. Cost becomes Objects + (Lights × affected pixels) instead of Objects × Lights. For scenes with hundreds of lights, this is a game-changer.

Your notes have a diagram showing the GBuffer contents and the two-pass structure. Reference it to visualize what's stored.

The **advantages**:

You can have hundreds or thousands of lights with minimal cost increase. Each light only processes the pixels it actually affects.

Screen-space effects like SSAO and Screen-Space Reflections are easy because all the data you need is already in textures.

The **disadvantages** are severe for browser:

Memory usage is high. The GBuffer at 4K resolution might be 160+ bytes per pixel—that's hundreds of megabytes just for intermediate storage.

Transparency is hard. The GBuffer only stores one surface per pixel. Transparent objects need a separate Forward pass, complicating the pipeline.

**No MSAA.** You have to use post-process anti-aliasing like FXAA or TAA instead, which is softer than hardware MSAA.

Material variety is constrained. Every material must fit into the GBuffer format. Unusual materials may not work.

For VRify: **avoid Deferred for browser targets.** The memory constraints and transparency complexity make it problematic for WebGL.

## Forward+ (Clustered Forward / Tiled Forward)

Forward+ is the modern hybrid approach, and it's what URP calls "Forward+" in the renderer settings.

The magic is **clustered light culling**. Before rendering, Unity divides the screen into a 3D grid—tiles in screen space and slices in depth. For each cell in this grid, Unity calculates which lights overlap it and builds a lookup table.

Then during rendering, the fragment shader doesn't loop through all lights. It looks up which cluster it's in and only considers the lights in that cluster.

Think about it: a point light in the corner of your scene doesn't affect pixels on the opposite side. But in basic Forward, every pixel might have to check every light. Forward+ pre-computes which lights are relevant where, drastically reducing per-pixel work.

Your notes show this as a two-step process: first build the light clusters, then render with efficient light lookup.

The **advantages** combine the best of both worlds:

Many lights supported efficiently, like Deferred.

MSAA still works, like Forward.

Transparency still works, like Forward.

Less memory than Deferred's full GBuffer.

Material flexibility isn't constrained by GBuffer format.

The **disadvantages**:

Needs a depth prepass to know depth for clustering—some overhead.

Cluster computation requires work, though it's usually fast.

**Requires compute shader support**—and WebGL 2.0 doesn't have compute shaders. WebGPU will, but browser support isn't universal yet.

For VRify: Forward+ might be viable if you can target WebGPU or if you have specific lighting requirements. But for broad browser compatibility, standard Forward remains safer.

## Comparison Summary

Your notes have a comparison table. Let me walk through the key columns:

For Many Lights: Forward is limited, Deferred is excellent, Forward+ is excellent.

For MSAA: Forward supports it, Deferred doesn't, Forward+ supports it.

For Transparency: Forward handles it easily, Deferred struggles, Forward+ handles it.

For Memory: Forward is low, Deferred is high, Forward+ is medium.

For WebGL: Forward is best, Deferred is not recommended, Forward+ has limited support.

## What to Use at VRify

Given browser targets and geospatial visualization:

**Primary choice: Forward rendering.** It's the most compatible with WebGL and sufficient for visualization scenarios where you're not dealing with hundreds of dynamic lights.

**Consider Forward+ if:** You have many local lights *and* you can target WebGPU or specific browsers with compute support.

**Avoid Deferred for browser:** The memory constraints and transparency complexity make it the wrong tool for web delivery.

## Key Takeaways

Forward renders objects directly with lighting in the fragment shader—simple, MSAA-friendly, limited lights.

Deferred uses a GBuffer to render geometry first, then light per-pixel—excellent for many lights, but high memory and no MSAA.

Forward+ pre-computes light clusters to efficiently cull lights per-tile—best of both worlds, but needs compute shaders.

The GBuffer stores per-pixel surface data: albedo, normals, depth, roughness.

For VRify browser targets, Forward is your safest bet.

Next lesson, we'll dive into URP-specific settings and learn how to configure the pipeline for optimal browser performance.
