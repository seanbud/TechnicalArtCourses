# Lesson 11: WebGL and Browser Optimization

## The Browser Is a Different Beast

Everything we've discussed has browser implications, but this lesson consolidates them. WebGL running in a browser is fundamentally more constrained than native desktop or mobile apps.

Understanding these constraints isn't just technical knowledge—it's the core of VRify's product challenge. They're delivering 3D visualization in a browser because browsers are universally accessible. No app install. No platform restrictions. Just send a URL.

But that accessibility comes with severe technical limits.

## Memory Constraints

This is the biggest difference. Native apps can use gigabytes of RAM. Browser tabs are limited.

On desktop Chrome, a single tab might be limited to 2-4GB depending on system RAM and browser settings. On mobile browsers, you might have 256MB to 1GB. Some browsers on low-end devices crash if a tab exceeds 512MB.

This memory holds everything: your compressed JavaScript/WASM build, the Unity runtime, all loaded textures, all loaded meshes, audio, and the framebuffer.

Implications:

**Texture budget is critical.** A single uncompressed 4K texture is 64MB. Ten of them and you've blown your budget.

**Mesh budget matters.** A 1-million vertex mesh with full attributes might be 60MB.

**Asset loading must be strategic.** You can't load everything upfront. Use **Addressables** or streaming to load assets on demand and unload when not needed.

## Texture Compression

GPU texture compression is essential for browser targets. Compressed textures take less memory *and* less bandwidth when loading.

**ETC2** is the standard format for WebGL 2.0 / OpenGL ES 3.0. It's a lossy compression with fixed 4:1 ratio. All modern browsers support it.

**ASTC** is a newer format with variable compression ratios (4x to 36x). Better quality per byte than ETC2. Supported on newer devices—check compatibility.

**DXT/BCn** formats are desktop GPU standards but aren't natively supported by WebGL—avoid for browser targets.

Your notes have a table showing texture sizes with different compression. A 2048×2048 RGBA texture:
- Uncompressed: 16MB
- ETC2: 4MB
- ASTC 4×4: 4MB
- ASTC 8×8: 1MB

That's 16× memory reduction from uncompressed to high ASTC compression. The visual quality difference at the aggressive end is visible, so you balance based on importance—hero assets get better compression, background elements can be more compressed.

In Unity, set texture compression format in Platform settings. On the WebGL tab, choose ETC2 or ASTC based on your target browser baseline.

Mipmaps are important too. Smaller mip levels keep memory bounded and prevent aliasing on distant textures. Always enable mipmaps unless the texture is always viewed at full size (like UI).

## Initial Load Time

Users won't wait forever for your 3D experience to load. Every megabyte of the initial download costs time and risks abandonment.

**Brotli compression** is the new standard—20-30% smaller than gzip for the same content. Unity WebGL builds support it natively. Server must be configured to serve .br files with correct headers.

**Addressables** allow splitting your build. The core build is small (maybe 10MB), and assets load on demand after the initial experience starts. A loading indicator in-world is better than a blank page with a progress bar.

**Lazy loading** defers non-critical assets. Don't load areas the user hasn't navigated to yet.

**Preloading** can happen in the background. While the user is in area A, start loading area B's assets.

## Shader Compilation Stalls

Here's a browser-specific gotcha: **shader compilation happens at first use, not at build time.**

When your WebGL build first renders something with a particular shader variant, the browser's JavaScript engine must compile that GLSL to GPU machine code. This takes milliseconds—visible as a hitch or freeze.

Strategies to mitigate:

**Shader Variant Collections**: Pre-identify which variants you need and trigger compilation during a loading screen by doing a hidden render pass.

**Reduce variant count**: Use `shader_feature` instead of `multi_compile` where possible to strip unused variants.

**Warm-up pass**: On scene load, briefly render each material type off-screen to trigger compilation before gameplay starts.

This is a particularly frustrating issue because it doesn't appear in the editor—it only happens in actual browser builds. Always test in real browsers.

## Single-Threaded Execution

WebGL runs on the browser's main thread. There's no multi-threading (Web Workers exist but can't access WebGL context). This means:

**Heavy Update() logic blocks everything**—including the browser UI. If your frame takes too long, the browser tab becomes unresponsive.

**No background loading by default.** Unity's job system is limited in WebGL. Loading large assets can freeze the frame.

**Audio can glitch** if the main thread stalls.

The mitigation is aggressive optimization of per-frame work and spreading heavy operations across multiple frames using coroutines.

## Performance Best Practices Summary

Your notes have a comprehensive checklist. Let me walk through the key items:

**Rendering:**
- Forward rendering, not Deferred (memory reasons)
- MSAA 2x or FXAA
- Aggressive LOD and culling
- SRP Batcher enabled

**Textures:**
- ETC2 or ASTC compression
- Reduce max resolution (1024×1024 for most, 2048 for hero)
- Enable mipmaps

**Meshes:**
- Aggressive decimation
- Use LODGroup for everything visible at distance
- Minimize vertex attributes (do you really need tangents if no normal maps?)

**Loading:**
- Use Addressables for content beyond core build
- Brotli compression
- Show meaningful loading feedback

**Code:**
- Avoid heavy per-frame allocation (creates GC pressure)
- Cache component lookups
- Don't use Update() on objects that don't need it
- Spread heavy operations across frames

## Testing Matrix

Different browsers behave differently. At minimum, test on:

**Chrome (desktop and mobile)** - Usually the best WebGL performance
**Firefox** - Often comparable to Chrome
**Safari (desktop and iOS)** - Historically problematic, Metal backend differences
**Edge** - Chromium-based now, similar to Chrome

Mobile browsers on low-end Android devices are your stress test. If it works there, it works everywhere.

## Key Takeaways

Browser memory is limited—typically 2-4GB max, often less on mobile. Texture and mesh budgets are critical.

Use GPU texture compression: ETC2 for broad compatibility, ASTC for newer devices.

Initial load time matters. Use Brotli compression and Addressables to split content.

Shader compilation happens at first use in browser, causing stalls. Pre-warm shaders during loading.

WebGL is single-threaded—heavy work freezes everything. Optimize aggressively.

Test across browsers. Safari and low-end Android are common problem areas.

Next lesson, we'll look at Unity Asset Transform—a specialized tool for CAD-to-mesh conversion.
