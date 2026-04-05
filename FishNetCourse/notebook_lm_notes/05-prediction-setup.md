# Lesson 5: Prediction Setup & Configuration

## The Inspector Gauntlet

Before you write a single line of prediction code, FishNet needs three separate components configured correctly in the Unity Inspector. Miss any one of them and your code will compile, run, and silently produce jitter, rubber-banding, or desync that only shows up with real network latency. This lesson walks through every setting, in order, so you can get them right once and never touch them again.

## What Client-Side Prediction Actually Is

Let's make sure we're on the same page. Client-Side Prediction — CSP — is a technique where the owning client executes its own movement IMMEDIATELY without waiting for the server. The server is still the boss. It still runs the same physics authoritatively. But instead of the client sending input, waiting for the server to process it, and then seeing the result — which would add a full round-trip of delay — the client predicts the result locally and shows it right away.

The server periodically sends corrections. If the client's prediction was right — which it is the vast majority of the time for normal movement — the correction is a no-op and the player never notices anything. If the prediction was wrong, the client snaps to the server's authoritative state and replays all unacknowledged inputs from that point forward. That replay happens in a single frame. It's invisible.

This is fundamentally different from the naive approach of just slapping a NetworkTransform on a Rigidbody and letting the server sync positions. That approach gives you full round-trip delay on every input — 60 to 180 milliseconds. For a platformer, that's unplayable. CSP eliminates that delay entirely.

## The PredictionManager

The PredictionManager is a component you add to the NetworkManager GameObject. It controls global prediction settings that apply to every predicted object in the scene. You don't strictly need to add it — FishNet will use sensible defaults — but adding it lets you tune two critical systems.

The first is input interpolation, and it's important to understand that this is NOT graphical smoothing. PredictionManager interpolation controls how many ticks of input the system holds in a queue before running them. Think of it as a shock absorber for network jitter. If packets arrive in bursts — three ticks worth of input all at once, then nothing for a tick — the queue smooths that out so the simulation always has input available when it needs it.

Client Interpolation controls how many ticks of server or other-client input are buffered. A value of 1 means the system holds one extra tick in reserve. At 60 ticks per second, that's about 17 milliseconds of added latency — but it means the system almost never runs out of input data, which prevents stuttering. For competitive games, use 1. For casual games where stability matters more than raw latency, 2 or 3 is fine.

Server Interpolation is the same concept but for the server's queue of received client inputs. Usually 0 or 1. Higher values add server-side input lag but make the server more resilient to bursty connections.

The second system is excessive replicate dropping. The server's input queue should normally contain about ServerInterpolation plus or minus one entry. But if a client has network issues and sends inputs in a burst, the queue can spike to 5, 10, or more entries. When that happens, FishNet drops the oldest values. This serves two purposes: it prevents allocation attacks where a malicious client floods the queue, and it prevents speed-hacking where extra inputs would cause the server to run multiple ticks for one client. You CAN disable this in the inspector, but don't. FishNet has a hard-coded safety maximum as a last resort, but relying on that is asking for trouble.

## The TimeManager: One Setting to Rule Them All

The TimeManager is already on your NetworkManager. For prediction, there is exactly ONE setting you must change, and forgetting it is the single most common configuration mistake in FishNet prediction setups.

You must set Physics Mode from Unity to Time Manager.

By default, Unity manages physics timing through its own FixedUpdate loop. The problem is that FishNet's prediction replay needs to step physics deterministically — once per tick, including during the reconciliation replay where dozens of ticks are re-executed in a single frame. If Unity is still managing physics, the replay loop runs inside a frame where Unity's physics has already stepped, and the results diverge between the client's replay and the server's original execution.

Setting Physics Mode to Time Manager tells FishNet to take over. It calls Physics.Simulate() at exactly the right moment — once per tick during normal execution, and once per replayed tick during reconciliation. This ensures the physics step timing is identical on the client, the server, and during replay.

The insidious part is that forgetting this setting doesn't produce an error. Your game works perfectly in the editor where the host has zero latency. It's only when you test with real network conditions — remote clients with 30 to 100 milliseconds of ping — that you see drift. Characters slowly diverge from their server-authoritative positions. Reconciles fire constantly. The visual result is subtle but persistent jitter.

## The NetworkObject: Per-Object Prediction Settings

The NetworkObject component is where prediction settings are configured per-object. This is the most complex inspector in the pipeline.

