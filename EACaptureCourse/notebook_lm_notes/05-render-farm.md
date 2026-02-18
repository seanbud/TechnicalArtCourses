# Lesson 05: Distributed Computing (The Farm)

## Buying Time with Money

Here is a math problem: You have a script that takes 10 minutes to process a motion capture take. You have 600 takes to process today.
That is 100 hours of computation. You have an 8-hour workday.
You cannot solve this problem by writing faster code. You solve it by throwing more computers at it.

This is **Horizontal Scaling**. Instead of one super-computer (Vertical Scaling), we use 100 cheap computers.
100 hours / 100 computers = 1 hour.
We just turned an impossible deadline into a lunch break.

At EA, we call this "The Farm." We use software like **AWS Thinkbox Deadline** or **OpenCue** to manage it.

## The Dependency Graph (DAG)

The Farm isn't just a pile of jobs; it's a flow chart.
You can't render the frame until you simulate the cloth. You can't simulate the cloth until the skeleton is solved.
This creates a **Directed Acyclic Graph (DAG)** of dependencies.
*   Job A: Solve Skeleton
*   Job B: Sim Cloth (Waits for A)
*   Job C: Render (Waits for B)

Your Python submission scripts define these relationships. You are essentially programming a massive, distributed state machine.

## Idempotency: The Crash-Proof Rule

When you run code on 1,000 computers, things go wrong. A cord gets pulled. A network switch overheats. A node crashes.
The Farm is designed to handle this: if a job fails, it just retries it on a different node.

This leads to a critical concept: **Idempotency**.
An idempotent function produces the same result no matter how many times you run it.
*   **Bad (Not Idempotent):** A script that appends "Done" to a log file. If it crashes and retries, you get "DoneDone".
*   **Good (Idempotent):** A script that *overwrites* the log file with "Done". If it runs twice, the result is still just "Done".

You must design your tools to assume they will crash and need to restart.

## Optimization: Chunking

There is also an overhead cost to every job. Opening Maya might take 45 seconds. Processing one frame might take 1 second.
If you send 1 frame per job, you are spending 98% of your time loading Maya.
We use **Chunking** to solve this. We bundle 50 or 100 frames into a single job.
Now we pay the 45-second "Startup Tax" once, and process 100 frames. The efficiency skyrockets.

## EA Relevance: Madden Machine Learning

The Farm isn't just for rendering anymore. On titles like *Madden*, we use the farm to process data for **Machine Learning**. We might have 10 years of football animation data. We spin up thousands of nodes to analyze that data, tagging every tackle, run, and throw automatically. This training data powers the "FieldSENSE" animation system. The scale of this compute utility is one of EA's biggest competitive advantages.

## Key Takeaways

*   **Horizontal Scaling:** Speed comes from parallelization, not just raw CPU speed.
*   **Dependencies:** Complex pipelines require a graph structure (DAG) to manage order of operations.
*   **Idempotency:** Code must be safe to re-run. Crashes are expected.
*   **Efficiency:** Balance job size (Chunking) against overhead to maximize throughput.

Next, we'll discuss the strategy for storing all this data: **Data Strategy**.
