# Lesson 05: URP Deep Dive

## What Is URP?

The **Universal Render Pipeline** is Unity's default scriptable render pipeline, designed for cross-platform performance. It replaced the old Built-in render pipeline for most use cases.

You should know there are three main pipelines in Unity: the **Built-in** (legacy, fixed, not extensible but still works), **URP** (scriptable, extensible, cross-platform), and **HDRP** (high-fidelity, compute-heavy, PC and console only).

For VRify, URP is the clear choice. HDRP doesn't support WebGL at all, and the Built-in pipeline lacks the modern optimization features you need. URP gives you scalability—you can target low-end devices while still looking good—plus the SRP Batcher for efficient draw calls, and Render Features for custom pipeline extensions.

## The URP Asset

Everything in URP is controlled through the **Universal Render Pipeline Asset**. This is a ScriptableObject that defines global rendering behavior. Let's walk through the key settings.

### Rendering Settings

**Render Path** is your first major choice. Options are Forward, Forward+, and Deferred. Based on what we covered last lesson, Forward is the safest choice for WebGL.

**Depth Texture** generates a screen-space depth texture that effects can sample. Turn it on only if you need it—some custom effects require it, but it has overhead.

**Opaque Texture** creates a texture of the scene before transparent objects render. This is used for refraction effects. Turn it off unless you specifically need it.

### Quality Settings

**HDR** enables high dynamic range rendering. For WebGL, turn this **off**. It saves memory, and browser support varies. You don't typically need the extended color range for geospatial visualization anyway.

**MSAA** is multi-sample anti-aliasing—hardware-level edge smoothing. For browser targets, use **2x or Off**. 4x and 8x are too expensive. If you turn MSAA off, use FXAA as a post-process alternative.

**Render Scale** is an internal resolution multiplier. Setting it to 0.75 means rendering at 75% of display resolution, then upscaling. This can dramatically improve performance on weak GPUs while maintaining acceptable visual quality.

## MSAA Deep Dive

Let's understand what MSAA actually does, because it comes up in interviews.

Without anti-aliasing, triangle edges appear jagged because pixels are either fully inside or fully outside the triangle. MSAA samples at multiple points per pixel. If a triangle covers 2 of 4 sample points, that pixel gets 50% coverage, creating a smooth blend at the edge.

Your notes have a diagram showing this—without MSAA you get harsh edges, with 4x MSAA you get graduated coverage.

The trade-off: memory. 4x MSAA means 4x the framebuffer memory. At high resolutions on memory-constrained browsers, this can push you over limits.

There are alternatives:

**FXAA** is a post-process effect that detects edges and blurs them. It's fast and cheap but slightly blurs the whole image.

**SMAA** has better edge detection than FXAA, at higher cost.

**TAA** uses temporal data—comparing frames over time—to smooth edges. It handles thin geometry well but can cause ghosting on moving objects.

For browser targets, the recommendation is: try 2x MSAA first. If memory is tight or you're using depth-based effects, switch to FXAA post-process.

## Shadows: The Biggest Performance Lever

Shadows are typically the most expensive GPU feature in your scene. Understanding these settings is critical.

**Shadow Resolution** is the size of the shadow map texture. For browser, stick to 512 or 1024. Higher resolutions look sharper but cost more memory and GPU time.

**Shadow Distance** controls how far from the camera shadows render. Keep this minimal for your scene's needs. A mining site might not need shadows 500 meters away.

**Shadow Cascades** split the shadow map into regions. Near shadows get more resolution than far shadows. More cascades look better but cost more. For browser, use 1 or 2 cascades maximum.

**Soft Shadows** blur shadow edges for a more natural look. Turn this Off or set to Low for browser—it has additional sampling cost.

## The SRP Batcher

This is one of URP's biggest performance wins, and it's often misunderstood.

The SRP Batcher **does not reduce draw call count**. What it does is reduce the **cost per draw call**.

Without SRP Batcher: for every draw call, Unity uploads material properties from CPU to GPU. This transfer has overhead.

With SRP Batcher: material data is uploaded once and kept in a persistent GPU buffer. For subsequent draw calls, Unity just says "use the data at this offset" rather than re-uploading.

This means even if you have 200 draw calls, each one is cheaper. The CPU side of rendering becomes much faster.

Requirements: shaders must be SRP Batcher compatible (most URP shaders are—check the Shader Inspector), and you enable it in the URP Asset settings. Different materials using the same shader can benefit.

## Render Features

Render Features are URP's extensibility mechanism. They're modular code blocks that inject into the render pipeline at specific points.

Common built-in features include:

**SSAO** (Screen Space Ambient Occlusion) adds shadows in corners and crevices, giving scenes more depth.

**Decals** project textures onto surfaces—useful for splats, signs, and graffiti.

**Render Objects** lets you render specific layers with different settings—maybe a different shader or render order.

You can also write custom Render Features for effects like outlines, depth-based fog, or additional post-processing.

## Camera Stacking

URP supports multiple cameras rendering in layers.

The **Base Camera** renders first, clearing the screen and drawing the 3D world.

**Overlay Cameras** render on top without clearing, adding additional layers—most commonly UI.

Your notes show a simple diagram: Base Camera at the bottom, Overlay Camera on top, composited to the final output.

To set this up, you mark cameras as Base or Overlay, then add Overlay cameras to the Base camera's "Stack" list. This is useful for keeping UI rendering separate from scene rendering.

## Browser-Specific Recommendations

Let's consolidate the optimal settings for WebGL deployment:

Render Path: Forward.
HDR: Off.
MSAA: 2x or Off (use FXAA instead).
Render Scale: 0.75-1.0 based on performance needs.
Shadow Resolution: 512-1024.
Shadow Distance: Minimal for your needs.
Shadow Cascades: 1-2.
Soft Shadows: Off or Low.
Additional Lights: Per Vertex or disabled.
Depth and Opaque Textures: Only if needed.
SRP Batcher: Enabled.

Test on real browsers—Chrome, Firefox, and Safari all behave differently.

## Key Takeaways

URP is the right choice for cross-platform including WebGL. HDRP doesn't support browsers.

The URP Asset controls all major settings. Know where to find Render Path, MSAA, Shadows, and the SRP Batcher toggle.

MSAA provides hardware anti-aliasing at memory cost. 2x is a good browser balance.

Shadows are expensive—minimize resolution, distance, and cascade count for browser.

SRP Batcher reduces per-draw CPU cost, not draw call count. Keep it enabled.

Render Features allow custom pipeline extensions.

Camera Stacking separates UI and scene rendering.

Next lesson, we'll go lower—into GPU architecture itself—to understand why certain optimizations matter.
