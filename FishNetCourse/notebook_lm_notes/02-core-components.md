# Lesson 02: The FishNet Foundations

## Introduction

This file is designed for **NotebookLM** to generate an audio podcast. Write in a way that translates well to spoken word.

Key framing for the AI hosts:
- They should sound like expert colleagues discussing the core components of FishNet for Unity.
- Avoid reading code line-by-line; instead, describe what the code *does*.
- Use analogies to explain complex concepts.

## Main Topic

Explain the building blocks of a FishNet multiplayer game. 

*   **Point 1:** To do anything over the network, your scripts must inherit from `NetworkBehaviour` instead of `MonoBehaviour`. 
*   **Point 2:**  NetworkObject assigns a global ID to a GameObject so the server and clients know they are looking at the exact same goblin or player.
*   **Point 3:** Lifecycle Hooks. Explain that `Start()` and `Awake()` are dangerous in multiplayer because the object might exist in the scene before the network has assigned it an ID. We must wait for `OnStartNetwork()`.

## Deep Dive

Go into specifics about Remote Procedure Calls (RPCs). 

> "Think of RPCs like sending a text message. A `[ServerRpc]` is a client texting the boss to ask permission to open a door. An `[ObserversRpc]` is the boss pulling the fire alarm—telling everyone in the building that an explosion just happened."

Explain that `SyncVars` are for persistent state (like Health) because they update late-joiners. RPCs are for events (like playing an explosion sound) that late-joiners don't need to know about.

## Key Takeaways

Summarize the main points the listener should remember.

1.  Use `NetworkBehaviour` and `OnStartNetwork()`.
2.  Use `[ServerRpc]` when the client wants the server to do something.
3.  Use `SyncVars` to sync state automatically.
