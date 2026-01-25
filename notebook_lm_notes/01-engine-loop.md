# Lesson 01: Unity Engine Loop

## The Big Picture

Let's start with a question that seems almost too basic: what actually happens when Unity runs your game?

Every single frame—and we're talking 60 times per second on a smooth game—Unity goes through a very specific sequence of operations. This isn't random. It's a deterministic execution loop, meaning everything happens in a predictable, defined order. Understanding this order is essential because it tells you *when* your code runs and *why* certain patterns exist in Unity development.

Here's the high-level flow of a single frame. First, Unity handles **Physics** through something called FixedUpdate. Then it processes your **Game Logic** in Update. Finally, it does **Rendering**—culling objects, issuing draw calls, and running shaders. Then the frame is complete, and the whole thing starts over.

If you look at your notes, there's a diagram showing this flow: Physics leads to Game Logic, which leads to Rendering. Each section has different timing characteristics that we'll dig into.

## The PlayerLoop System

Under the hood, Unity uses what's called the PlayerLoop system. This is a deeply nested structure with dozens of subsystems. You generally don't need to modify it, but knowing it exists helps you understand that Unity isn't just "calling Update."

The simplified execution order goes like this:

**Step 1: Initialization.** When your scene first loads, Unity calls `Awake()`, then `OnEnable()`, then `Start()`. These only run once per object lifetime.

**Step 2: Physics.** This is `FixedUpdate()`. Here's the key thing—this can run zero, one, or *multiple* times per frame depending on how long the previous frame took. We'll explain why in a moment.

**Step 3: Input Events.** Unity polls the mouse, keyboard, and touch inputs.

**Step 4: Game Logic.** This is your `Update()` function. It runs exactly once per frame.

**Step 5: Animation.** The Animator components update, inverse kinematics calculations happen.

**Step 6: Late Game Logic.** This is `LateUpdate()`. It runs after Update and after animation. This is why it's perfect for cameras—your character has already moved and been animated, so the camera can follow that final position without jitter.

**Step 7: Rendering.** Unity figures out what's visible, batches draw calls, and submits commands to the GPU.

**Step 8: End of Frame.** Coroutines that yielded with `WaitForEndOfFrame` resume, cleanup happens.

## Update vs FixedUpdate: The Core Distinction

This is one of the most commonly misunderstood concepts, and it will absolutely come up in interviews.

**Update** runs once per frame. The time between Update calls varies because frames take different amounts of time. If your game is running at 60 FPS, Update runs every 16 milliseconds. At 30 FPS, it's every 33 milliseconds. This variable timing is stored in `Time.deltaTime`.

**FixedUpdate** runs on a fixed timestep—by default, every 0.02 seconds, which is 50 times per second. It does *not* depend on your frame rate.

Now here's the critical question: why does FixedUpdate exist?

The answer is **determinism**. Physics simulations need consistent, repeatable results. If you apply a force in Update, a player with a faster computer experiences different physics behavior than someone with a slower computer. The same inputs could produce different results! That's a disaster for networked games and for consistent gameplay in general.

FixedUpdate solves this by always stepping physics at the same rate. But there's a catch.

## The Catch-Up Mechanism

If a frame takes too long—say your game hitches and takes 100 milliseconds instead of 16—FixedUpdate doesn't just run once. It runs *multiple times* to catch up. If FixedUpdate is set to 0.02 seconds and a frame took 0.06 seconds, FixedUpdate runs three times during that frame.

This is how Unity maintains physics accuracy even during frame rate drops. But it can also cause what's called a "spiral of death"—if FixedUpdate itself is slow, and you keep falling behind, you need even *more* FixedUpdate calls to catch up, which makes things even slower. Unity has a Maximum Allowed Timestep setting to prevent this runaway.

## Frame-Rate Independence

This leads to a practical rule you should always follow. When you're moving objects in Update, multiply your movement by `Time.deltaTime`.

Without deltaTime, your movement speed depends on frame rate. Something moving 1 unit per frame moves 60 units per second at 60 FPS, but only 30 units per second at 30 FPS.

With deltaTime, you're saying "move 1 unit per *second*." The actual frame-by-frame movement automatically scales to maintain consistent speed. Your notes show a code example of this pattern.

## Main Thread vs Render Thread

One more concept for this lesson: threading.

Unity runs most of your game logic on the **Main Thread**. All your MonoBehaviour scripts, physics calculations, and most engine systems live here.

Rendering partially happens on a separate **Render Thread** that submits commands to the GPU.

For desktop and console games, Unity can also use the **Job System** to parallelize certain tasks across worker threads.

But for VRify—and this is critical—you're targeting WebGL, which runs in a browser. Browsers are essentially single-threaded for JavaScript and WebAssembly. This means heavy Update logic can freeze the entire browser tab. There's no background thread to fall back on. This constraint will come up repeatedly as we go through the course.

## Key Takeaways

Before we move on, let's summarize what you should remember:

The PlayerLoop defines a precise order of operations every frame. FixedUpdate exists for physics determinism—it runs on a fixed timestep, potentially multiple times per frame. Update runs once per frame with variable deltaTime. LateUpdate runs after animation, making it ideal for cameras. Always multiply movement by deltaTime in Update. And for WebGL, heavy main thread work blocks everything because there's no multi-threading.

Next lesson, we'll look at what happens during that "Rendering" phase—the render pipeline.
