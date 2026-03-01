# Lesson 09: The Real EA Pipeline — Vendors, Post-Production & Manual Cleanup

## The Reality: EA Doesn't Do Everything In-House

Here's something important that might surprise you after the earlier lessons. EA does not build every piece of the capture pipeline themselves. The heavy math — solving point clouds into bones, performing 3D body scans, even retargeting in many cases — that's all done by proprietary vendor software. Vicon Shogun Post does the solving. OptiTrack Motive does its own version. DI4D handles facial capture processing. External scan vendors deliver meshes from structured-light scanners like Artec or FARO.

EA's role — and specifically YOUR role as a Senior Pipeline TA — is to orchestrate the data flow between all these stages. You're the connective tissue. You make sure data gets from vendor A to vendor B to the artist's workstation without losing integrity, without wrong naming, without broken hierarchies. You build the automation that ties all these vendor outputs together into one coherent pipeline.

Think of it like this: the vendors are specialist subcontractors. They're incredibly good at their one thing. But they don't talk to each other. They don't know your naming conventions. They deliver in their own formats, their own units, their own coordinate systems. Your job is to be the translator and the traffic controller.

## Post-Production: The Manual Reality

After the automated solve and retarget, the data is close — but rarely perfect. This is where "post-production" comes in, and it's more manual than you'd expect at a company like EA.

Here's what gets fixed by hand:

**Bone corrections.** After retargeting through HumanIK, you'll get artifacts. Fingers might interpenetrate during a grab. Shoulders might pop on fast overhead reaches. The spine might twist in a way that looks unnatural on the game character even though the actor's motion was natural — because the proportions are different. An animator or TA sits down in MotionBuilder, scrubs through frame by frame, and tweaks the curves. This is tedious but critical.

**Naming conventions.** This is a huge one. Vicon's solver outputs joints named things like `Vicon_LFemur` or `LFEMUR_jnt`. But your game engine's skeleton template expects `L_Thigh`. Someone has to remap these. In many cases you'll write a Python tool that does this automatically using a JSON mapping file — but there are always edge cases. Maybe the vendor added an extra helper joint. Maybe they used a custom marker set for a specific actor and the names don't match. That edge case lands on someone's desk for manual fixing.

**Contact cleanup.** This is the big one. The solve algorithm doesn't know about the environment. It doesn't know the actor's foot was supposed to be planted on a stair. It doesn't know the hand was resting on a table. So after the solve, you see foot skating — the foot slides on the ground instead of staying planted. A human has to go in, identify the contact frames, and lock the IK targets. This is sometimes called "foot-locking" or "contact keying."

**Marker occlusion gaps.** When markers are occluded — say the actor crosses their arms and the wrist markers become invisible — the solver fills the gap with interpolation. Sometimes that interpolation is wrong. The hand goes through the body, or the trajectory curves in an impossible direction. Manual curve editing fixes this.

**Scale and world-space.** Different vendors deliver at different scales. One vendor gives you data in meters, another in centimeters. One uses Z-up, another uses Y-up. If you don't normalize, your character is either a giant or microscopic, or lying on their side.

The key takeaway here: reducing this manual cleanup time is one of the highest-impact things you can do. Every minute you shave off post-production, multiplied by thousands of takes per year, equals months of recovered artist time. When the interview asks about "reduced processing time," this is ground zero.

## NAS, Network Drives, and FBX Delivery

At the tail end of the pipeline, the final deliverable is an FBX file dropped onto a network drive. I know you had a question about whether a NAS is a network drive — and the answer is yes.

A **NAS** — Network-Attached Storage — _is_ a type of network drive. It's a dedicated hardware appliance whose only job is to serve files over the network. You've probably heard brand names like Synology or QNAP for consumer models, or NetApp and Isilon for enterprise. They speak standard file-sharing protocols: SMB for Windows, NFS for Linux and Mac.

When EA says "we put FBX files on a network drive," they almost certainly mean a NAS or an enterprise file server with SMB shares. On each artist's Windows workstation, that share is mapped as a drive letter — like `N:\captures\output\` — and it looks like a local folder.

A **SAN** — Storage Area Network — is different. That's block-level storage, like having a raw hard drive plugged in over a high-speed network. Faster and more expensive, used for things like video editing bays or databases, not typically for file delivery.

But here's the production reality: most studios use all of these in layers. The NAS is the fast staging area — immediate artist access. Perforce is the versioned source of truth — full audit trail, change history, exclusive locking for binary files. And cloud storage like S3 is the long-term archive — unlimited capacity, global access. Your Python scripts move data between these layers automatically.

## The Post-Production Checklist Tool

One of the most impactful tools you can build is a "QA checklist" that artists run with one click before marking a take as post-production complete. It checks naming conventions against a regex pattern. It verifies all required joints exist. It confirms the root joint is near the world origin at frame zero. It checks that the scene is in centimeters with Y-up. It flags suspicious frame ranges.

This is a great example for the interview. It's a tool that directly reduces errors, catches problems before they reach delivery, and automates what would otherwise be a tedious manual checklist that humans will inevitably skip under deadline pressure.

## Key Takeaways

*   EA orchestrates the pipeline, vendors do the heavy processing. Your value is in the data flow, validation, and automation between stages.
*   Post-production is manual and expensive. Naming fixes, bone cleanup, contact correction — still done by hand. Automating any part of this has massive ROI.
*   A NAS is a network drive. It's a dedicated file server appliance. FBX files are delivered to artists via mapped SMB shares.
*   Layer your delivery: NAS for speed, Perforce for versioning, S3 for archival. Each layer serves a different purpose.
*   Config over code: joint mappings, naming patterns, delivery paths — all in JSON config files, never hardcoded. If you move to a different project with different vendor naming, you change the config, not the code.
*   Validate everything. MD5 hashes after every file copy. QA checklists before every delivery. No exceptions.
