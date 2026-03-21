# Lesson 04: Slop-Box Architecture Case Study

## Introduction

This file is designed for **NotebookLM** to generate an audio podcast. Write in a way that translates well to spoken word.

Key framing for the AI hosts:
- They should sound like expert colleagues analyzing the architecture of a custom Unity multiplayer project called "Slop-Box".
- The game is a cooperative physics platformer similar to Prince of Persia.
- Use analogies to explain the architecture.

## Main Topic

Analyze the `NetworkMovement.cs` and `CharacterMovement.cs` architecture in the Slop-Box codebase.

*   **Point 1: Separation of Concerns.** The Slop-Box project brilliantly separates the pure visual physics (`CharacterMovement.cs`) from the network logic (`NetworkMovement.cs`). The network script just passes inputs down to the physics script. This is highly reminiscent of Photon Quantum's System and View separation.
*   **Point 2: TimeManager Hooking.** By hooking into `TimeManager.OnTick`, the Slop-Box game ensures its input is captured precisely when the server takes a step. 

## Deep Dive

Mention a highly specific optimization found in the code: Pitch vs Yaw synchronization.

> "Think of syncing a character's rotation like describing a statue. Describing the entire 3D orientation (a Quaternion) takes a lot of words (bandwidth). But if the body's horizontal rotation (Yaw) drives the physics, and the head's vertical look (Pitch) just drives the camera, you can sync the Yaw through the heavy Replicate struct, and just send the Pitch as a lightweight SyncVar. You save massive bandwidth while keeping the physics perfectly aligned."

## Key Takeaways

Summarize the main points the listener should remember.

1.  Keep your simulation code separate from your networking code.
2.  Bind your input logic directly to the network Ticks, not Unity's Update loop.
3.  Only put data into the Replicate struct that absolutely strictly drives the physical position of the object, optimizing everything else into standard SyncVars.
