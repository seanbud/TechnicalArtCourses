# Lesson 08: UI Rendering

## UI Is Different

Unity's UI system—uGUI—uses a completely different rendering approach than 3D geometry. If you try to optimize it the same way, you'll miss the real problems.

3D objects use MeshRenderer. UI uses **CanvasRenderer**. The Canvas component collects all its children, generates combined meshes, and submits them to the GPU. Crucially, this mesh generation happens on the **main thread**—it's CPU work that can impact your frame time.

Understanding this difference is critical for browser targets, where UI can easily become the bottleneck.

## Canvas Render Modes

Every UI element must be under a Canvas, and the Canvas's render mode determines how it draws.

**Screen Space - Overlay** renders after all 3D content—always on top. It ignores cameras entirely. Resolution matches screen pixels exactly. Use this for HUD elements, menus, and anything that should always be visible regardless of camera position.

**Screen Space - Camera** is rendered by a specific camera. You can place the UI at a specific distance, allowing 3D objects to potentially appear between UI layers. Resolution is affected by camera settings. Use this when you want post-processing applied to UI or depth interaction between UI and scene.

**World Space** makes the UI exist as a 3D object in the scene. It has a RectTransform defining size in world units. The UI is affected by perspective, can be occluded by 3D objects, and rendered like regular geometry. Use this for labels on objects, VR/AR interfaces, and any UI that exists "in the world" rather than overlaid on screen.

For VRify geospatial visualization, you'll likely use World Space for labels and markers on mine site features, and Screen Space Overlay for tools and controls. Remember that your users may not be tech-savvy—consider larger touch targets and clear visual hierarchy.

## How Canvas Batching Works

The Canvas doesn't render each UI element individually. It **batches** elements into combined meshes.

All elements in a Canvas get collected. They're sorted by depth, material, and texture. Compatible elements get merged into unified meshes. Those meshes are submitted to the GPU.

If all your UI images use the same texture atlas and same material, you might get just 1-2 draw calls for the entire UI. If everything uses different textures, each element needs its own draw call.

What breaks batching?

**Different textures** can't be batched together—they need separate draws. Solution: use texture atlases and sprite sheets.

**Different materials** break batching. Solution: share materials when possible.

**Masking boundaries** break batching. RectMask2D creates a batch boundary. Solution: group masked content together.

**Depth interleaving** breaks batching. If elements with different materials alternate in z-order (A, B, A, B), Unity can't combine the As together.

Your notes have a diagram showing this interleaving problem. Two scenarios with the same elements but different hierarchy order—one produces 5 draw calls, the other produces 2. Organization matters.

## Canvas Rebuild: The Hidden Cost

Here's the big gotcha with UI: **Canvas rebuilds**.

When *anything* in a Canvas changes—enabling/disabling elements, changing text, changing images, modifying RectTransforms, adding or removing elements—the entire Canvas may need to regenerate its batched meshes.

This mesh generation happens on the CPU main thread. For complex UIs, it can take milliseconds—visible in your profiler as "Canvas.BuildBatch" or similar.

The solution is to **use multiple Canvases** to isolate dynamic content.

Imagine a single Canvas with background images (static), ability icons (static), health bar (updates often), damage numbers (spawning constantly), and minimap (updates every frame).

Any change to the health bar triggers a rebuild that reprocesses the backgrounds and icons too—even though they didn't change.

Now split it: a StaticCanvas for background and ability icons (rarely changes), a DynamicCanvas for health bar and minimap (updates often), and maybe a DamageNumberCanvas for spawned elements (very frequent changes).

Each Canvas has isolated rebuilds. Static content never regenerates. Dynamic content only regenerates its own Canvas.

## Overdraw: The Silent Killer

Overdraw is when pixels are drawn multiple times. It's particularly bad in UI because of transparency.

Imagine stacked panels: a background panel, an inner panel, a button on top, an icon on the button. That center pixel gets drawn 4 times—once for each layer.

For opaque 3D geometry, early depth rejection prevents overdraw. But UI is mostly transparent, and transparent objects must blend in order, so every layer draws.

Your notes have a visual showing this stacking. Look at the center and count the layers—that's how many times that pixel processes through the fragment shader.

How to reduce overdraw:

**Disable Raycast Target** on decorative elements. If an image isn't meant to be clicked, uncheck Raycast Target. This also reduces event processing overhead.

**Use 9-slice sprites** instead of full images when possible. A 9-slice stretches the middle while keeping corners fixed—uses less texture sampling.

**Avoid full-screen overlays**. Use vignettes or partial coverage instead of completely covering the screen with transparent panels.

**Eliminate unnecessary backgrounds**. If a panel is always covered by other elements, don't draw it.

**Use the Overdraw visualization** in Scene view (dropdown at top left). Brighter areas = more overdraw. Aim for mostly dark (1-2 draws per pixel).

## World Space UI Optimization

World Space canvases have additional considerations.

Having many small World Space canvases—one per label—means each canvas has rebuild overhead and limited batching opportunities.

Consider an **anchoring strategy**: one World Space Canvas covering your scene, with empty GameObjects positioned at world locations as "anchors." UI elements parent to these anchors for positioning but all belong to the same Canvas, enabling batching.

Also, World Space UI doesn't auto-cull based on camera visibility. If labels are behind the camera or far away, manually disable the Canvas component (not the entire GameObject) to stop rendering while preserving hierarchy state.

## Text Rendering

Text is particularly expensive. Each character becomes geometry. Use **TextMeshPro** rather than legacy Text.

Legacy Text uses bitmap fonts that blur at large sizes and have limited features.

TextMeshPro uses **Signed Distance Field** fonts. The characters are defined mathematically, so they're crisp at any size. Effects like outlines, shadows, and glows are built in and efficient.

For VRify users who may struggle with technology, clear readable text is essential. Use appropriate font sizes, high-contrast colors, and test on actual target devices.

## Key Takeaways

UI uses CanvasRenderer, not MeshRenderer—entirely different system.

Three render modes: Overlay (always on top), Camera (rendered by specific camera), World Space (exists in 3D scene).

Canvas batches elements into combined meshes—same texture and material batches together, different ones break batching.

Canvas rebuilds when any element changes—expensive on CPU. Separate static and dynamic content into different Canvases.

Overdraw from stacked transparent panels kills performance. Use Overdraw view to diagnose, disable unnecessary rendering.

Use TextMeshPro for text—SDF rendering is crisp at any size.

For World Space UI, consider an anchoring strategy to enable batching.

Next lesson, we shift focus to VRify-specific content—3D file formats and data ingestion challenges.
