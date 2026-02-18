# Lesson 07: System Design & Leadership

## Designing for The Sad Path

We have covered a lot of specific technologies: Python, Perforce, Docker, SQL.
But the difference between a Junior and a Senior TA is looking at the system as a whole.
A Junior asks: "How do I make this work?"
A Senior asks: "What happens when this breaks?"

This is **System Design**. You must assume failure. The network *will* go down. The disk *will* fill up. The artist *will* click the button wrong.
You must design for the "Sad Path"—the failure state.

## The Principle of Decoupling

The most powerful tool in system design is **Decoupling**.
Imagine a Camera connected directly to a Server. If the Server crashes, the Camera stops working. The shoot is ruined. They are "Tightely Coupled."

Now imagine we put a **Queue** in the middle.
The Camera writes to the Queue. The Queue buffers the data locally.
The Server reads from the Queue.
If the Server crashes, the Queue just fills up. The Camera keeps shooting. When the Server comes back online, it catches up.
By decoupling the two systems, we made the entire pipeline robust against network failure.

## Latency vs. Throughput

You also need to understand optimization goals.
**Latency** is "Time to First Byte." How fast does it happen? (Crucial for Tools/UI).
**Throughput** is "Volume per Second." How much can we do? (Crucial for the Farm).

Often, these are trade-offs. To get high throughput (Chunking jobs on the farm), we accept higher latency (waiting to fill a chunk). You need to know which one matters for the problem you are solving.

## Leadership: Code Review as Culture

Finally, let's talk about the human system.
As a Senior, your code matters less than your influence. The primary way you influence the team is through **Code Review**.
This is not just about catching bugs. It is about mentorship.
When you review a Junior's code, explain the *Constraint*, not just the *Fix*.
Don't say: "Change this path."
Say: "We should use a relative path here, because the render nodes on Linux don't have drive letters."

Now you aren't just fixing a typo; you are teaching system architecture. You are raising the bar for the whole team.

## EA Relevance: Telemetry in Need for Speed

How do we know what to fix? In *Need for Speed*, we track player data (which cars are used). In Tech Art, we track **Tool Telemetry**.
We log every time a tool is used, and every time it crashes.
If we see that the "Import Car" tool is crashing for 50% of users, we know we have a crisis—even if nobody has reported it yet. Telemetry allows us to be proactive rather than reactive.

## Key Takeaways

*   **Robustness:** Design for failure. Assume things will break.
*   **Decoupling:** Use queues and buffers to isolate components from each other.
*   **Trade-offs:** Understand if you are optimizing for Latency (Speed) or Throughput (Volume).
*   **Influence:** Use Code Review and Telemetry to guide the team and the technology.

Good luck. You have the technical foundation. Now go show them you have the mindset.
