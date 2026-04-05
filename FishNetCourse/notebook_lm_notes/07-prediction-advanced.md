# Lesson 7: Advanced Prediction — Physics, Colliders & Comparers

## Why You Can't Just Use Rigidbody.AddForce

At this point you know how to write a full Replicate and Reconcile loop. You can move characters around with basic input. But the moment you introduce physics forces — jump impulses, knockback, wind zones, moving platforms — using Unity's Rigidbody.AddForce directly inside Replicate creates a problem.

During reconciliation, FishNet replays your Replicate method for every tick from the reconcile point forward. If you called Rigidbody.AddForce during the original execution of tick 105, FishNet needs to apply the EXACT same force during the replay of tick 105. But Unity's Rigidbody doesn't keep a history of forces. It just has its current velocity. When FishNet restores the rigidbody to the reconcile state and starts replaying, any forces that were applied through standard Unity API calls are lost.

PredictionRigidbody solves this by wrapping Unity's Rigidbody and queuing all force changes. Instead of applying forces directly, you tell PredictionRigidbody what you want to do, and it records those intentions. Then when you call Simulate() at the end of your Replicate method, it processes the entire queue and applies everything to the underlying Rigidbody in one shot. During replay, the same queue gets rebuilt from the same inputs, and Simulate() processes it again. The result is deterministic.

## The PredictionRigidbody API

PredictionRigidbody provides a set of methods that mirror Unity's Rigidbody API. AddForce takes a Vector3 and a ForceMode, exactly like the original. Velocity takes a Vector3 and sets the velocity directly — useful for teleport-like instant speed changes or dash abilities. AddVelocity adds to the current velocity without overriding it, which is good for gentle nudges like wind effects. AngularVelocity sets the angular velocity for spinning objects.

You initialize PredictionRigidbody in Awake by retrieving one from FishNet's internal object pool using ObjectCaches, then calling Initialize with a reference to the standard Rigidbody component. In OnDestroy, you return it to the pool. This avoids allocation during gameplay.

The two most important lifecycle methods are Simulate and Reconcile. Simulate processes all queued forces and applies them to the rigidbody. It MUST be called at the end of your Replicate method — and only there. The Reconcile method restores the rigidbody to a snapshot from the server's authoritative state. You call it inside your own Reconcile method, passing in the PredictionRigidbody from the ReconcileData.

Some controllers prefer setting velocity directly rather than applying forces. That's fine — you still call Simulate at the end. Whether you're using AddForce, Velocity, AddVelocity, or any combination, Simulate must always be the last call in your Replicate method.

## The Simulate Rule: External Forces

Here's the rule that trips up almost everyone who builds anything more complex than a basic movement controller: NEVER call PredictionRigidbody.Simulate() from outside the owning object's Replicate method.

Let's say you have a bumper in the world — a launch pad that sends the player flying upward when they step on it. The bumper is a separate NetworkBehaviour on a different GameObject. When the player enters the bumper's trigger zone, the bumper needs to apply a force to the player. The correct pattern is: the bumper object gets a reference to the player's PredictionRigidbody and calls AddForce on it. Just AddForce. It does NOT call Simulate. The force gets queued. Then, when the player's own Replicate method runs for that tick, it calls Simulate at the end, and the bumper's queued force gets processed along with everything else.

Why does this work during reconcile replay? Because during replay, FishNet re-simulates physics from the reconcile point forward. At each replayed tick, the physics step runs, the bumper trigger fires again (because the player's rollback position intersects the bumper's collider), AddForce queues the impulse again, and the player's Simulate processes it. The result is identical to the original execution. That's deterministic replay.

If the bumper called Simulate itself, you'd have two Simulate calls per tick — one from the bumper and one from the player. The order would be unpredictable. Forces might be processed twice or in the wrong sequence. During replay, the physics diverge from the original execution. You get desync.

## NetworkCollision and NetworkTrigger

Unity's built-in OnCollisionEnter, OnCollisionStay, OnCollisionExit, OnTriggerEnter, OnTriggerStay, and OnTriggerExit callbacks have a fundamental problem with prediction. During the reconcile replay loop, Unity doesn't re-fire Enter and Exit events for collisions that happened in the past. If your player hit a wall at tick 102, and reconcile replays tick 102, Unity doesn't call OnCollisionEnter again because from Unity's perspective, the collision already happened earlier in the frame.

FishNet solves this with four drop-in replacement components: NetworkCollision for 3D collision events, NetworkCollision2D for 2D collision events, NetworkTrigger for 3D trigger events, and NetworkTrigger2D for 2D trigger events. Each component provides three event callbacks: OnEnter, OnStay, and OnExit. These events fire correctly during prediction replay, which means your collision logic works identically during normal execution and during reconcile.

