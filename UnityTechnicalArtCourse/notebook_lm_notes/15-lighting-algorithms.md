# Lesson 15: Lighting Algorithms

## The Gap We're Filling

You know the dot product. You've used Shader Graph—hooking up color and alpha to the output node. But there's a missing piece: what's actually happening inside those lighting calculations? And here's a question you asked that cuts right to the core: if vertices have normals, how does a *pixel* get a normal?

Let's build this knowledge from the ground up.

## How Pixels Get Vertex Data: Interpolation

This is the first mystery. Your mesh has vertices. Each vertex has attributes—position, normal, UV, color. But your fragment shader runs per *pixel*, not per vertex. The GPU is processing millions of pixels that lie *between* vertices.

Here's how it works.

When the rasterizer determines which pixels are inside a triangle, it calculates something called **barycentric coordinates**. These are three weights—one for each vertex of the triangle—that describe how close the pixel is to each corner. The weights always sum to 1.

Imagine a pixel right in the center of a triangle. Its weights might be roughly (0.33, 0.33, 0.33)—equally influenced by all three vertices. A pixel near vertex 0 might have weights like (0.8, 0.1, 0.1)—mostly influenced by that corner.

Now here's the magic: the GPU uses these weights to **blend** all vertex attributes.

```
pixelNormal = w0 * vertex0.normal + w1 * vertex1.normal + w2 * vertex2.normal
pixelUV     = w0 * vertex0.uv     + w1 * vertex1.uv     + w2 * vertex2.uv
```

Whatever your vertex shader outputs, the fragment shader receives an interpolated version based on where the pixel falls within the triangle. This is automatic—you don't write this code. The GPU hardware does it between the vertex and fragment stages.

There's one gotcha though. When you interpolate between two unit-length normal vectors, the result isn't unit length. It's slightly shorter. So in your fragment shader, you need to **re-normalize** the interpolated normal before using it for lighting:

```hlsl
float3 N = normalize(input.worldNormal);  // Always re-normalize!
```

If you skip this, lighting calculations give slightly wrong results—subtle but incorrect.

## Lambert Diffuse: The Foundation of All Lighting

Now we can talk about actual lighting. Lambert is the simplest physically-motivated model. It describes how matte surfaces—like chalk, clay, or unpolished wood—scatter light.

The idea is simple: when light hits a surface straight-on, it's brightest. When light grazes the surface at a steep angle, less light hits each unit of area, so it's dimmer. When light comes from behind the surface, it contributes nothing.

The dot product captures this perfectly.

You have two vectors: **N**, the surface normal (pointing away from the surface), and **L**, the light direction (pointing *toward* the light source, not away from it). Take the dot product:

```hlsl
float NdotL = dot(N, L);
```

When N and L point the same direction, NdotL = 1. Brightest.
When they're perpendicular, NdotL = 0. Grazing angle, no contribution.
When L is behind the surface, NdotL goes negative.

We clamp negative values to zero because negative light doesn't make physical sense:

```hlsl
float diffuse = max(0, dot(N, L));
```

That's it. That's Lambert diffuse. Multiply by the light color and the surface color:

```hlsl
float3 finalDiffuse = lightColor * surfaceColor * max(0, dot(N, L));
```

Now let me address your specific question. You mentioned "normal dot tangent." That's not what Lambert uses—it's **normal dot light direction**. The tangent is used for something else we'll get to later (normal mapping). Lambert is purely about how the surface faces relative to where the light is coming from.

## Half-Lambert: Softening the Shadows

Standard Lambert has a problem for stylized games: shadows are harsh. Anything facing more than 90 degrees away from the light goes completely black. For realistic outdoor scenes with ambient light bouncing everywhere, this might be fine. For a character in a stylized game, they can look like they've been dunked in ink on one side.

Valve came up with Half-Lambert for Half-Life 2. The trick is simple: remap the dot product so it never goes fully dark.

Standard Lambert: NdotL ranges from 0 to 1.
Half-Lambert: we remap it to range from 0.5 to 1.

```hlsl
float halfLambert = dot(N, L) * 0.5 + 0.5;
```

When NdotL is 1 (facing the light), half-lambert is 1.
When NdotL is 0 (perpendicular), half-lambert is 0.5.
When NdotL is -1 (facing away), half-lambert is 0.

Often we square the result for a nicer falloff curve:

```hlsl
halfLambert = halfLambert * halfLambert;
```

This isn't physically accurate, but it's visually pleasing for many art styles. Characters stay readable in shadow without needing extra fill lights.

## Phong Specular: Adding Shine

Lambert describes diffuse reflection—light scattering equally in all directions. But shiny surfaces have **specular highlights**—bright spots where light reflects directly toward your eye.

Think about a white plastic ball under a light. You see the overall color (diffuse), but you also see a bright spot where the light source reflects directly at you (specular).

Phong models this by comparing the **reflection direction** with the **view direction**.

First, calculate where light would reflect off the surface:

```hlsl
float3 R = reflect(-L, N);  // HLSL built-in function
```

The `reflect` function mirrors the incoming light direction around the normal. Note the negative sign on L—`reflect` expects the direction pointing *toward* the surface.

Then compare this reflection with the view direction V (pointing toward the camera):

