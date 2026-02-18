# Lesson 16: Procedural Drawing & GPU Instancing

## The "Phantom" Geometry Problem

Here's a scenario straight from the VRify playbook: you need to visualize a mining site's block model. It's a 50x50x50 grid of colored hexagonal prisms.

That is **125,000 objects**.

If you try to do this the "normal" Unity way—`Instantiate(prefab)` in a loop—your editor will freeze. If it finishes, your frame rate will likely be single digits.

Why? Because **GameObjects are heavy**. Every GameObject carries overhead: it has a Transform component, it hooks into the physics system (even without a collider, it checks), it has serialization data, it lives in the Hierarchy window which has to repaint. CPU interaction with 125,000 individual transforms is slow.

To render at this scale, we have to bypass the GameObject system entirely. We use "Phantom Geometry"—objects that don't exist in the Scene Hierarchy, can't be clicked with standard tools, and live almost entirely as raw mathematical commands sent to the GPU.

## Technique 1: Graphics.DrawMeshInstanced

This is the standard API for "I have a lot of things, but I still want to manage them in C#."

Instead of creating objects, you manage a `List<Matrix4x4>`. Each matrix is just 16 float numbers describing a position, rotation, and scale. 125k matrices is just a few megabytes of RAM—trivial.

You then tell the GPU: "Here is a mesh, here is a material, and here is a list of 1023 matrices. Draw them all at once."

The limitation is that weird number: **1023**. That's the maximum size of the arrays Unity sends to the GPU in a standard instance batch.

So in your code, you have to write a loop:

```csharp
for (int i = 0; i < totalCount; i += 1023) {
    // Slice off a batch of 1023 matrices
    Graphics.DrawMeshInstanced(mesh, 0, material, currentBatch);
}
```

Unity handles this efficiently, but you (the CPU) are still responsible for managing those lists and calling Draw every frame.

## Technique 2: Indirect Drawing (The Holy Grail)

What if even that CPU loop is too slow? Enter `DrawMeshInstancedIndirect`.

In this workflow, you don't even keep the matrices in C# lists. You upload all 125,000 matrices to a **ComputeBuffer** on the GPU once (or update it via Compute Shader).

Then, C# issues one single command: "GPU, look at that buffer we talked about and draw everything in it."

The CPU doesn't know where the objects are. It doesn't know how many there are. It just sends the "Indirect Arguments"—a tiny buffer saying "Index Count per mesh" and "Instance Count".

This is how modern engines render millions of grass blades. The CPU cost is effectively zero.

## Per-Instance Properties: Colors and IDs

If all 125,000 hexes look identical, that's easy. But usually, you need to color them by data value (e.g., gold concentration).

You cannot create 125,000 material instances. That kills batching immediately (draw call explosion).

Instead, we use **MaterialPropertyBlock**.

For `DrawMeshInstanced`, you pass a `List<Vector4>` of colors alongside your matrices.
For `Indirect`, you have a second ComputeBuffer full of color data.

In the shader, instead of just reading `_Color`, you use `UNITY_ACCESS_INSTANCED_PROP(Props, _Color)`. The shader uses the **Instance ID** (which hex am I?) to look up the correct color from the list.

## Comparison: GameObject vs Graphics API

**GameObject Approach:**
- Hierarchy: Cluttered with 125k items.
- Memory: Heavy (C# objects + C++ counterparts).
- Draw Calls: High (unless static batched, which eats memory).
- Update: Updating positions involves `transform.position = x`, which is slow (marshaling data).

**Graphics API Approach:**
- Hierarchy: Empty. Clean.
- Memory: Just raw float arrays.
- Draw Calls: ~125 calls (batching sets of 1023).
- Update: Modify a float in an array. Fast.

## The Interaction Problem: "I Can't Click It"

This is the catch. Because these hexes aren't GameObjects, they have no Colliders. `OnMouseDown` doesn't exist. `Physics.Raycast` will pass right through them like ghosts.

So how do you select a block?

**Option A: Math (Grid Logic)**
If your data is a regular grid (like our hex grid), use math.
1. Raycast against an infinite mathematical plane (ground).
2. Take the hit point `(x, z)`.
3. Convert world coords to grid coords: `col = floor(x / hexWidth)`.
4. Check your data array: "Does a block exist at [row, col]?"

This is blazing fast. O(1) complexity.

**Option B: GPU Raycasting**
If the positions are random (like a point cloud), the GPU is your friend.
1. Send the mouse ray (origin + direction) to a Compute Shader.
2. Dispatch 125,000 threads.
3. Each thread checks "Did the ray hit me (Sphere/Box intersection)?"
4. If yes, write My ID to a "Results" buffer.
5. CPU reads the buffer back.

## Animation Strategy

How do we animate 125,000 things cascading in?

**Wrong Way:** Calculate 125,000 `sin()` waves on the CPU and update the matrix list every frame. That's heavy.

**Right Way:** Send `Time.time` to the shader.
In the **Vertex Shader**, use the Instance ID or World Position as a seed, and calculate the animation there.

```hlsl
// Vertex Shader logic
float delay = instanceID * 0.01;
float scale = smoothstep(0, 1, _Time.y - delay);
v.vertex.xyz *= scale;
```

The CPU does nothing. The GPU scales 125,000 vertices in parallel. Smooth 60 FPS.

## Key Takeaways

1.  **Scale kills GameObjects.** For >10k objects, switch to `Graphics.DrawMeshInstanced`.
2.  **Phantom Geometry.** These objects exist only as render commands. No hierarchy, no built-in physics.
3.  **Batching Limits.** Standard instancing batches 1023 items. Indirect instancing is effectively unlimited.
4.  **MaterialPropertyBlock.** Use this to vary color/properties without breaking batching.
5.  **Interaction.** Use mathematical raycasting (grid logic) or compute shaders for selection.
6.  **Animation.** Animate in the vertex shader, not by updating matrices on the CPU.
