# Lesson 09: 3D File Formats

## The VRify Challenge: Data from Everywhere

VRify faces a unique pipeline challenge. You have 250+ clients, primarily in the mining industry, sending data in whatever format they happen to use. CAD files, topographic scans, point clouds, surveyor exports—all mixed together, all different software, all different coordinate systems.

Your job as a Technical Artist isn't just making things look good. It's building automation that can ingest this chaos and produce consistent, optimized, renderable assets.

This lesson is about understanding what comes in and how to handle it.

## The Core Principle: Normalization

CAD geometry and game geometry are fundamentally different. CAD uses mathematical curves—NURBS, Bezier, parametric surfaces. Games use triangles.

When you import a CAD file, you're **tessellating** those smooth curves into discrete triangles. This process has two critical controls:

**Chord Tolerance** (or chord height) controls how far the triangulated surface can deviate from the true curve. Lower tolerance = more triangles = smoother result. Higher tolerance = fewer triangles = more angular.

**Angle Tolerance** controls the maximum angle between adjacent triangles. Smaller angles = smoother shading. Larger angles = more visible faceting.

The key insight: there's no universally correct setting. You're always trading fidelity for triangle count. The goal is finding the threshold where additional triangles stop being visible—where the asset is "good enough" for the use case.

For browser targets, you're probably more aggressive about triangle reduction than you would be for desktop.

## Common Format Categories

Let's categorize the formats you'll encounter:

### Universal Exchange Formats

**OBJ** is the most basic. It's text-based, contains only geometry (vertices, normals, UVs, faces), and uses separate MTL files for materials. It's universally supported but loses metadata, hierarchy, and animation.

**FBX** is Autodesk's format but widely supported. Binary or ASCII. Contains mesh, materials, skeleton, animation, hierarchy, and custom properties. Unity imports FBX natively. This is your primary exchange format for game-ready assets.

**glTF / GLB** is the "JPEG of 3D"—web-optimized, open standard. GLB is the binary-packed version. It includes PBR material definitions, supports animation, and is excellent for web delivery. Unity has official glTF export and third-party import packages.

### CAD Formats

**STEP / STP** is the ISO standard for CAD exchange. Contains NURBS geometry that requires tessellation. Widely used in manufacturing and engineering. Unity doesn't import directly—you need mesh conversion in a preprocessing step.

**IGES** (pronounced "eye-jess") is an older CAD exchange format. Similar to STEP but less capable. Still encountered in legacy systems.

### Geospatial / Survey Formats

**DXF** is AutoCAD's exchange format. Can contain 2D drawings, 3D meshes, or topographic contours. Commonly used for mine site surveys. The challenge is that DXF can mean many different things—you need to understand what's actually in the file.

**LAS / LAZ** are point cloud formats from LiDAR scans. LAZ is compressed. These contain millions or billions of points with color and intensity. They don't contain triangles—you either render as points or convert to mesh.

**E57** is another point cloud format with better metadata support.

## Coordinate System Chaos

Here's a problem that catches everyone: different software uses different coordinate systems.

In Unity, Y is up. In 3ds Max, Z is up. Some CAD software uses different units—meters versus millimeters versus feet. Some geospatial data uses real-world coordinates (like latitude/longitude projected to meters) with values in the millions.

When importing, you need to:

**Check the axis orientation.** Is the model sideways? Rotate on import.

**Check the scale.** Is it microscopic or enormous? Scale on import.

**Check the units.** Unity uses meters internally—convert if the source is in other units.

## Critical Issue: Coordinate Precision

This is the most important concept in the lesson for VRify interviews.

Floats have limited precision—about 7 significant digits. As coordinates get larger, precision drops.

At position 0, you can represent micrometer differences.
At position 1 kilometer (1,000m), your precision is around 0.1mm.
At position 100 kilometers (100,000m), your precision is around 10mm—one centimeter error.
At position 1000 kilometers, your precision is 10cm—visible jitter during movement.

Mining sites often span kilometers. Geospatial data uses real-world coordinates that might be millions of meters from the origin. At those scales, GPU floating point precision causes visible problems—vertices jitter, seams appear, physics misbehave.

The solution is **origin shifting** (also called rebasing or floating origin).

The concept: instead of placing objects at their real-world coordinates (which might be huge), subtract a reference point to keep all coordinates within a reasonable range around zero.

Let's say your mine site is centered at coordinates (1,500,000m, 2,300,000m). Instead of using those coordinates directly, you pick a reference origin—maybe the center of the site—and subtract it from everything. Now all your objects are positioned relative to meters from that reference point, keeping values small.

Your notes include a code example showing this:

```csharp
Vector3 refOrigin = new Vector3(1500000f, 0f, 2300000f);
Vector3 worldCoord = assetData.position;
Vector3 localCoord = worldCoord - refOrigin;  // Now reasonable scale
```

This is fundamental knowledge for any geospatial visualization work. If someone asks you about precision issues at VRify, this is the answer.

## The VRify Ingestion Pipeline

Given all these formats and issues, what does an ingestion pipeline look like?

**Step 1: Normalize format.** Convert CAD to mesh format, unify to FBX or glTF as intermediate.

**Step 2: Apply origin shift.** Transform coordinates to local reference frame.

**Step 3: Tessellate/decimate.** Control triangle count to meet target budgets.

**Step 4: Material normalization.** Map source materials to a standardized PBR setup.

**Step 5: LOD generation.** Create lower-detail versions for distance rendering.

**Step 6: Validate.** Check for holes, flipped normals, degenerate triangles.

**Step 7: Export.** Output to Unity-ready format with proper import settings.

This pipeline needs to be automated—you can't have artists manually processing every upload from 250 clients.

## Key Takeaways

CAD and game geometry are fundamentally different—CAD uses curves, games use triangles. Tessellation bridges this gap.

Tessellation controls (chord tolerance, angle tolerance) trade fidelity for triangle count. Find the "good enough" threshold.

Common formats: OBJ (basic), FBX (rich), glTF (web), STEP/IGES (CAD), DXF (geospatial), LAS (point cloud).

Coordinate systems vary—check orientation, scale, and units on every import.

Floating point precision limits accuracy at large coordinates. Use **origin shifting** to keep coordinates manageable.

Ingestion pipelines must be automated to handle scale—format normalization, origin shifting, tessellation, material mapping, LOD, validation.

Next lesson, we'll look at mesh optimization techniques—decimation, hole repair, and LOD generation.
