# Lesson 19: Advanced Rendering Techniques

## The Final Polish

We’ve covered the engine loop, the pipe, the shaders, and the massive data handling. This final lesson is about the "special sauce"—the tricks technical artists use to solve the visual problems that don't have a simple "on/off" switch in Unity.

Specifically, we're looking at how to handle shadows when your "scene" is 10 kilometers wide, and how to use the hidden buffers in your GPU to create effects like X-Ray vision or region-based highlighting.

## Shadows at Massive Scale

This is a classic geospatial problem. In a normal game, 50 meters of shadows is plenty. In a mining visualization, you might be looking at a whole mountain range.

If you just set your **Shadow Distance** in URP to 10 kilometers, your shadows will look like trash. Why? because Unity’s shadow map is a texture (e.g., 2048x2048). If you stretch those pixels across 10,000 meters, each "shadow pixel" is 5 meters wide. Everything looks blocky and flickers.

**The Solution? Don't use standard cascades for everything.**

1.  **Runtime Distance Tweak**: If the camera is 10 meters away from a truck, set the shadow distance to 50m. If the camera zooms out to the whole site, set it to 0 and switch to a different technique.
2.  **Top-Down Terrain Depth**: For a static mining site, you can render a single top-down depth map of the terrain once. In your shader, you use this map to calculate "ambient occlussion" for the ground. It’s a "fake" shadow that never changes and costs almost nothing.
3.  **Contact Shadows**: Use Screen-Space Shadows (SSAO or Contact Shadows) for the fine details near the camera. They don't depend on distance settings.

## The Stencil Buffer: Your Best Friend for Masking

The **Stencil Buffer** is an 8-bit mask (values 0-255) that lives alongside the depth buffer. 

Think of it like a roll of painter's tape. You can "tape off" parts of the screen by rendering an invisible mesh that writes "Value 1" to the stencil buffer.

**The desaturation zone example:**
VRify wants to highlight a specific mining claim. Everything inside is color, everything outside is gray.
1.  Render the claim boundary mesh. Set its shader to write `1` to the stencil buffer. (It doesn't even have to render pixels, just write the mask).
2.  Run a fullscreen post-processing effect.
3.  Tell the shader: "Only apply the color calculation if the stencil value is 1."

This is MUCH more efficient than trying to calculate "am I inside the boundary?" using math for every single pixel on every object.

## Depth Buffer Hacks (X-Ray)

The **Depth (Z) Buffer** is a map of how far away pixels are. Normally, we use it for "Z-Testing"—if a new pixel is further away than what’s already there, don't draw it.

But for tech art, we can invert this.

**X-Ray Vision**:
If you want to see a buried utility pipe through 50 meters of earth:
1.  Draw the pipe with an outline shader.
2.  Set its **ZTest** to `Greater`.
3.  This means: "Only draw these pixels if they are BEHIND something else."

Exactly what you want for a selection outline that shows through walls.

## Camera Stacking: Separation of Concerns

Finally, we have **Camera Stacking**. In URP, you can have a "Base" camera and multiple "Overlay" cameras.

-   **Base**: Your 3D world (geography, trucks).
-   **Overlay 1**: Selection Highlights (rendering specifically with a bloom effect).
-   **Overlay 2**: UI and Labels.

Why stack them? Because it prevents depth conflicts. If you have a giant 3D label in the world, you might want it to always render on top of the terrain, regardless of distance. Putting it in an Overlay camera with `Clear Depth` checked ensures it won't be occluded by a mountain.

## Key Takeaways

1.  **Shadows at scale** require a hybrid approach: close-range cascades and long-range fake shadows (top-down maps).
2.  **The Stencil Buffer** is for tagging regions of the screen for special effects (like zones or portals).
3.  **Depth Testing (ZTest)** can be flipped to create indicators that show through solid objects.
4.  **Camera Stacking** is the architectural way to layer your visuals so UI and highlights don't fight with the 3D world.

And that's it! That's the end of our technical roadmap. From the engine loop all the way to advanced rendering hacks, you've got the foundations to talk shop with any senior TA. Good luck with the prep!
