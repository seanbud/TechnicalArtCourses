# Lesson 18: Scriptable Render Features Deep Dive

## Hacking the Pipeline

The "Scriptable" in Scriptable Render Pipeline (SRP) means exactly that: you can write scripts to change how rendering works. You aren't stuck with what Unity gives you.

The primary way you do this in URP is through **Scriptable Render Features**.

Think of the URP loop like an assembly line. It clears the screen, draws opaque objects, draws the skybox, draws transparents, applies post-processing. A Render Feature lets you step onto that line and say, "Wait, right here, between Opaques and Skybox, I want to do something special."

## Anatomy: Feature vs. Pass

This confuses everyone at first. There are two classes.

**1. ScriptableRendererFeature**
This is the **Configuration**. It's a ScriptableObject that sits in your Project view. You add it to your URP Asset settings list. It holds data: "What color is the outline?", "Which layer mask should we use?".
Its main job is to create an instance of the Pass and tell the pipeline "Add this pass to the queue."

**2. ScriptableRenderPass**
This is the **Worker**. It contains the logic. It has an `Execute` method that runs every frame. This is where you actually tell the GPU what to draw.

## The Execution Flow

1.  **Create**: Unity starts up. The Feature creates the Pass.
2.  **AddRenderPasses**: Every frame, the Renderer asks the Feature: "Do you have anything to add?" The Feature injects the Pass.
3.  **Configure**: The Pass tells the renderer what memory it needs (e.g., "I need a temporary texture called _OutlineTex").
4.  **Execute**: The GPU runs the commands in the Pass.

## CommandBuffers: The To-Do List

Inside `Execute`, you don't call `Graphics.DrawMesh` directly. You use a **CommandBuffer**.

A CommandBuffer is a list of instructions.
- "Set the color to Red."
- "Draw this mesh."
- "Blit this texture."

You fill this list up, and then you say `context.ExecuteCommandBuffer(cmd)`. That flushes the list to the GPU.

## Case Study: The "Selection Outline"

Let's say VRify wants selected machinery to glow.

**The Naive Way:** Add a second material to every GameObject that renders a shell.
*Problem:* Breaks batching, doubles draw calls, headache to manage 125,000 second materials.

**The Render Feature Way:**
1.  **Filter**: Create a Render Feature that looks for objects on the "Selected" layer.
2.  **Injection**: Set event to `AfterRenderingOpaques`.
3.  **Override**: In the Pass, we tell Unity: "Draw these objects again, but ignore their normal material. Use this solid yellow shader instead. And disable Depth Write so they don't occlude themselves."
4.  **Blit**: We render this to a temporary texture, apply a blur (in a shader), and mix it back onto the main screen.

All the logic lives in the Feature. The GameObjects themselves don't change. You just toggle their Layer, and the Feature handles the rest.

## Other Use Cases

- **X-Ray Vision**: Draw objects with Z-Test set to `Always` (so they draw through walls) and a ghost shader.
- **Occluded Styling**: Draw objects *only* if they fail the depth test (are behind a wall), drawing a silhouette.
- **Portals**: Use the Stencil buffer (we'll cover this next lesson) to mask out regions of the screen.

## Key Takeaways

1.  **Render Features** allow you to inject passes into URP without modifying Unity's source code.
2.  **Feature = Config, Pass = Logic.**
3.  **RenderPassEvent** controls the "When". (Before/After Opaques/Transparents/PostProcessing).
4.  **CommandBuffers** are the mechanism for sending instructions.
5.  This is how you implement "Global Effects" that rely on scene state (like selection outlines) without touching every single GameObject.
