# Lesson 17: Compute Shaders & WebGPU

## The Missing Piece of the Browser Puzzle

For a long time, doing high-end technical art in a browser was painful. WebGL 2.0 is great for rendering, but it lacks **Compute Shaders**. This meant any complex logic—flocking birds, particle physics, massive data sorting—had to happen in JavaScript or WASM on the CPU. The CPU is singular. It does one thing at a time. It chokes on 10,000 items.

**WebGPU** changes the rules. It gives browser apps access to modern GPU features, specifically Compute Shaders.

## What is a Compute Shader?

Think of a normal shader (vertex/fragment) like an artist drawing a picture. It has a specific job: geometry in, pixels out.

A Compute Shader is a mathematician. It doesn't draw anything. It just takes a massive array of numbers, runs a function on every single number simultaneously, and writes the results back.

Why does this matter for VRify? Because you have 125,000 hexes.

## The Zero-Copy Pipeline

In a standard Unity approach (GameObjects), you calculate position updates on the CPU, then upload that data to the GPU to draw. That upload takes time (PCIe bus bandwidth).

With Compute Shaders, we create a **Zero-Copy Pipeline**:

1.  **Storage:** Data lives in a `StructuredBuffer` on the GPU VRAM.
2.  **Update:** Compute Shader reads the buffer, calculates next frame's positions, writes to buffer.
3.  **Render:** Vertex Shader reads *the same buffer* to know where to draw.

The data never touches the C# side. It stays on the graphics card. This allows you to animate millions of particles at 60 FPS in a browser.

## Writing a Kernel

The function inside a compute shader is called a **Kernel**.

```hlsl
#pragma kernel CSMain
RWStructuredBuffer<float3> positions;

[numthreads(64, 1, 1)]
void CSMain (uint3 id : SV_DispatchThreadID)
{
    // id.x ranges from 0 to 124,999
    float3 pos = positions[id.x];
    
    // Do math (e.g., move up based on sine wave)
    pos.y = sin(Time + pos.x);
    
    positions[id.x] = pos;
}
```

In C#, you initiate this massive parallel work with one line:

```csharp
shader.Dispatch(kernelIndex, groups, 1, 1);
```

## Interaction: "Colliding" without Colliders

You asked about interaction. "If I have 100k points moving on the GPU, how do I know if I clicked one?"

You can't use `Physics.Raycast`. The physics engine doesn't even know these points exist.

Instead, you use the Compute Shader for **Parallel Search**.

1.  Send your mouse ray (Origin + Direction) to the Compute Shader.
2.  Run the Kernel on all 125,000 items.
3.  Each thread checks: "Does this ray intersect my bounding box?"
4.  If yes, write "I WAS HIT" (and my ID) to a generic buffer.
5.  Use `AsyncGPUReadback` in C# to check that buffer.

This is faster than Unity's physics engine because it checks 125k items in parallel, not sequentially.

## Spatial Hashing (Voronoi)

What if you need complex interactions, like "draw a line between any two points that are close"?

A naive check is O(N²)—checking everyone against everyone. For 125k points, that's ~15 billion checks per frame. Impossible.

On the GPU, we use **Spatial Hashing**:
1.  Divide the world into a grid of buckets.
2.  Pass 1: Every point writes its ID into the bucket it currently occupies.
3.  Pass 2: Every point looks only at the IDs in its own bucket (and neighbors).

This reduces the problem from "check 125,000 people" to "check the 5 people near me."

## WebGPU Gotchas

When working in Unity 6+ for WebGPU:

1.  **Async Readback:** You cannot read GPU data instantly. If C# asks "Who did I click?", the answer arrives 1 frame later. You must design your UI to handle this 16ms delay.
2.  **Structuring:** You must use `List<T>` that matches the byte layout of your HLSL structs exactly. Padding matters.
3.  **Browser Flags:** Not all users have WebGPU enabled by default yet (though it's standardizing fast).

## Key Takeaways

1.  **Compute Shaders** move simulation logic from CPU to GPU.
2.  **StructuredBuffer** is the bridge. C# fills it, Compute updates it, Renderer draws it.
3.  **Dispatch** launches the threads.
4.  **Interaction** is done via math (ray-sphere intersection) inside the compute shader.
5.  **WebGPU** unlocks this power for browser-based apps, which is critical for VRify's tech stack.
