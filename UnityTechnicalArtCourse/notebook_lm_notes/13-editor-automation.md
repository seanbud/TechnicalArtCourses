# Lesson 13: Editor Automation

## Why Build Tools?

A Technical Artist at VRify isn't just processing individual assets by hand. With 250+ clients sending data continuously, manual processes don't scale.

Editor automation means building tools within Unity that:

- Enforce technical standards automatically
- Batch process assets consistently
- Catch problems before they reach production
- Free artists to focus on creative work rather than repetitive tasks

This is where you shift from "content creator" to "pipeline engineer."

## Types of Editor Tooling

Unity provides several mechanisms for extending the Editor. Let me walk you through the categories.

### Menu Items

The simplest level. You add custom menu entries that run scripts.

```csharp
[MenuItem("VRify/Batch Process Selected")]
static void BatchProcessSelected()
{
    foreach(var obj in Selection.objects)
    {
        ProcessAsset(obj);
    }
}
```

Menu items appear in Unity's top bar. They can trigger validation, batch processing, or open custom windows.

### Editor Windows

Custom panels that float or dock in the Unity Editor. These are for complex tools that need their own UI.

Creating an Editor Window involves extending `EditorWindow` and implementing `OnGUI()` to draw the interface.

```csharp
public class AssetValidatorWindow : EditorWindow
{
    [MenuItem("VRify/Asset Validator")]
    static void ShowWindow()
    {
        GetWindow<AssetValidatorWindow>("Asset Validator");
    }

    void OnGUI()
    {
        if (GUILayout.Button("Validate All Assets"))
        {
            RunValidation();
        }
        // Display results...
    }
}
```

The window stays open. The user can interact with it. It can display logs, results, and settings.

### Custom Inspectors

When you select an object, the Inspector shows its properties. You can override this with custom visualization for your own components.

Custom Inspectors are useful for surfacing relevant data (like mesh stats), hiding confusing properties, and adding quick-action buttons.

### Property Drawers

Fine-grained control over how individual fields appear in the Inspector. Want a color picker that shows a preview? A slider with custom labeling? That's a Property Drawer.

### Gizmos and Handles

3D visualization and manipulation in the Scene view. Gizmos draw debug visualization (spheres, lines, labels). Handles provide interactive manipulation (move tool, custom rotation handles).

For VRify, you might draw bounds around asset clusters, visualize LOD radius, or show coordinate system origin.

## AssetPostprocessors: Automatic Standards

This is the killer feature for pipeline automation.

An **AssetPostprocessor** is a script that runs automatically whenever Unity imports an asset. It's triggered by the import pipeline—no manual action required.

```csharp
public class ModelPostprocessor : AssetPostprocessor
{
    void OnPreprocessModel()
    {
        // Settings applied BEFORE import
        ModelImporter importer = (ModelImporter)assetImporter;
        importer.materialImportMode = ModelImporterMaterialImportMode.None;
        importer.optimizeMeshPolygons = true;
    }

    void OnPostprocessModel(GameObject root)
    {
        // Modifications AFTER import
        foreach (var renderer in root.GetComponentsInChildren<Renderer>())
        {
            // Validate, fix, or tag...
        }
    }
}
```

Every time someone drops an FBX or model file into the project, this code runs. You can:

- Enforce import settings (disable material import, set animation compression)
- Validate geometry (check triangle counts, detect issues)
- Apply naming conventions
- Generate metadata
- Log warnings or errors for non-compliant assets

For VRify, the AssetPostprocessor might:

1. Check if the mesh exceeds the triangle budget
2. Validate that LODs exist and are properly configured
3. Ensure materials use the standardized shader
4. Log coordinate ranges to detect origin shifting issues
5. Tag the asset with import date and source information

All of this happens automatically—no human remembers to run validation because validation is the import process.

## The Editor Folder Rule

Critical detail: Editor scripts must be in a folder named "Editor" somewhere in their path. This tells Unity to compile them separately and exclude them from runtime builds.

```
Assets/
  Scripts/
    Runtime/
      GameplayController.cs    // Included in build
    Editor/
      AssetValidator.cs        // Editor only
  VRify/
    Editor/
      ModelPostprocessor.cs    // Editor only
```

If you put an Editor script in a regular folder, it will either fail to compile (missing EditorWindow references at runtime) or bloat your build with code that shouldn't be there.

## Practical Tool Ideas for VRify

Let me give you concrete examples of tools that would be useful:

**Asset Health Dashboard**: An Editor Window that scans the project and reports:
- Total triangle count by scene
- Assets exceeding poly limits
- Materials not using the approved shader
- Textures not using GPU compression

**Coordinate Validator**: Checks imported meshes for coordinate ranges. If any vertex exceeds a threshold (indicating un-shifted world coordinates), it flags the asset.

**LOD Generator**: Right-click menu on a mesh asset that generates LOD levels using automated decimation.

**Material Consolidator**: Scans selected assets, identifies similar materials, and offers to combine them into atlas-based shared materials.

**Import Report**: AssetPostprocessor that writes a report file for each import—source file, import date, triangle count, validation status.

## ScriptableWizard for One-Off Tasks

For tools that run once with parameters and exit, Unity provides `ScriptableWizard`. It's a pre-built pattern for "fill in settings → click button → run process → close."

```csharp
public class BatchDecimateWizard : ScriptableWizard
{
    public float targetReduction = 0.5f;

    [MenuItem("VRify/Batch Decimate...")]
    static void CreateWizard()
    {
        DisplayWizard<BatchDecimateWizard>("Batch Decimate", "Run");
    }

    void OnWizardCreate()
    {
        // Run decimation with settings...
    }
}
```

The wizard pops up, you adjust settings, click "Run," and it executes.

## Key Takeaways

Editor tooling transforms a TA from "person who fixes things" to "person who builds systems that prevent problems."

Menu Items are simple hooks into custom functionality.

Editor Windows are full custom UI panels within Unity.

AssetPostprocessors are the automation backbone—they run on every import, enforcing standards without human action.

Always place Editor scripts in an "Editor" folder to exclude them from builds.

For VRify, think in terms of:
- Automated validation that catches problems immediately
- Batch processing that applies standards consistently
- Dashboards that give visibility into asset health

The right tooling means 250 clients can submit data without 250× manual review.

## What's Next?

That's the final lesson. Flip to the Cheat Sheet for a consolidated reference of all the key concepts we've covered. 

Good luck with the interview!
