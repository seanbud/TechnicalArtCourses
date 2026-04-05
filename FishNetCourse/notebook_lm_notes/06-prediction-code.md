# Lesson 6: Writing Prediction Code

## The Two Structs That Run Everything

All of FishNet's prediction code revolves around two data structures. One flows up from the client to the server. The other flows down from the server to the client. Understanding what goes into each one — and what absolutely must NOT be left out — is the difference between silky-smooth prediction and maddening jitter.

The first struct implements IReplicateData. In the Slop-Box project it's called MoveData, but the name doesn't matter — what matters is that it contains the player's raw input for a single tick. WASD direction, camera yaw for determining facing, jump pressed, sprint held. This is sent every single tick, typically 60 times per second, so keep it small. Only include what the simulation needs to reproduce the movement. Never include derived values like position or velocity — those are outputs of the simulation, not inputs.

The second struct implements IReconcileData. That's MoveState in Slop-Box. It contains the server's authoritative physics state at a specific tick — position, rotation, velocity, whether the character is grounded, and critically, every single timer or flag that affects future simulation. JumpTimer, CoyoteTimer, StaggerDuration, HasJumped, IsSprinting. If a variable is modified inside Replicate and influences the outcome of future ticks, it MUST be in the reconcile state. Missing even one causes invisible desync that manifests as jitter.

Both structs need one specific method — a Dispose method that takes no parameters and just sets a private GetTick_ backing field. FishNet uses this internally for tick tracking. The pattern is always the same: declare the field as a private uint, create a Dispose method that receives a tick parameter and stores it, and create a GetTick method that returns it. You'll write this boilerplate identically in every prediction struct.

## The Replicate Method

The Replicate method is the heart of prediction. It's decorated with the [Replicate] attribute and it takes your ReplicateData struct as its first parameter, plus a ReplicateState enum as the second parameter with a default value.

On the owning client, Replicate executes immediately as a prediction — the character moves right now, zero latency. FishNet simultaneously sends the ReplicateData to the server. On the server, Replicate runs authoritatively with the same input, producing the "true" result. On spectating clients — if state forwarding is enabled — Replicate runs with the forwarded inputs, keeping everyone's simulation in sync.

The critical rule: Replicate must be deterministic. Given the same input and the same starting state, it must produce the same result every time. That means no Time.deltaTime — use TimeManager.TickDelta. No Random — use a seeded random that's part of your state. No reading directly from the input system — all input must come through the ReplicateData struct. If you violate determinism, the client's prediction and the server's authoritative result will diverge every tick, and every reconcile will produce a visible correction.

## The Reconcile Method

After the server runs Replicate, it calls CreateReconcile to capture the current physics state into a ReconcileData struct and send it to the client. The Reconcile method is decorated with the [Reconcile] attribute and receives the ReconcileData struct.

Inside Reconcile, you restore your simulation to the server's authoritative state. Set the transform position, set the rotation, set the velocity, restore every timer and flag. If you're using PredictionRigidbody — which we'll cover in the next lesson — call its Reconcile method here to restore the rigidbody state.

After Reconcile restores the state, FishNet automatically replays every Replicate call from the reconciled tick forward to the current tick. This is the replay loop. It all happens in a single frame, invisible to the player. If the client's prediction was accurate — which it usually is — the end result matches what was already shown, and nothing visible changes.

## The Reconcile Completeness Rule

This is the single most important principle in all of FishNet prediction, and it's worth saying twice: every variable that is modified inside Replicate and affects the outcome of future ticks MUST be included in the Reconcile state.

Think about it this way. During reconciliation, FishNet resets your object to the server's state at tick 100, then replays ticks 101 through 110. During that replay, Replicate runs ten times. If your Replicate method reads a variable — say a jumpTimer — to decide whether the character can still sustain their jump, but that variable isn't part of the reconcile state, then the replay will use whatever stale value happens to be sitting in that field from the last frame of normal execution. The replay produces a different result than the original prediction. The character position after replay diverges from what was shown. You get jitter.

The symptom is subtle and incredibly frustrating. The character vibrates slightly, especially during state transitions — jumping, landing, entering stagger, starting a sprint. The fix is always the same: find the variable you forgot to reconcile, add it to your ReconcileData struct, and set it in the Reconcile method. You can NEVER over-reconcile. It's always safe to include more state. The only cost is a slightly larger reconcile packet.

## Non-Controlled Objects

So far we've talked about the object's owner predicting their own movement. But what about objects that other players control? What does a spectating client see?

If state forwarding is enabled on the NetworkObject, the spectating client receives the same inputs and runs the same Replicate method. They maintain their own prediction buffer and reconcile loop for that object. This is the simplest model — everyone runs the same simulation.