First, check Enable Prediction. Without this, the Replicate and Reconcile attributes on scripts attached to this object simply won't function.

Then set the Prediction Type. If the object uses a Rigidbody for physics, choose Rigidbody. If it uses Rigidbody2D, choose that. If it uses CharacterController or direct transform manipulation, choose Other. This tells FishNet how to handle the physics step during prediction.

State Forwarding is one of the most important architectural decisions. When enabled, all clients run the same inputs as the server. Non-owners maintain their own prediction buffer and reconcile just like the owner. This means every player sees the same simulation logic running on their machine. The upside is simpler coding and more reliable behavior. The downside is higher CPU cost because every client maintains buffers for every predicted object. When state forwarding is disabled, only the owner and server run inputs. Non-owners see nothing by default — you have to manually forward information via NetworkAnimator, RPCs, or NetworkTransform. When in doubt, enable state forwarding. It's the more commonly preferred approach.

The Graphical Object setting lets you assign a child transform that holds your visual representation — meshes, sprites, particles. FishNet uses this reference to apply tick-based smoothing separately from the physics root. This is crucial: during a network tick, FishNet runs your Replicate method and the physics step updates the root transform. But between ticks, the graphical child smoothly interpolates to the new position. Without this, you'd see the character teleport in discrete tick-sized steps.

There are two modes for the graphical object: attached and detached. Attached mode rolls the graphical object back to its pre-tick transform, then smooths it to the post-tick result over the tick duration. It works well in most setups. Detached mode keeps the graphical object in world space and smoothly moves it toward the goal. This is often the better choice when animation systems or cameras don't handle the rollback-then-smooth pattern gracefully.

One critical rule: never put gameplay colliders on the graphical object. During the physics step, the graphical child might be mid-interpolation and in the wrong position. Keep capsule colliders, trigger zones, and anything that affects state on the root or outside the graphical hierarchy.

## Offline Rigidbodies

If your scene has non-networked rigidbodies — props, debris, decorative physics objects — they need the OfflineRigidbody component. When prediction runs its reconciliation replay, it re-simulates physics for the entire scene. Any rigidbody in the scene will be affected, even ones that have no NetworkObject. Without OfflineRigidbody, these objects jitter and teleport during replay because they're being rolled back along with everything else, but they have no reconcile state to restore from.

The rule is simple: every rigidbody in a prediction scene that doesn't have a NetworkObject needs an OfflineRigidbody component. Decorative props, breakable objects, ragdolls, loose crates — all of them.

## The Two Interpolation Systems

This is one of the most commonly confused aspects of FishNet prediction, and it's worth spelling out explicitly. There are two completely different interpolation systems, and they do different things.

PredictionManager interpolation holds states in a queue before running them. It's an input buffer. It adds latency measured in ticks — if you set it to 2 at 60 ticks per second, that's about 33 milliseconds of added delay. The trade-off is resilience: more buffer means fewer situations where the system runs out of input data.

NetworkObject interpolation — or TickSmoother interpolation — smooths the graphical child between tick positions. It's purely visual. It has zero effect on the simulation. More smoothing means less visible jitter on spectated objects, but the visual representation falls slightly behind the "true" physics position.

These two systems stack. If your PredictionManager has Client Interpolation set to 1 and a spectated object has Spectator Interpolation set to 2, the spectator sees that object's graphical representation 3 ticks behind real-time: 1 tick of queue delay plus 2 ticks of visual smoothing. At 60 ticks per second, that's about 50 milliseconds — perfectly acceptable for most games.

## Key Takeaways

CSP lets the client move immediately while the server retains authority — if predictions match, corrections are invisible. PredictionManager interpolation is an input buffer that adds latency for jitter resilience, not graphical smoothing. The TimeManager must own physics — set Physics Mode to Time Manager or prediction replay will use wrong deltas and produce silent desync. NetworkObject is where per-object prediction lives — enable prediction, choose the right type, consider state forwarding for simpler coding, and set up the graphical object hierarchy carefully to avoid collider-on-graphical bugs. OfflineRigidbody is mandatory for any non-networked rigidbody in a prediction scene — without it, props jitter during reconciliation replay. And finally, two distinct interpolation systems exist — PredictionManager input buffering and NetworkObject visual smoothing — they stack, and understanding both is essential for tuning your game's responsiveness and visual quality.
