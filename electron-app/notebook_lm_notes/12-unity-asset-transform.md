# Lesson 12: Unity Asset Transform

## What Is UAT?

Unity Asset Transform—often abbreviated UAT—is Unity's industrial-grade solution for importing CAD and manufacturing data. It's designed for exactly the kind of workflow VRify needs: taking STEP files, IGES files, and other CAD formats directly into Unity.

This is different from the typical game dev workflow where artists export FBX from Maya or Blender. UAT handles **native CAD formats** and performs tessellation, decimation, and organization automatically.

Knowing UAT positions you well for VRify because it directly addresses their data ingestion challenges.

## Core Capabilities

Let's walk through what UAT does.

### Native CAD Import

UAT imports formats like STEP, IGES, JT, Parasolid, and CATIA directly—no intermediate conversion step. When you drop a STEP file into your Unity project, UAT handles the entire process.

This matters because each conversion step introduces potential issues: lost metadata, altered geometry, broken assemblies. Native import minimizes these problems.

### Tessellation Control

Since CAD uses NURBS and games use triangles, tessellation is necessary. UAT exposes controls for this:

**Chord Tolerance** sets the maximum distance between the tessellated surface and the true CAD surface. Tighter tolerance means more triangles.

**Angle Tolerance** sets the maximum angle between adjacent triangle normals. Smaller angles mean smoother shading.

**Max Edge Length** caps how long any triangle edge can be, preventing elongated slivers.

These settings let you target a triangle budget while maximizing quality.

### Automatic Decimation

After tessellation, UAT can apply decimation using algorithms similar to QEM. You can reduce triangle counts by a percentage or to a target count.

This means you set rules: "Tessellate this STEP file, then reduce to 10,000 triangles." UAT handles the rest.

### LOD Generation

UAT can generate multiple LOD levels during import. From a single CAD file, you might generate:

- LOD0: Full tessellation, 100K triangles
- LOD1: 50% of LOD0
- LOD2: 20% of LOD0
- LOD3: Simple proxy or billboard

These get attached to a LODGroup, ready for runtime distance-based switching.

### Hierarchy Preservation

CAD assemblies have structure—parts, sub-assemblies, components with names and metadata. UAT preserves this hierarchy in Unity as GameObjects, maintaining the organizational structure.

This is valuable for VRify because you might want to select individual parts of a machine, hide components, or display metadata on hover.

### Material Mapping

CAD files often have material assignments—though they may use different schemas than PBR. UAT provides material mapping tables where you can configure how CAD materials translate to Unity materials.

You might map all "Steel" CAD materials to a shared metallic Unity material, all "Glass" to a transparency material, and so on.

## The Industrial License Question

Here's an important business consideration: UAT's full capabilities require an industrial license from PTC (they acquired the underlying technology).

The "Lite" functionality available with standard Unity is limited. Full programmatic control, batch processing, and some format support require the industrial license.

For VRify, this is a licensing conversation at the company level. But knowing that UAT exists and what it can do positions you to have that conversation intelligently.

## Scripting API

With proper licensing, UAT provides a scripting API for automation:

```csharp
// Example UAT import pseudocode
var importSettings = new CadImportSettings();
importSettings.chordTolerance = 0.001f;
importSettings.decimate = true;
importSettings.targetTriangles = 50000;
importSettings.generateLods = true;

CadImporter.Import("Assets/CAD/equipment.step", importSettings);
```

This enables the automated pipeline VRify needs. An AssetPostprocessor could trigger UAT import with standardized settings whenever CAD files are added to the project.

## Role in the VRify Pipeline

Positioning UAT within VRify's workflow:

**Client uploads CAD file** (STEP, IGES, etc.) to the ingestion system.

**Server-side processing** applies origin shifting and metadata extraction.

**UAT import** runs automatically with standardized settings—tessellation, decimation, LOD generation, material mapping.

**Validation** checks for holes, normals, and quality.

**Output** is optimized, browser-ready geometry with LODs and standardized materials.

This is the kind of pipeline automation that turns 250 uncoordinated client uploads into a manageable, quality-controlled process.

## Alternatives and Supplements

UAT isn't the only option for CAD import.

**PiXYZ** (also Unity-owned after acquisition) provides similar capabilities with a different licensing model.

**External conversion** using tools like FreeCAD, OpenCASCADE, or commercial CAD viewers can pre-convert to FBX before Unity import.

**Custom solutions** might integrate CAD libraries directly for specialized needs.

But knowing UAT specifically is valuable because it's Unity-integrated and positioned as their industrial solution.

## Key Takeaways

Unity Asset Transform is Unity's industrial CAD import solution, handling STEP, IGES, and other native CAD formats.

Core capabilities: native import, tessellation control, decimation, LOD generation, hierarchy preservation, material mapping.

Full functionality requires industrial licensing—an organizational decision.

The scripting API enables automation—exactly what VRify needs for their multi-client pipeline.

Knowing UAT demonstrates awareness of industrial workflows beyond typical game development.

Position it as: "I'm aware of UAT and its role in automating CAD-to-game conversion. At VRify scale, we'd need to evaluate the industrial licensing for full programmatic control."

Next lesson, we look at Editor Automation—building custom tools within Unity to enforce standards and accelerate workflows.
