# Lesson 03: Smooth Multiplayer Physics & CSP

## Introduction

This file is designed for **NotebookLM** to generate an audio podcast. Write in a way that translates well to spoken word.

Key framing for the AI hosts:
- They should sound like expert colleagues discussing Client-Side Prediction (CSP) in Unity's FishNet.
- Avoid reading code line-by-line; instead, describe what the code *does*.
- Use analogies to explain complex concepts.

## Main Topic

Explain Client-Side Prediction (CSP) and why it's necessary for a responsive Prince of Persia style game playing over the network. 

*   **Point 1: The Illusion of Zero Ping.** CSP is a magic trick. The client immediately runs its movement physics locally. At the same time, it mails those exact inputs to the server. The player feels zero lag. 
*   **Point 2: Replicate and Reconcile.** `[Replicate]` handles applying inputs to move the character. `[Reconcile]` handles snapping the client's position back to where the server says it actually is. 

## Deep Dive

Go into specifics about how replays work when a client gets a correction from the server.

> "Think of CSP like a musician playing a piece from memory, while listening to a conductor over a slightly delayed earpiece. You play the music ahead of the conductor. If you miss a note and the conductor corrects you, you instantly snap back to that measure, speed-play all the notes you've played since then, and get back in sync. That's Replicate and Reconcile."

Explain that `TimeManager.TickDelta` must be used instead of `Time.deltaTime`. If the client and server run at different frame rates, `Time.deltaTime` ruins the prediction.

## Key Takeaways

Summarize the main points the listener should remember.

1.  CSP makes multiplayer games feel responsive by letting clients predict movement.
2.  `[Replicate]` moves the character. `[Reconcile]` corrects the character.
3.  Always base your logic on Ticks, never variable framerates.
