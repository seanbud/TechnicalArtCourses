# Lesson 4: Slop-Box Architecture Case Study

## Why Read Someone Else's Code

Theory is important, but the real learning happens when you look at actual production code and ask: what decisions were made here, why, and what would I do differently? The Slop-Box project is a co-op Prince of Persia style game built on FishNet, and its codebase makes several strong architectural decisions that are worth studying — along with a few gaps that need to be addressed before shipping.

## The Layered Architecture

The most important design decision in Slop-Box is the separation between networking and simulation. The codebase has a clear layered architecture.

At the top is the Bootstrap Layer. This includes NetworkBootstrap, which wraps FishNet's NetworkManager into a clean API with StartHost(), StartServer(), and StartClient() methods. It uses Zenject for dependency injection, so the NetworkManager is injected rather than found with GetComponent or FindObjectOfType. This layer also includes the NetworkAutoStart script that kicks off Host mode when the scene loads.

Below that is the Connection Layer. ConnectionManager subscribes to FishNet's OnRemoteConnectionState event and translates it into clean game-level events: OnPlayerConnected and OnPlayerDisconnected. This is a mediator pattern — instead of every system in the game subscribing directly to FishNet's raw events, they subscribe to ConnectionManager. One place for logging, filtering, and connection validation.

Then comes the Prediction Layer. This is NetworkMovement, the CSP wrapper. It subscripts to TimeManager.OnTick, collects input from the IInputProvider, packs it into a MoveData struct, calls Replicate, and handles CreateReconcile. This script knows about FishNet — it inherits from NetworkBehaviour, uses [Replicate] and [Reconcile] attributes, reads TimeManager.TickDelta.

And at the bottom is the Simulation Layer. CharacterMovement is a pure MonoBehaviour that knows absolutely nothing about FishNet. It receives a MoveData struct and a delta time value, runs the full physics simulation using CharacterController.Move(), and returns a MoveState struct with the resulting position, velocity, grounded state, and all internal timers.

This separation is the exact same pattern as Quantum's System/View split. In Quantum, the Systems run deterministic simulation and the View layer handles visuals. In Slop-Box, CharacterMovement is the "System" — pure simulation logic — and NetworkMovement is the "View" or rather the "Bridge" that connects it to the network. This means CharacterMovement can be tested offline without any network setup. You can iterate on physics feel — jump height, air control, gravity curves — without touching netcode. And if you ever needed to switch from FishNet to another networking framework, you'd only rewrite NetworkMovement, not the entire physics system.

## The SyncVar Pitch Optimization

One subtle optimization in NetworkMovement is that camera pitch and yaw are synced as SyncVars instead of being included in the MoveData prediction struct. Why?

MoveData is sent every single tick — 60 times per second. Every byte you add costs bandwidth. Camera pitch doesn't affect the physics simulation in a meaningful way. The CharacterController moves based on WASD input and camera yaw. The camera yaw determines which direction "forward" means. But the pitch — whether you're looking up or down — doesn't change how the character moves horizontally.

