# Lesson 1: FishNet vs Quantum — The Paradigm Shift

## The Core Difference

Let's start with the big picture. You already know Photon Quantum inside and out. Quantum is a deterministic lockstep engine — every client runs the exact same simulation using fixed-point math, and if any client deviates by even a single bit, the whole thing desyncs. It's beautiful in its precision, but it's also demanding. Every piece of physics, every calculation, has to use Quantum's custom fixed-point types. No Unity floats allowed.

FishNet is a completely different paradigm. Instead of requiring every client to agree on the truth through identical math, FishNet says: one machine — the server — is the boss. The server runs the authoritative simulation, and everyone else is just guessing. Clients predict what's going to happen based on their local input, and the server periodically sends corrections. If the client's prediction was close, the correction is invisible. If the prediction was way off, the client snaps to the corrected state and replays its recent inputs on top of the correction.

This is the fundamental shift. In Quantum, correctness is guaranteed by design — you achieve it through determinism. In FishNet, correctness is enforced by correction — you achieve it through a server that tells you when you're wrong.

## Server Topologies: Who's the Boss?

In Quantum, there isn't really a "server" in the traditional sense. Every client runs the full simulation, and there's a Photon Cloud relay that synchronizes inputs. In FishNet, you have to decide who runs the authoritative server logic, and there are three main options.

The first is a dedicated server — a headless Unity instance running in the cloud. No player has a ping advantage. That's the gold standard for competitive PvP, but it costs money to run and adds operational complexity.

The second is Host Mode. One player's Unity instance runs both the server and the client simultaneously. That player has zero latency to the server because they ARE the server. Other players connect to them. This is the most common pattern for co-op games because it's completely free — no cloud infrastructure needed. The downside is the Host has a 0ms advantage, but in a co-op game where everyone is on the same team, that doesn't matter.

The third is Relay-Backed Host Mode, and this is what Slop-Box uses. It's the same as Host Mode, but connections are routed through a relay service — Unity Relay, Steam Networking, or a similar system. The relay handles NAT punchthrough so players don't need to configure port forwarding on their router. Here's the critical point that people get wrong: the relay is NOT a server. It's a dumb packet bouncer. The Host player's machine still runs all the server logic. The relay just handles delivering the packets.

For a two-player co-op Prince of Persia game, Host Mode — optionally with a relay for NAT traversal — is the obvious choice. It's free, it's simple, and the host advantage is irrelevant because you're cooperating, not competing.

## Why Networked Physics Feels Slow

Here's the thing that makes FishNet seem "slow" if you approach it naively. If you just slap a NetworkTransform component on a Rigidbody to sync its position, here's what happens: the remote player presses jump, the input travels to the host, the host applies the jump force, the host sends back the updated position, and THEN the remote player's character finally jumps on screen. That's a full network round-trip of delay — maybe 60 to 120 milliseconds. For a web browser or a strategy game, that's fine. For a platformer where you need frame-perfect timing on jumps, wall-runs, and ledge grabs? It feels terrible. It feels like playing through mud.

The solution is Client-Side Prediction — CSP. Instead of waiting for the server to confirm the jump, the client executes the jump IMMEDIATELY, locally, the instant the player presses the button. Then it sends the input to the server, the server runs the same jump physics authoritatively, and sends back a correction. If the client's prediction matched the server's result — which it almost always does for normal movement — no visible correction occurs. The player feels zero latency.

This is what FishNet's Replicate and Reconcile system does. Replicate handles the per-tick simulation — it runs on both the client (as prediction) and the server (as authority). Reconcile handles the correction — the server sends back its authoritative state, and the client snaps to that state and replays any inputs that happened after the reconciled tick.

## What Happens When You Press Jump

Let's trace a jump through both systems to really feel the difference.

In Quantum: you press jump, the input is polled into Quantum's input struct, the deterministic simulation advances a frame locally, the input is sent to the cloud, other clients receive it and also advance that frame. If any input was late, ALL clients roll back to the earliest unconfirmed frame and re-simulate forward. Every client ends up at the exact same state.

In FishNet: you press jump, the input is packed into a MoveData struct, the client immediately executes the Replicate function locally — your character jumps right now on your screen. The input is sent to the server. The server receives it, runs Replicate authoritatively, builds a MoveState with the true position, and sends a Reconcile back. The client compares its predicted position to the server's position. If they're close, nothing visible happens. If they diverged, the client snaps to the server state and replays all unacknowledged inputs in a single frame.

The key insight is this: in Quantum, the guarantee comes from everyone running identical math. In FishNet, the guarantee comes from the server periodically saying "here's where you actually are" and the client correcting itself.

## Why FishNet for This Project?

If you already know Quantum, why not just use it for the Slop-Box game? The answer is prototyping speed. With FishNet, you can use Unity's standard CharacterController, Rigidbody, and Physics APIs directly. You don't need to rewrite your movement system in fixed-point math. You don't need to separate everything into Quantum Systems and Unity Views. For a co-op PvE game where perfect determinism isn't critical, FishNet lets you iterate three to five times faster during prototyping.

## Key Takeaways

Quantum is deterministic lockstep — correctness by design. FishNet is server-authoritative state replication — correctness by correction. Host Mode is the right topology for a two-player co-op game: free, simple, and the host advantage doesn't matter. A relay is not a server — it's a packet bouncer for NAT traversal. Without Client-Side Prediction, networked physics introduces a full round-trip of input delay, which is unacceptable for a platformer. FishNet's Replicate and Reconcile system eliminates this delay by predicting locally and correcting from the server. And finally, FishNet uses standard Unity APIs — floats, Vector3, Rigidbody — because the server will correct any drift, so you don't need Quantum's fixed-point precision.
