# Lesson 8: Lag Compensation

## The Other Side of the Coin

Prediction — everything we've covered in lessons 5 through 7 — keeps the LOCAL player feeling responsive. When you press jump, you jump immediately. The server corrects you later if needed. But there's a second timing problem that prediction doesn't solve: what happens when you try to DO something to another player?

Imagine you're aiming a rifle at another player. On your screen, your crosshair is perfectly over their head. You click. The input travels to the server. By the time it arrives — 50, 80, maybe 120 milliseconds later — the target has moved. The server checks your raycast against the target's CURRENT position, not where they were when you fired. The shot misses. On your screen, you clearly hit them. On the server, they were already gone.

This is the lag compensation problem. Prediction handles YOUR OWN movement responsiveness. Lag compensation handles the fairness of ACTIONS AIMED AT OTHERS. FishNet provides three systems to address this, each designed for a different type of interaction.

## State Synchronization: When Only the Server Knows

The first system handles a specific scenario: the server detects a condition that clients can't see. An EMP goes off. A trap triggers. A global debuff activates. Only the server knows about it. If the server applies the effect immediately, the owning client won't find out until the next reconcile. For those few ticks of disagreement, the client is simulating without the EMP while the server is simulating with it. That's a desync. The reconcile will snap the client to the correct state, but the visual correction is jarring.

FishNet's solution is tick-based scheduling. Instead of applying the state change immediately, the server picks a tick slightly in the future — usually about 50 milliseconds ahead — and broadcasts that tick to all clients. The server says: "the EMP activates at tick 1247." It sends this via an ObserversRpc with RunLocally set to true, so the server also sets the same value on itself.

When each client receives the RPC, it converts the server tick to its own local tick using TimeManager.TickToLocalTick. Then, inside the Replicate method, everyone — server, owner, spectators — checks: is my current local tick within the EMP window? If so, block movement. Because the RPC was sent early enough for all clients to receive it before tick 1247 actually fires on their machines, everyone activates the EMP at roughly the same simulation time.

The critical subtlety: don't reset the tick values when the EMP expires. If you clear empStartTick and empEndTick after the effect ends, those values won't be correct during reconcile replay. FishNet might replay tick 1247 during reconciliation, and if the values have been cleared, the replay won't see the EMP. The character moves during a tick where it should have been frozen. Desync. Tick-based ranges naturally expire — the local tick moves past empEndTick and the effect stops. No cleanup needed.

This pattern does introduce a small delay — about 50 milliseconds before the effect takes hold. That's the trade-off. The alternative — immediate application — causes visible desync. The delay is typically less than two frames at 30fps. Most players won't notice.

The official FishNet guidance is also worth emphasizing: if both the client and server CAN detect the same condition — like both stepping into a trigger zone — just let them both detect it independently. That's simpler and more robust. The tick-scheduling pattern is specifically for cases where only the server has the information.

## Raycast Lag Compensation: Collider Rollback

The second system is for instant-hit weapons — hitscan rifles, melee attacks, beam weapons. Anything where the damage happens at the moment of firing, not after a projectile travels. This is the classic lag compensation problem, and FishNet Pro solves it with a component called the RollbackManager.

Here's what happens under the hood. Every tick, the RollbackManager snapshots the position and rotation of every registered hitbox collider in the scene. It maintains a rolling buffer of these snapshots going back several hundred milliseconds. When a client fires their weapon, they capture a PreciseTick — not just the integer tick, but the fractional position between ticks for sub-tick accuracy — and send it to the server via a ServerRpc.

On the server, you call RollbackManager.Rollback with the PreciseTick. The RollbackManager rewinds every registered collider to where it was at that moment in time, interpolating between snapshots for accuracy. You then perform a completely standard Physics.Raycast — nothing special, no custom raycast API. The raycast hits colliders that are now in their historical positions. You process the hit normally — apply damage, play effects, whatever your game needs. Then you call RollbackManager.Return, which snaps all colliders back to their current positions.

The setup requires three things. First, each target object needs hitbox colliders on child GameObjects — one per hitbox region, like a head collider and a body collider. Second, a ColliderRollback component goes on the NetworkObject root, with all hitbox children listed in its Collider Parents collection. Third, the RollbackManager component goes on the NetworkManager.

If you're using TickSmoothers for visual interpolation, there's an important compatibility note: place hitbox colliders on the TARGET objects, not on the smoothed objects. The RollbackManager does its own interpolation during rollback, so local smoothing on hitboxes would double-interpolate and produce incorrect positions. Set the smoother's Flat Interpolation to match the Additional Ticks configured in the RollbackManager.