So instead of adding pitch to MoveData (which would bloat every tick's packet), it's synced as a SyncVar. SyncVars are delta-compressed, meaning FishNet only sends the change when the value actually differs from the previous frame. And since non-owner clients only need the pitch for visual rendering — to show where the other player is looking — a SyncVar's slightly lower update frequency is perfectly acceptable.

The camera yaw IS in MoveData because it's essential for physics. Without the yaw, the server wouldn't know which direction the player intends to move when they press "W". The pitch isn't consumed by the movement simulation at all, so it's purely cosmetic.

## The Reconcile Completeness Problem

Here's where the codebase has a critical issue that needs fixing. In CreateReconcile(), the JumpTimer and StaggerTimer fields are hardcoded to zero instead of reading the actual values from the CharacterMovement simulation.

What does this mean in practice? Every time a reconcile fires — which is every tick — the client receives a MoveState with JumpTimer = 0 and StaggerTimer = 0. If the player is mid-jump with a JumpTimer of 0.08 (meaning the sustain force is still being applied), the reconcile snaps that timer back to zero. Then the replay loop re-runs the subsequent ticks with JumpTimer = 0, which means the sustain force isn't applied during replay. The character's predicted position after replay differs from what the client originally predicted, causing a visible correction. The symptom is subtle jitter during jumps — the character's position oscillates slightly because every reconcile resets the jump state.

On top of that, two variables are entirely missing from MoveState: CoyoteTimer and HasJumped. CoyoteTimer affects whether a jump is legal after the character has left a platform edge. HasJumped prevents double-jumping within a single grounded period. Without these in the reconcile state, the replay loop makes jump decisions based on stale or default values, which can cause the client and server to disagree on whether a jump should have happened at all.

The fix is straightforward: read the actual timer values from CharacterMovement in CreateReconcile(), add CoyoteTimer and HasJumped to the MoveState struct, and update SetState() to restore them. This is a 30-minute fix that eliminates all jump-related jitter.

## The JumpPressed Bug

There's another subtle bug in the input collection. In BuildMoveData(), both JumpPressed and JumpHeld are set to the same value: _input.IsJumpHeld. JumpPressed is supposed to be true only on the FIRST tick the button is pressed — a single-frame trigger. JumpHeld is supposed to be true for every tick the button remains held, which controls variable jump height through the sustain mechanic.

Currently, because both fields read IsJumpHeld, JumpPressed fires EVERY tick the button is held. In CharacterMovement.Simulate(), the jump check is `if (data.JumpPressed && canJump)`. Because _hasJumped prevents the character from jumping again while airborne, this bug is MASKED — the character doesn't actually double-jump. But if you ever add wall-jumps, ground-pound cancels, or any mechanic that consumes JumpPressed separately from the grounded check, this bug will resurface in confusing ways. The fix is simple: set JumpPressed to _input.IsJumpPressed (the single-frame detection) instead of IsJumpHeld.

## What's Missing for Co-op

The current codebase networks player movement but doesn't yet network several systems that are critical for a co-op experience.

Hazard damage is resolved locally by each client. If the Guillotine trap hits a player, each client independently computes the damage. In a server-authoritative architecture, damage should only be applied by the server. The Guillotine should call a [Server] method on the health system, and clients should see damage VFX via an [ObserversRpc].

Knockback is applied locally through ApplyKnockback on CharacterMovement. In a networked context, the server should apply the knockback, and the next Reconcile will automatically carry the new velocity and stagger timer to the client. CSP handles the visual correction for free — the replay loop will show the character getting knocked back from the correct position.

Ragdoll deaths happen locally. For co-op, both players need to see ragdolls at the same time. An ObserversRpc that triggers the ragdoll activation ensures visual sync. Ragdolls are cosmetic — they don't need to be deterministic, just triggered simultaneously.

## Scaling Recommendations

The architecture is genuinely good. The separation of NetworkMovement from CharacterMovement is the correct production pattern, and maintaining that separation as you add new systems is the most important thing.

The highest priority fix is the reconcile completeness — add JumpTimer, StaggerTimer, CoyoteTimer, and HasJumped to MoveState. This eliminates jitter. Second is the JumpPressed input bug, which is a five-minute fix. Third is networking hazard damage with server authority. After that, you'd add ragdoll sync via ObserversRpc, configure Physics.simulationMode to Script, and eventually integrate a relay transport for production NAT traversal.

## Key Takeaways

The NetworkMovement and CharacterMovement separation is the correct production architecture — keep it. Every variable modified during Replicate that affects future ticks must appear in MoveState, and the current codebase is missing several. SyncVars for cosmetic data like camera pitch is a smart bandwidth optimization over stuffing everything into MoveData. The JumpPressed bug is masked by the HasJumped flag, but it will bite you when adding new mechanics. All networked interactions follow the same loop: client requests via ServerRpc, server validates and applies, server notifies via ObserversRpc or SyncVar. And finally, the Zenject integration with FishNet is clean — continue using Inject for reference caching and OnStartNetwork for network initialization.
