# Lesson 16e: Advanced API & Memory Mechanics (Extension)

## Why This Lesson Exists

In Lesson 16, we looked at the *concept* of GPU Instancing. In this extension, we are going to look at the **metal**. The actual C# API calls, the byte-level memory management, and the architectural flow of data across the PCIe bus.

This is the stuff that separates a junior developer who copies code from a senior graphics engineer who understands *why* the code works.

## The API Trinity

There are three ways to draw a mesh in Unity without a GameObject.

### 1. `Graphics.DrawMesh`
This is the "Hello World" of the Graphics API.
- **Traffic**: You send one matrix from CPU to GPU.
- **Cost**: High. It creates a draw call.
- **Use Case**: Drawing a single gizmo, or a preview mesh in the editor. Do not use this for 1000 items.

### 2. `Graphics.DrawMeshInstanced`
- **Traffic**: You send an **array** of matrices (up to 1023) in one packet.
- **Memory**: The array lives in CPU RAM. Every frame you call this, Unity copies that array across the bus to the GPU.
- **Bottleneck**: The copy speed. If you have 100,000 items, you are uploading megabytes of position data *every single frame*.
- **Code Note**: You must manage `Matrix4x4[]` arrays and slice them into lists of 1023.

### 3. `Graphics.DrawMeshInstancedIndirect` (The Pro Tool)
This is what VRify uses.
- **Traffic**: Zero. The CPU sends **pointers**, not data.
- **Memory**: The data lives in GPU VRAM (in a `ComputeBuffer`). It stays there. It never crosses the bus after the first frame.
- **Optimization**: The CPU doesn't even know *how many* items it's drawing. It reads a special "Args Buffer" on the GPU to find out.

### Bonus: `Graphics.DrawProcedural`
This is for when you don't even have a Mesh. You want to draw 1 million points? Don't bind a Quad mesh. Just tell the GPU "Draw 1 million vertices" and use the **Vertex ID** in the shader to figure out where they go.
*Why?* It skips the Input Assembler stage of fetching mesh data. It's slightly faster for particle clouds.

---

## Anatomy of a `ComputeBuffer`

When you initialize a buffer, you must be precise.

```csharp
buffer = new ComputeBuffer(count, stride, type);
```

1.  **Count**: How many elements (e.g., 125,000 hexes).
2.  **Stride**: The size of *one element* in bytes.
    *   `float` = 4 bytes.
    *   `Vector3` = 12 bytes.
    *   `Matrix4x4` = 64 bytes.
    *   *Warning*: If your C# struct stride doesn't match your HLSL struct stride, you get garbage data.
3.  **Type**: Usually `ComputeBufferType.Structured`. This lets you access it like an array `myBuffer[i]` in the shader.

### The "Args Buffer"
For Indirect drawing, you need a second buffer to tell the GPU what to do. It MUST contain exactly 5 integers (20 bytes).

1.  **Index Count**: How many vertices per mesh? (e.g., 6 for a Quad).
2.  **Instance Count**: How many copies? (e.g., 125,000).
3.  **Start Index**: Usually 0.
4.  **Base Vertex**: Usually 0.
5.  **Start Instance**: Usually 0.

You set this once. If you change the number of visible units via a Compute Shader (frustum culling), your Compute Shader updates *this exact integer* in VRAM. The CPU never touches it.

---

## Implementation Order (The Code Flow)

Here is the initialization lifecycle. If you get the order wrong, it won't render.

**1. Create Buffers (Start/OnEnable)**
```csharp
// Create the buffer of 125k positions
dataBuffer = new ComputeBuffer(125000, 16); 
dataBuffer.SetData(initialData); // Upload once
```

**2. Bind to Material**
The Render Pipeline needs to know *which* global buffer corresponds to the variable name in your shader code.
```csharp
material.SetBuffer("blockData", dataBuffer);
```

**3. The Draw Logic (Update)**
Each frame, you issue the command.
```csharp
Graphics.DrawMeshInstancedIndirect(mesh, 0, material, bounds, argsBuffer);
```
*Note*: You pass `argsBuffer` here, NOT `dataBuffer`. The material holds the data reference. The args buffer tells the GPU how many times to run the material.

**4. Cleanup (OnDisable/OnDestroy)**
**CRITICAL**: Buffers are unmanaged memory. If you don't release them, you crash the GPU driver eventually.
```csharp
dataBuffer?.Release();
argsBuffer?.Release();
```

---

## The Sparse Grid & Optimization

Scenario: You have a 3D grid of blocks (Air, Dirt, Gold). 90% is Air.

**Naive Approach:**
Draw 1 million blocks. 900,000 are invisible shader discards.
*Result*: Massive Vertex Shader waste.

**Smart Approach (AppendBuffer):**
1.  Run a Compute Shader kernel first.
2.  Check: `if (block.type != Air)`.
3.  If true, `Append` the block ID to a `AppendStructuredBuffer`.
4.  Copy the "Counter" from that buffer into your `ArgsBuffer[1]` (Instance Count).
5.  Draw only the visible blocks.

### Packing Data (Bandwidth Optimization)
Don't send a `Color` (float4 = 16 bytes).
If you have 32 block types, send a `uint` (4 bytes).
Inside the shader, fetch the color from a global array: `_ColorPalette[blockID]`.

**Why?**
-   Lowers PCIe bandwidth usage (if updating).
-   Lowers VRAM cache misses.
-   **Avoids Branch Divergence**.

### Branch Divergence
BAD:
```hlsl
if (id == 0) color = red; 
else if (id == 1) color = blue; // Thread groups split execution paths!
```

GOOD:
```hlsl
color = _Palette[id]; // All threads run the exact same "Fetch memory" instruction.
```

---

## Key Takeaways for the Interview

1.  **Initialization Order**: Struct Definition -> Buffer Create -> Set Data -> Bind Material -> Draw Loop.
2.  **Stride Management**: Count your bytes manually. 4 bytes per float. Mismatch = death.
3.  **Bus Traffic**: `DrawMeshInstanced` floods the bus every frame. `Indirect` is silent.
4.  **Args Buffer**: The 5 integers that control the GPU’s workload.
5.  **Divergence**: Always favor lookup tables (Arrays/Textures) over `if/else` chains in shaders to keep threads in sync.