The PreciseTick is worth understanding. Unlike a raw integer tick that tells you "this happened during tick 1247," a PreciseTick captures where between two ticks the event occurred. If the client fired at 40% of the way through tick 1247, the PreciseTick encodes that. The RollbackManager interpolates collider positions using this fractional value, which makes the rollback significantly more accurate than integer-tick precision would allow. You obtain a PreciseTick by calling TimeManager.GetPreciseTick with TickType.LastPacketTick.

## Predicted Projectiles: No Networking Required

The third system handles weapons that fire visible, traveling projectiles — rockets, arrows, plasma bolts. Things where the player expects to see something fly through the air. The core insight is that you don't need to network the projectile at all. No NetworkObject, no per-tick state synchronization, no spawn and despawn calls. Each peer spawns the projectile locally as a regular GameObject and uses time-based acceleration to visually align it across all clients.

The pattern works in three stages. The owning client fires: it spawns the projectile locally with zero passed time — the firing client doesn't need any catch-up because the projectile appears instantly on their screen. Then it sends a ServerRpc to the server with its current tick.

The server receives the RPC: it calculates how much TIME has passed since the client's tick using TimeManager.TimePassed. This accounts for the network latency — if it took 80 milliseconds for the RPC to arrive, the server knows the projectile "should" already be 80 milliseconds ahead. The server caps this at half the maximum allowed compensation (typically 150 milliseconds) to prevent extremely laggy players from producing unreasonable projectile acceleration on other players' screens. The server spawns the projectile locally with that passed time, then sends an ObserversRpc to all other clients with the original tick.

Spectating clients receive the ObserversRpc: they calculate their own passed time from the original tick, cap it at the full maximum (300 milliseconds), and spawn the projectile with that value. They get a higher cap because their passed time includes both the client-to-server latency AND the server-to-spectator latency.

The projectile itself is a plain MonoBehaviour — not a NetworkBehaviour. It stores the passed time and consumes it gradually by adding extra speed to its movement each frame. The acceleration uses an exponential decay pattern: each frame, it applies 8% of the remaining passed time as additional speed. This means the projectile is fastest right after spawning — when it has the most ground to cover — and gradually returns to normal speed. The curve feels like a smooth damp rather than an abrupt teleport.

For collision handling, the projectile checks InstanceFinder.IsClient for visual effects like particles and impact sounds. It checks InstanceFinder.IsServer for authoritative damage application. Then it destroys itself — though in production you'd pool it.

Because projectiles are non-networked, there's a very small chance of alignment divergence between peers at extremely high latencies. In practice, these differences are visually insignificant. The server resolves hits authoritatively regardless of where each client thinks the projectile is.

## Choosing the Right Approach

When you're deciding which system to use, the choice is usually straightforward.

For hitscan weapons — rifles, shotguns, beams, melee — use raycast rollback with the RollbackManager. The damage is instant, there's no visible projectile to synchronize, and collider rewind is the only way to make the hit detection fair across latency.

For visible projectiles — rockets, arrows, grenades — use the predicted projectile pattern. No networking overhead, visual alignment through acceleration, and it works with free FishNet.

For server-only state changes — stuns, EMPs, debuffs, environmental effects that only the server can detect — use tick-based state synchronization. Broadcast the activation tick, let everyone activate at the same simulation time.

For trigger-based effects — entering a lava zone, stepping on a speed pad, walking through a healing field — don't use lag compensation at all. Let both the client and server detect the trigger independently via NetworkTrigger. Shared simulation is simpler and more robust than any compensation scheme.

## Key Takeaways

State synchronization uses tick-based scheduling to align server-only events across all peers — schedule effects slightly in the future, convert server ticks to local ticks with TickToLocalTick, and never reset tick values during replay. Raycast rollback is a Pro feature that rewinds hitbox colliders to historical positions using PreciseTick for sub-tick accuracy — always call Return after your raycast to restore colliders. Predicted projectiles are non-networked GameObjects that use exponential time-based acceleration to visually converge across all peers — the server handles hit resolution authoritatively. The exponential catch-up pattern — consuming 8% of remaining passed time per frame — produces smooth acceleration that decays naturally without abrupt speed changes. And the most important principle: whenever possible, run the same simulation on both client and server through shared trigger detection and prediction rather than compensating after the fact. Compensation is the fallback for server-only knowledge, not the default approach.