If state forwarding is disabled, the spectating client runs Replicate with default — essentially empty — input. In this mode, the Replicate method still fires for the object on spectating clients, but the input is zeroed out. You need to design your Replicate to handle this gracefully. For movement, a default input typically means "no buttons pressed" — the character decelerates naturally based on your physics. FishNet will keep the spectated object roughly synchronized through periodic reconciles, but without state forwarding the visual quality depends on how well your Replicate handles empty input.

## Understanding ReplicateState

The second parameter of every Replicate method is a ReplicateState enum. It's defaulted in the method signature, but understanding its values is critical for building polished prediction code.

ReplicateState has four values. CurrentCreated means this replicate call is using data that was created THIS tick — fresh, real input from the owning client or freshly received from the server. This is the normal case during live gameplay.

CurrentFuture means there's no real data available for this tick. FishNet is running the replicate call using the LAST known input, essentially predicting that the player is still doing what they were doing a tick ago. This happens on spectating clients when a tick of forwarded input hasn't arrived yet. It's future state — the system is guessing.

ReplayedCreated means this replicate call is happening during the reconcile replay loop, and the data was originally created — it's real input being replayed.

ReplayedFuture means this is a replay tick where the original data was itself a future prediction.

The most important check is IsFuture — a convenience property that's true for both CurrentFuture and ReplayedFuture. When IsFuture is true, you're running on guessed input. This is where you want to suppress one-time effects — don't fire bullets, don't trigger sounds, don't spawn particles during future state because that input might never actually happen.

## Advanced Controls: Sprint, Stamina, and Ground Checks

Once you have basic movement prediction working, real games need more complex state inside the prediction loop. Here's the principle: if it affects movement physics, it must live inside Replicate and be reconciled.

Take sprinting with stamina. The client's ReplicateData includes a boolean for whether sprint is held. Inside Replicate, you check if sprint is held AND stamina is above zero. If so, you multiply the move speed by a sprint multiplier and drain stamina by a fixed amount per tick. If stamina hits zero, you force the character back to walk speed. Stamina regenerates when sprint isn't held.

The critical requirement: stamina MUST be in your ReconcileData. The server's authoritative stamina value must overwrite the client's predicted stamina during reconciliation. If you forget this, the client and server can disagree on when stamina ran out. The client might think it has stamina left when the server says it's empty. The resulting correction forces the character to decelerate mid-sprint — a visible, jarring snap.

The same principle applies to ground checks. If your Replicate method uses a raycast or spherecast to determine whether the character is grounded, and that grounded state affects jump logic, then the grounded flag must be in your ReconcileData. Same for coyote timers, jump counts, wall-run counters, and any other stateful variable that persists across ticks.

## The Complete Tick Loop in Practice

Let's walk through one full tick of a predicted character to tie everything together.

The TimeManager fires OnTick. Your script collects input and packs it into a ReplicateData struct — horizontal, vertical, yaw, jump, sprint. You call the Replicate method with that data.

On the owning client, Replicate runs immediately. It reads the input, applies forces using a move speed potentially modified by sprint state, checks grounded state via raycast, handles jump logic including coyote time and jump timers, calls PredictionRigidbody.Simulate() at the end. The character moves on screen. Zero latency.

Simultaneously, FishNet sends the ReplicateData to the server. When it arrives, the server runs Replicate with the same data. The result might differ slightly — maybe a physics collision resolved differently, maybe a moving platform was at a slightly different position. The server calls CreateReconcile, captures the true position, velocity, rotation, grounded state, all timers, and sends that ReconcileData back to the client.

The client receives the reconcile for — let's say — tick 100. It's currently at tick 105. It snaps its state to the server's tick 100 values, then replays ticks 101, 102, 103, 104, and 105 using the saved inputs for each tick. After replay, the character is at a corrected position for tick 105. If the prediction was accurate, this position is virtually identical to where the character already was. No visible correction.

## Key Takeaways

ReplicateData contains raw input going UP to the server — keep it small, only include what the simulation needs. ReconcileData contains authoritative state coming DOWN to the client — include every variable that Replicate modifies and that affects future tick outcomes. Replicate must be deterministic: same input plus same state must equal same result, so use TickDelta not deltaTime and never read from the input system directly. The reconcile completeness rule is the single most important principle: if you modify it in Replicate and it affects future ticks, it must be in ReconcileData. ReplicateState tells you whether you're running on real input or future-predicted input — use IsFuture to guard one-time effects like bullets and sound. Non-controlled objects either run forwarded inputs via state forwarding or run with default empty input — design your Replicate to handle both gracefully. And finally, every stateful gameplay mechanic inside the prediction loop — stamina, ground checks, coyote timers, jump counts — must be reconciled, or you get jitter at state transitions.
