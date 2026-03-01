# Lesson 10: Pipeline Centralization — One Pipeline For 15 Vendor-Clients

## The Problem: 15 Clients, 15 Ways

Here's the challenge that EA's capture studio faces every day. They don't serve one game team. They serve about fifteen different vendor-clients — the FC team wants output one way, Madden wants it another, Battlefield has its own skeleton template, and then there's an external metaverse partner that doesn't even want FBX files, they want glTF.

Each of these clients has a different skeleton template, different naming conventions, different export formats, and different delivery destinations. FC wants Perforce. Madden wants a NAS drop. The metaverse partner wants files in an S3 bucket.

If you write a separate pipeline script for each client, you end up with fifteen export scripts, fifteen naming validators, fifteen delivery scripts. When you change the core pipeline — say you upgrade the FBX exporter — you have to update all fifteen. That doesn't scale. It breaks. It creates bugs. And most importantly, it's a maintenance burden that eats your entire team's bandwidth.

## The Architecture: Shared Core + Per-Client Config

The solution is centralization. One pipeline engine, many configuration profiles.

The core pipeline code handles the universal stages: ingest, validate, solve, retarget, export, deliver. It never mentions a specific client name. It reads a JSON configuration file that says "this client wants this skeleton, this format, this delivery method."

Here's the golden rule: if you can grep the core pipeline source code and find the word "FIFA" or "Madden" anywhere, you have a design flaw. Client specifics belong only in configuration files. The code is generic. The config is specific.

Each client gets their own JSON config file. It specifies their skeleton template and required joints, their naming pattern as a regex, their export format and version, their delivery method and destination, and their validation thresholds. The pipeline runner loads the right config, and everything just works.

## The Client Registry

You build a Client Registry — a Python class that scans a directory of JSON config files at startup and loads them all into memory. When the pipeline needs to process a file for a specific client, it asks the registry: "Give me the profile for fc_sports." The registry hands back a ClientProfile object that knows everything about that client's requirements.

This is clean, testable, and scalable. To add a new client, you create a new JSON file. No code changes. No pull request against the core pipeline.

## What About "Metaverse Stuff"?

You mentioned hearing about custom tools for a metaverse client, and wondering what that is. Here's the practical reality.

"Metaverse" in this context means real-time avatar animation. Think of it like VTubers, virtual concerts, or platforms like Meta's Horizon Worlds. The key differences from traditional game mocap:

First, the skeletons are much simpler. A AAA game character might have 200 joints — fingers, face, twist bones, helper bones. A metaverse avatar might have 40. You need a retarget template that maps your full mocap solve down to a simplified skeleton.

Second, the output format is different. The metaverse ecosystem runs on web-friendly formats. glTF — GL Transmission Format — is called "the JPEG of 3D." It's small, fast to load, works in web browsers. You export to glTF or GLB (the binary version) instead of FBX.

Third, the delivery might be real-time streaming instead of file drops. Instead of writing an FBX to a NAS, you might stream joint rotations live via WebSockets or Unreal's LiveLink.

And fourth, the performance budgets are aggressive. Meshes under 5K triangles. Compressed textures. Everything optimized for mobile VR headsets.

## When Custom Tools Are Justified

Not everything can be handled by configuration. Some clients need genuinely custom tools. The question to ask is: "Can this be expressed as data in a config file, or does it require new code behavior?"

Different naming convention? That's just a regex in the JSON config. Different skeleton? A joint map JSON file. Different export format? That's an export adapter — you write it once and it works for any client that needs that format.

But real-time mocap streaming to avatars? That requires a custom LiveLink bridge. Custom facial blendshape mapping for a specific partner? That's a client-specific retarget tool. Auto-LOD generation for mobile metaverse? That's a custom decimation pipeline.

When you DO need custom behavior, isolate it in a plugin. The core pipeline defines hook points — pre-export, post-export, custom-validate, custom-retarget. A client-specific plugin can register functions for any of these hooks. The core pipeline calls them at the right time. If the plugin doesn't exist, the pipeline just skips the hook and continues with default behavior.

This is a plugin architecture. Each plugin is a Python module in a plugins directory. It has a `register()` function that returns its client ID. The Plugin Manager discovers all plugins at startup and makes them available to the pipeline runner.

## Multi-Destination Delivery

Just as export format varies by client, so does delivery destination. You build delivery adapters — the same pattern as export adapters. Perforce delivery uses P4Python. NAS delivery uses file copy with MD5 verification. S3 delivery uses boto3. SFTP delivery uses paramiko. A factory picks the right adapter based on the client config.

The pipeline runner doesn't know or care where the file goes. It just calls `delivery.deliver(output_path, profile)` and the adapter handles the rest.

## Key Takeaways

*   One core pipeline, many configs. Client specifics belong in JSON configuration files, never in the core code.
*   Use the Adapter + Factory pattern for both export and delivery. Each format or destination has its own class. A factory picks the right one.
*   Plugin architecture for custom tools. When a client needs unique behavior, isolate it in a plugin module with defined hook points.
*   "Metaverse" means real-time avatars, lightweight rigs, web-friendly formats like glTF, and potentially live streaming instead of file delivery.
*   Centralization doesn't mean one-size-fits-all. It means having a unified architecture that flexes to accommodate differences without forking the codebase.
*   Adding a new client should be a config file change, not a code change. That's the litmus test of a well-centralized pipeline.