This is actually a FishNet exclusive — it's the only networking framework that accurately simulates Enter and Exit events during prediction replay. Not even Photon Fusion does this. For any game with physics-based hazards, pickups, trigger zones, or collision-driven gameplay, this is essential.

One subtle detail: the OnStay callback returns a Collider, not a Collision object. This is deliberate — creating a Collision object on the hot path every physics tick would generate garbage. If you need the full Collision data (contact points, impulse values), use Unity's native OnCollisionStay alongside NetworkCollision. The native Stay callback works correctly with prediction because it fires every physics step regardless.

## The Two-Rule Pattern for Collision Callbacks

When you write collision callbacks in predicted code, there's a universal two-part pattern you must follow.

Rule one: physics forces always apply, including during reconcile replays. If the collision results in a knockback force, call PredictionRigidbody.AddForce unconditionally. Don't check whether you're reconciling. Don't skip it during replay. The force must be applied every time the collision fires — during normal execution AND during replay — because that's what makes the replay deterministic. If you skip the force during replay, the replayed physics won't match the original execution, and you get desync.

Rule two: one-time effects — audio, particle systems, UI popups, camera shake — must be guarded with a check for PredictionManager.IsReconciling. During a reconcile replay, dozens of ticks might be replayed in a single frame. If your collision callback plays a hit sound unconditionally, you'll hear the sound fire thirty times in one frame. That's obviously wrong. So you check: if NOT IsReconciling, play the sound. If IsReconciling, skip it.

These two rules never change. Forces always. Effects only when not reconciling. That's the pattern for every collision, trigger, hazard, bumper, pickup, and damage zone in your game.

## Custom Comparers

FishNet auto-generates equality comparers for your IReplicateData and IReconcileData structs. These comparers are used internally for optimization — for example, FishNet can skip sending identical inputs to reduce bandwidth. For most types — float, int, bool, Vector3, Quaternion, PredictionRigidbody — auto-generation works perfectly.

But there are two categories of types where auto-generation fails: generics and arrays. If your ReplicateData struct contains a byte array, a List of anything, or any generic type parameter, FishNet's code generator can't automatically create a comparison method. You'll see a console error telling you to write a custom comparer.

The fix is simple. Create a static method anywhere in your codebase, decorate it with the CustomComparer attribute, give it two parameters of the type you need to compare, and return a bool. For a byte array, you'd check if both are null, then check lengths, then compare element by element. For a List, same pattern.

The reason FishNet doesn't just auto-generate a byte-by-byte comparison for these types is performance. These comparers run every single tick on the hot path. A naive element-by-element comparison of a large array could be expensive. By requiring you to write the comparer manually, FishNet forces you to think about performance. Maybe you can compare a hash first. Maybe you can check the length before iterating. Maybe you know that only the first few elements ever change and you can short-circuit early. Keep comparers fast.

In practice, you rarely need custom comparers. They only come up when you're doing something unusual with your prediction data — storing variable-length payload, using generics for flexibility, or embedding arrays of state. For standard movement prediction with primitives and Vector3s, everything is auto-generated.

## Putting It Together: World Hazards

Let's combine everything into a realistic example. Imagine a lava zone in your game — a trigger area that damages players and repels them with a knockback force.

The lava zone has a NetworkTrigger component. You subscribe to its OnEnter event. When a player enters the zone, three things happen. First, you apply a knockback force to the player's PredictionRigidbody using AddForce — this happens unconditionally, including during replay, because it's a physics force that must be deterministic. Second, you apply damage — but only on the server and only when NOT reconciling, because damage is a server-authoritative action that should only fire once. Third, you play a burn effect — but only when NOT reconciling, because it's a visual effect that shouldn't replay.

That's three lines of logic, each following the two-rule pattern. Forces always. Effects and server actions only when not reconciling. This pattern scales to every interactive object in your game.

## Key Takeaways

PredictionRigidbody wraps Unity's Rigidbody to make force application deterministic during prediction replay — use it exclusively and never modify Rigidbody.velocity directly. Simulate must be called only inside the owning object's Replicate method — external scripts like bumpers and hazards queue forces with AddForce but never call Simulate themselves. NetworkCollision and NetworkTrigger replace Unity's collision callbacks with prediction-safe versions that correctly re-fire Enter and Exit events during reconcile replay — this is a FishNet exclusive feature. In collision callbacks, physics forces always apply unconditionally including during replay, while one-time effects like audio and particles must be guarded with PredictionManager.IsReconciling. Custom comparers are only needed for arrays and generics in your prediction data structs — the console will tell you when one is required, and you should keep them fast because they run every tick.
