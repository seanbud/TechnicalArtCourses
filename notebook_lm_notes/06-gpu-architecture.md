# Lesson 06: GPU Architecture

## Why GPUs Are Different

Before we can really understand graphics optimization, we need to understand how GPUs think. And they think very differently from CPUs.

A CPU is designed for **complex, sequential tasks**. It has a few very powerful cores (maybe 4 to 16) that are incredibly good at branching, decision-making, and handling varied workloads.

A GPU is designed for **simple, massively parallel tasks**. It has thousands of simple cores that all execute the same instruction at the same time on different data.

Your notes have a visual comparing these architectures. The CPU is a few large boxes—"very smart" cores. The GPU is a grid of tiny boxes—thousands of simple cores working in lockstep.

This difference explains why GPUs are so fast at graphics: rendering involves doing the same calculation (lighting, shading) on millions of pixels. It also explains why certain things—like branching—kill GPU performance.

## SIMD: Single Instruction, Multiple Data

The GPU execution model is called **SIMD**—Single Instruction, Multiple Data. 

Here's what that means. A GPU "warp" (NVIDIA terminology) or "wavefront" (AMD terminology) is a group of 32 to 64 threads that all execute the **same instruction at the same time**, just with different input values.

Imagine 32 pixels all running through your fragment shader simultaneously. They're all at the same line of code. Pixel 0 might have UV coordinates (0.0, 0.0). Pixel 1 has (0.1, 0.0). Pixel 2 has (0.2, 0.0). But they're all executing the same `texture.Sample(uv)` instruction in the same clock cycle.

This is how GPUs achieve their massive parallelism. Instead of running your shader 32 times sequentially, they run it once on 32 pixels simultaneously.

## Warp Divergence: Why Branching Hurts

This brings us to a critical interview topic: **warp divergence**.

What happens when you write an if/else in your shader?

Let's say you have:

```
if (someCondition) {
    doExpensiveA();  // 10 instructions
} else {
    doExpensiveB();  // 10 instructions
}
```

And let's say half the pixels in the warp take the "if" branch and half take the "else" branch.

Remember, all 32 threads execute the same instruction simultaneously. But now half want to do A and half want to do B. The GPU can't split them up.

What actually happens: first, the GPU executes `doExpensiveA()` for all threads, but masks out the threads that shouldn't run it—they sit idle. Then it executes `doExpensiveB()` for all threads, masking out the other half.

Total time: 20 instructions. Both branches execute fully.

In the worst case with branching, you pay for *all* paths, not just the taken path. This is warp divergence, and it can devastate performance.

When is branching okay?

**Uniform branches** are fine. If the condition is the same for the entire warp—say, a global toggle like `_ShadowsEnabled`—then all threads take the same path. No divergence.

**Early-out branches** can help. If you do `if (alpha < 0.001) discard;`, you're skipping all remaining work for those pixels. Even if there's divergence, skipping heavy work can be worth it.

**Trivial branches** with very short branches may be acceptable—the cost of divergence is proportional to branch complexity.

Your notes have code examples showing the difference between uniform branches (okay) and per-pixel branches (problematic).

## GPU Memory Hierarchy

Memory access is another key to GPU performance. The GPU has a hierarchy from fastest to slowest:

**Registers** are per-thread storage—fastest but very limited, maybe 256 registers per thread.

**Shared Memory** is per-work-group—fast, limited (32-48KB), shared between threads in a group.

**L1/L2 Cache** is automatic hardware caching—fast.

**Texture Cache** is specially optimized for 2D spatial access patterns.

**Global VRAM** is the main GPU memory—slowest but abundant. This is where your textures and mesh buffers live.

The key insight is that **texture caches exploit spatial locality**. Neighboring pixels usually sample nearby UV coordinates. The hardware prefetches surrounding texels, so texture reads are often cache hits.

This is why **texture atlases** work well—textures packed together in memory have good cache locality when sampled.

## Texture2D Arrays

You mentioned wanting to understand Texture2DArrays. Let me explain the problem they solve.

Imagine you have 100 rocks in your scene with 10 different textures. Traditional approach: 10 different materials (one per texture), which means 10 different draw calls since you can't batch across material boundaries.

With a Texture2D Array: you pack all 10 textures into a single "array stack." Each rock mesh stores an index (0-9) indicating which layer to sample. You sample with `(u, v, layer_index)` instead of just `(u, v)`.

Now all 100 rocks can use the same material—just with different layer indices. They can batch together into far fewer draw calls.

Requirements: all textures in the array must have identical dimensions and format. You can't mix resolutions.

Use cases: terrain blending (grass, dirt, rock layers), character variations (same mesh, different skins), decal systems, and anywhere you need material variety without breaking batching.

For VRify geospatial work, texture arrays could unify materials for terrain layers, elevation bands, or different scan types.

## Compute Shaders

Let's touch on compute shaders. These are **not** part of the graphics pipeline—they're general-purpose GPU programs.

Compute shaders run in thread groups. You define how many threads per group (commonly 64-256), then dispatch multiple groups. Total threads = groups × threads per group.

A typical use case: 1024 particles needing physics updates. Dispatch 16 groups of 64 threads each. Each thread updates one particle in parallel.

Compute shaders read from and write to buffers and textures rather than rendering to screen. They're used for particle systems, procedural geometry, physics simulations, and image processing.

But here's the critical VRify constraint: **WebGL 2.0 does not support compute shaders.** WebGPU will support them, but it's not widely deployed yet. For browser targets, compute-heavy workflows need server-side processing or CPU fallbacks.

## Key Takeaways

GPUs use SIMD—thousands of threads executing the same instruction on different data.

Warp divergence from branching forces the GPU to execute all branches, potentially halving or worse performance. Keep branches uniform or trivial.

GPU memory has hierarchy: registers, shared memory, cache, global VRAM. Texture caches are specially optimized for spatial access.

Texture2D Arrays bundle same-size textures together, enabling batching with texture variety.

Compute shaders are powerful but unavailable in WebGL 2.0—plan accordingly for browser targets.

Next lesson, we'll look at mesh fundamentals—how geometry data is organized and flows through the system.
