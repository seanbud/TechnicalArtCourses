# Lesson 3: Smooth Multiplayer Physics & Client-Side Prediction

## The Problem CSP Solves

If you use FishNet's built-in NetworkTransform to sync a character's position, here's what the remote player experiences: they press jump, the input travels to the host, the host applies the jump force, the host syncs the new position back, and THEN the character visually jumps on their screen. That's a full round-trip delay — somewhere between 60 and 180 milliseconds depending on the connection. For a web app or a strategy game, you wouldn't even notice. For a platformer where you need frame-perfect timing on jumps, wall-runs, and ledge grabs, it feels like playing through mud. It's unacceptable.

Client-Side Prediction eliminates this delay entirely. Instead of waiting for the server to confirm the jump, the client executes the jump IMMEDIATELY on the local machine the instant the player presses the button. Then it sends the input to the server, the server runs the same physics authoritatively, and sends back a correction. If the client's prediction matched — which it almost always does for simple movement — no visible correction occurs. The player feels zero latency. They never know they're on a network.

## The Musician Analogy

Think of CSP like a musician playing a piece from memory while listening to a conductor through a slightly delayed earpiece. You play confidently ahead of the conductor because you know the piece. Most of the time, you're in perfect sync. If you drift — maybe you play a note a half-beat too early — the conductor's correction comes through the earpiece, and you instantly adjust back to the right measure, speed-play through the notes you've already played, and get back in sync. To the audience, they never notice anything happened. That's Replicate and Reconcile.

Replicate is you playing from memory — the client executing movement physics locally as a prediction. Reconcile is the conductor's correction — the server telling you "here's where you actually should be right now."

## The Two Data Structures

CSP revolves around two data structures that flow in opposite directions across the network.

MoveData flows from the client UP to the server. It contains the player's raw inputs — WASD direction, camera yaw for facing, whether jump was pressed, whether sprint is held. This is sent every single network tick, typically 60 times per second. Because of that frequency, you want this struct to be as small as possible. Only include what the simulation needs to reproduce the movement. Never include derived values like position or velocity — those are outputs, not inputs.

MoveState flows from the server DOWN to the client. It contains the authoritative physics state — world position, body rotation, velocity, whether the character is grounded, and crucially, any timers that affect future simulation. Jump timers, coyote time, stagger duration. This is the server's "truth," and when the client receives it, it uses it to correct any prediction error.

The golden rule: MoveData contains what the player WANTS to do. MoveState contains what the physics ACTUALLY produced. The Replicate function connects them — given an input and a current state, it produces the next state.

## The Tick Loop

FishNet's TimeManager provides a fixed-rate tick loop, similar to Quantum's frame advance. Every tick — let's say 60 times per second — the OnTick event fires. Inside that event, you do three things.

First, collect input. Only the owning player does this. You read from the input system and pack it into a MoveData struct.

Second, call Replicate with that MoveData. On the owner's client, this executes IMMEDIATELY as a prediction — the character moves right now. Simultaneously, FishNet sends the MoveData to the server. On the server, when the MoveData arrives, Replicate executes authoritatively, producing the "true" result.

Third, after the server's Replicate runs, CreateReconcile fires automatically on the server. It captures the current physics state into a MoveState struct and sends it back to the client. The client compares its predicted state to the server's truth and, if there's a discrepancy, snaps to the server state and replays all unacknowledged inputs.

## The Replay Loop

The replay loop is the heart of reconciliation, and it all happens in a single Unity frame — invisible to the player.

Here's the sequence. The server sends a MoveState for Tick 100 — say the authoritative position is [10, 0, 5]. Meanwhile, the client has been predicting ahead and is currently at Tick 103 with a predicted position of [16.1, 0, 5]. The server's authoritative position for Tick 100 was [10, 0, 5].

The client receives the Tick 100 reconcile, snaps its transform to [10, 0, 5], and then replays Tick 101's saved input, then Tick 102's saved input, then Tick 103's saved input, each time running the Replicate function on the corrected state. After replaying all three ticks, the client arrives at a corrected position for Tick 103 — let's say [16.0, 0, 5]. The difference from the original prediction was 0.1 units — invisible to the player.

All of this — the snap, the three replays, the final position update — happens in one frame. It takes microseconds. The player never sees it.

## TickDelta vs DeltaTime: The Silent Killer

This is the single most common bug in FishNet CSP implementations, and it causes the most infuriating symptom: characters that vibrate and jitter.

Inside the Replicate function, you must use TimeManager.TickDelta for all physics calculations — never Time.deltaTime. Here's why.

Time.deltaTime is variable. It depends on the frame rate. On a client running at 144fps, it's about 0.007 seconds. On a server running at 30fps, it's about 0.033 seconds. During the reconciliation replay, where three ticks are re-executed in a single frame burst, Time.deltaTime is essentially zero — maybe 0.00001 seconds.

TimeManager.TickDelta is fixed. It's always the same value — for a 60Hz tick rate, it's 0.01667 seconds — regardless of whether you're running on the client, the server, or during a replay. This consistency is what makes the replay loop produce correct results.

If you use Time.deltaTime, the client, the server, and the replay loop all compute slightly different physics. The position diverges every tick. Every reconcile triggers a visible correction. The character oscillates between its predicted position and the corrected position at the frame rate. The visual result is jitter — a vibrating character that feels broken.

The fix is simple. Use `(float)TimeManager.TickDelta` everywhere inside Replicate. Never reference Unity's Time class inside predicted code.

## Physics Configuration

Unity's physics engine runs automatically in FixedUpdate by default. For CSP, you need to change that. Set Physics.simulationMode to SimulationMode.Script, which tells Unity to stop running physics automatically. FishNet's PredictionManager will call Physics.Simulate() at exactly the right time — once per Replicate call, including during replay loops.

If you leave physics on automatic, Unity runs physics at its own rate, independent of network ticks. The client's physics and the server's physics step at different moments in time, and the results diverge. Switching to Script mode ensures FishNet has full control over when physics steps occur.

## Designing MoveData for a Platformer

For a Prince of Persia style game with wall-running, double-jumps, ledge grabs, and sword combat, your MoveData needs to encode all the player intents. But here's the crucial distinction: encode INTENT, not RESULT.

"I pressed jump" is intent — it goes in MoveData. "I'm in the air" is a result — it goes in MoveState. "I'm holding the grab button" is intent. "I'm currently grabbing a ledge" is a result of physics raycasts that ran inside Replicate. "I pressed attack" is intent. "My sword is at frame 12 of the swing animation" is result.

The Replicate function is the bridge between intent and result. It takes the input and the current simulation state, advances physics by one tick, and produces the next state. If you accidentally put results into MoveData, you'll end up with stale state being replayed during reconciliation, causing impossible corrections and jitter.

## Key Takeaways

Client-Side Prediction is the single most important system for making a platformer feel responsive over a network. The client predicts locally, the server corrects remotely, and FishNet replays unacknowledged inputs during reconciliation. The Replicate function must be pure — given the same input and state, it must produce the same result. No Time.deltaTime, no Random, no reading from Unity's Input system directly inside Replicate. Always use TimeManager.TickDelta. MoveData is for inputs going UP to the server. MoveState is for state coming DOWN to the client. Every variable modified in Replicate that affects future tick calculations MUST be in MoveState — missing even one timer or flag causes invisible desyncs that show up as jitter. Set Physics.simulationMode to Script so FishNet controls when physics steps happen.