```hlsl
float3 V = normalize(cameraPosition - pixelWorldPosition);
float RdotV = max(0, dot(R, V));
```

When R and V align, you're looking directly at the reflected light—maximum specular. As they diverge, specular falls off.

The **shininess** exponent controls how tight the highlight is:

```hlsl
float specular = pow(RdotV, shininess);
```

Low shininess (8-16) gives a soft, wide highlight—like rubber or skin.
High shininess (128-256) gives a tiny, sharp highlight—like polished metal or glass.

## Blinn-Phong: The Industry Standard

Phong works, but Blinn-Phong is usually better. It's slightly cheaper to compute and behaves better at grazing angles.

Instead of calculating the reflection vector, Blinn-Phong uses the **half vector**—the direction exactly between the light and the view:

```hlsl
float3 H = normalize(L + V);  // Half vector
float NdotH = max(0, dot(N, H));
float specular = pow(NdotH, shininess);
```

The intuition: if the surface normal aligns with the half vector, then light from L will reflect directly toward V. Same result, different math.

Blinn-Phong is what you'll see in most traditional game lighting. Unity's legacy shaders used it. Many tutorials teach it.

## The Classic Equation: Ambient + Diffuse + Specular

Putting it together, the classic lighting model is:

```
Final Color = Ambient + Diffuse + Specular
```

**Ambient** is a constant term—fake light that prevents pitch-black shadows. It's a cheat to approximate global illumination without actually computing it:

```hlsl
float3 ambient = ambientColor * surfaceColor;
```

**Diffuse** is Lambert:

```hlsl
float3 diffuse = lightColor * surfaceColor * max(0, dot(N, L));
```

**Specular** is Blinn-Phong:

```hlsl
float3 specular = lightColor * specularColor * pow(max(0, dot(N, H)), shininess);
```

Combined:

```hlsl
float3 finalColor = ambient + diffuse + specular;
```

That's the foundation. Every piece of this is a dot product with clamping and maybe a power function.

## Fresnel: Edge Glow

Here's one more effect that comes up constantly: **Fresnel** (pronounced "freh-NEL").

Look at a table from directly above—you see the wood grain, the surface color. Now look at it at a very shallow angle, almost edge-on—you start seeing reflections. Surfaces reflect more light at grazing angles.

The math is again a dot product:

```hlsl
float NdotV = max(0, dot(N, V));  // How much are we looking straight at the surface?
float fresnel = pow(1.0 - NdotV, fresnelPower);  // Invert and power
```

When looking straight at the surface, NdotV is 1, so fresnel is 0.
When looking at a grazing angle, NdotV approaches 0, so fresnel approaches 1.

Use cases: rim lighting on characters, environmental reflections, water surfaces, energy shields, hologram edges. Any "edge glow" effect is probably Fresnel.

## Normal Mapping: Where Tangent Comes In

Now we can answer where tangent fits in.

Normal maps store high-detail surface normals in a texture. But those normals aren't in world space—they're in **tangent space**. Tangent space is a coordinate system local to each vertex, where:

- The tangent points along the UV.x direction
- The bitangent points along the UV.y direction
- The normal points perpendicular to the surface

When you sample a normal map, you get a direction in tangent space. To use it for lighting (which happens in world space), you need to transform it. That's what the **TBN matrix** does—it's built from the tangent, bitangent, and normal vectors.

```hlsl
float3 tangentNormal = tex2D(normalMap, uv).xyz * 2.0 - 1.0;  // Decode from [0,1] to [-1,1]
float3x3 TBN = float3x3(worldTangent, worldBitangent, worldNormal);
float3 worldNormal = normalize(mul(tangentNormal, TBN));

// Now use worldNormal for lighting
float NdotL = max(0, dot(worldNormal, L));
```

So tangent isn't used directly in lighting—it's used to *transform normal map data* so lighting can use it.

## What Shader Graph Does Under the Hood

When you plug a normal map into Shader Graph's Normal input and use the default Lit shader, this is what's happening automatically. The graph computes the TBN matrix, transforms your normal map sample, and plugs the result into Blinn-Phong (or more accurately, into Unity's PBR calculations, which are more sophisticated but built on these same foundations).

Understanding these basics means you can:
- Debug when lighting looks wrong
- Write custom shaders when Shader Graph is too limiting
- Understand performance implications (more dot products = more instruction cost)
- Communicate precisely about rendering in interviews

## Key Takeaways

**Interpolation** is how pixel data comes from vertices. The GPU blends all vertex outputs using barycentric coordinates based on pixel position within the triangle.

**Re-normalize interpolated normals** in the fragment shader—interpolation shortens them.

**Lambert diffuse** = max(0, N · L). The foundation of matte surface lighting.

**Half-Lambert** = (N · L) * 0.5 + 0.5. Valve's trick for softer shadows.

**Phong specular** uses the reflection vector R and compares to view V.

**Blinn-Phong** uses the half vector H = normalize(L + V). Industry standard, slightly better than Phong.

**Fresnel** = pow(1 - N · V, power). Edge glow at grazing angles.

**TBN matrix** transforms normal map samples from tangent space to world space—that's where tangent comes in.

**Ambient + Diffuse + Specular** is the classic lighting equation.

Everything is dot products, clamping, and power functions. Once you internalize that, you can read any traditional lighting shader.
