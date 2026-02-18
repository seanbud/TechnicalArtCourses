# Lesson 03: Shader Fundamentals

## What Is a Shader, Really?

Let's clear up a common misconception right away. When people say "shader," they often imagine a single program that runs once per pixel. That's incomplete.

A shader is actually a **collection of programs** that run at different points in the graphics pipeline. The vertex shader runs per-vertex. The fragment shader runs per-pixel. These are separate programs bundled together into what we call "a shader."

So when you write a Unity shader, you're typically writing at least two programs that work together. Let's trace through what each one does.

## The Graphics Pipeline Stages

Your notes have a diagram of this, so follow along as we walk through it.

First, **input data** arrives—vertices with their positions, normals, UVs, tangents, and colors. This is your mesh data.

The **Vertex Shader** is the first programmable stage. It runs once for every vertex in your mesh. Its main job is transforming vertex positions from object space (local to the mesh) through world space and view space into clip space (the coordinate system used for rendering). It also prepares data to pass to later stages—things like world-space normals, UV coordinates, and any custom values you want to interpolate.

After the vertex shader, the optional **Geometry Shader** can run. This isn't commonly used because it performs poorly on many GPUs—it's not well-parallelized. It can add, remove, or modify primitives, but compute shaders are usually a better choice for geometry generation.

**Rasterization** comes next, and this is *not* programmable—it's fixed-function hardware. The GPU takes your transformed triangles and figures out which screen pixels they cover, generating **fragments**. A fragment is a potential pixel—multiple fragments can compete for the same screen position if geometry overlaps.

The **Fragment Shader** (also called the pixel shader) is the second main programmable stage. It runs once per fragment and calculates the final color. This is where texturing, lighting calculations, and visual effects happen. Because it runs millions of times per frame—once per pixel potentially covered by geometry—the fragment shader is usually your performance bottleneck.

After the fragment shader, **Depth and Stencil Tests** determine if the fragment survives to the final image. If something is behind already-drawn geometry, it fails the depth test and gets discarded.

Finally, **Blending** combines the fragment with whatever is already in the framebuffer. For opaque objects, the new fragment just replaces what was there. For transparent objects, alpha blending mixes them together.

## Shader Structure in Unity

Unity shaders are written in **ShaderLab** format, which is Unity's wrapper around HLSL (High-Level Shading Language). The structure looks like this:

At the top level, you have a **Shader** block with a name like "Custom/MyShader".

Inside that, you have a **Properties** block. These are the variables exposed in the Material Inspector—textures, colors, sliders.

Below that, you have one or more **SubShaders**. Unity picks the first SubShader that works on the target hardware. This is how you support different platforms with different capability levels.

Each SubShader contains **Tags** (metadata about render queue and pipeline compatibility) and one or more **Passes**.

A **Pass** is one complete rendering of the geometry. Inside the Pass, you specify render state like ZWrite and Blend modes, then your actual HLSL code wrapped in `HLSLPROGRAM` and `ENDHLSL`.

Your notes have a code example showing this structure. Take a look—the key thing to notice is how Properties, Tags, and the actual shader code are all organized.

## Multi-Pass Rendering

A single shader can have multiple passes, meaning the geometry renders more than once with different settings.

Common uses include:

**Outline effects** where you render the object slightly larger in a solid color first, then render the actual object on top.

**Shadow passes** that write to the shadow map using a specialized shader variant.

**Depth pre-passes** that write only depth first (very cheap), then render color afterward with depth testing already done.

Here's the performance warning though: each pass means the geometry is processed again. A two-pass shader on 1000 objects means 2000 worth of vertex processing. For browser targets, keep pass counts minimal.

## Shader Compilation and Variants

Shaders go through multiple compilation stages. Your ShaderLab source gets compiled to intermediate bytecode at Unity build time, and then to platform-specific GPU instructions either at build time or at first use.

Here's where things get tricky: **shader variants**.

Unity supports keywords—things like SHADOWS_ON, FOG_ON, LIGHTMAP_ON. Each combination of keywords can produce a different compiled variant of your shader. If you have 5 keywords with 2 options each, that's 2^5 = 32 variants.

This "variant explosion" can blow up your build times and sizes. It can also cause runtime stalls in browsers—the first time a variant is needed, the browser has to compile it, causing a hitch.

To control this, use `shader_feature` instead of `multi_compile` when possible. `shader_feature` strips variants that aren't used by any material in the build. `multi_compile` includes all combinations regardless of use.

You can also create a **ShaderVariantCollection** to preload expected variants during a loading screen, preventing runtime compilation stutters.

## Shader Graph vs Hand-Coded HLSL

Unity offers Shader Graph as a visual, node-based shader editor. It's great for rapid prototyping and for artists who aren't comfortable with code. The downside is that it can generate bloated code and you're limited to what nodes exist.

Hand-coded HLSL gives you full control and the ability to optimize, but it has a steeper learning curve.

For a Technical Artist role, understanding both is valuable. Use Shader Graph for quick iteration, but be able to read and debug the generated HLSL when you need to.

## Compute Shaders: A Different Beast

Finally, let's address compute shaders. These are **not** part of the graphics pipeline. They're general-purpose GPU programs for parallel computation.

Compute shaders don't render anything directly. They read from and write to buffers and textures. They're used for particle systems, procedural geometry generation, physics simulations, and image processing.

Work is organized into **thread groups**—you might have 64 threads per group and launch 16 groups, giving you 1024 parallel threads.

But here's the critical constraint for VRify: **WebGL 2.0 does not support compute shaders**. WebGPU will support them, but it's not widely deployed yet. For browser targets, compute-heavy workflows need to run on the server or fall back to CPU processing.

## Key Takeaways

A shader is multiple programs bundled together—at minimum, a vertex shader and fragment shader.

The vertex shader runs per-vertex and transforms positions. The fragment shader runs per-pixel and calculates color—it's usually the bottleneck.

Unity shaders use ShaderLab format wrapping HLSL code. Understand the Properties, SubShader, Pass structure.

Multi-pass shaders process geometry multiple times—keep passes minimal for performance.

Shader variants from keywords can explode—use `shader_feature` to strip unused variants.

Compute shaders are powerful but not available in WebGL 2.0.

Next lesson, we'll compare the different rendering paths—Forward, Deferred, and Forward+—and understand when to use each.
