# Lesson 01: FishNet vs Quantum & Server Topologies

## Introduction

This file is designed for **NotebookLM** to generate an audio podcast. Write in a way that translates well to spoken word.

Key framing for the AI hosts:
- They should sound like expert colleagues discussing the topic of transitioning from Photon Quantum to FishNet in Unity.
- Focus strictly on the mental "paradigm shift" required for a senior tech artist switching from deterministic lockstep to server-authority.
- Avoid reading code line-by-line; instead, describe what the code *does*.
- Use analogies to explain complex concepts.

## Main Topic

Explain the core difference between Quantum and FishNet.

*   **Point 1: Determinism vs Authority.** Quantum forces every player to run the exact same math simulation. If someone is out of sync, the game breaks. FishNet lets players run chaotic Unity physics, but the Server holds the undeniable "True" state. The Server tells the clients what actually happened, and clients just update their visuals to match.
*   **Point 2: Server Topologies.** Discuss the difference between a Headless Dedicated Server (runs in the cloud, un-hackable, zero ping advantage) versus Host/Relay mode. Explain that in a co-op game like Prince of Persia, Host Mode (often backed by a Relay so players don't have to port-forward routers) is common, but it gives the Host player an unfair 0ms ping advantage.

## Deep Dive

Go into specifics about why basic networked physics feels terrible.

> "Think of standard networked physics like driving a remote control car while watching it through an old security camera with a 1-second delay. You press left, nothing happens, then suddenly the car veers into a wall..."

Explain that the solution to this is **Client-Side Prediction (CSP)**, which we will deeply cover in Lesson 3. CSP is what makes Host/Relay games feel instant for everyone.

## Key Takeaways

Summarize the main points the listener should remember.

1.  Quantum = Perfect Math shared by everyone. FishNet = One Boss (Server) telling everyone the truth.
2.  FishNet allows standard Unity floats, transforms, and rigidbodies, making prototyping much faster.
3.  Host mode gives one player an advantage; CSP is required to fix the sluggish feel for everyone else.
