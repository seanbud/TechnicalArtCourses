# Lesson 13: Technical Interview Deep Dive — Data Flow, Automation & Problem Solving

## The Interview Requirement

The job description says it directly: "Deliver tooling, automation, or integrations that improved cross-departmental data flow or reduced processing time." Every answer you give needs to map back to this requirement. You need to demonstrate that you can build tools and automation that make data flow faster across departments — from capture stage, through post-production, to game team delivery.

## How to Structure Technical Answers

For deep technical questions — not behavioral ones, we covered STAR in an earlier lesson — use this framework: Context, Architecture, Implementation, Tradeoff, Metric.

**Context** takes 10 seconds. "In a capture pipeline, the problem is..." Set the scene.

**Architecture** takes 30 seconds. "The way I'd approach this is..." Name the design pattern. If you can draw it, offer to draw it on a whiteboard.

**Implementation** takes about 60 seconds. "Specifically, in Python, I would..." Mention specific libraries (watchdog, P4Python, boto3), APIs (Maya cmds, MotionBuilder's OMR), and file formats (C3D, FBX, glTF).

**Tradeoff** takes 15 seconds. "The tradeoff here is..." or "An alternative approach would be..." This shows you've considered alternatives and you're making a deliberate choice, not just defaulting to the first thing that comes to mind.

**Metric** takes 10 seconds. "This reduces processing time from X to Y." Or "This eliminates N hours of manual work per week." Quantify the impact. "Made it faster" is worthless. "Reduced from 4 hours to 15 minutes" is compelling.

## Data Flow Questions

**"How would you get mocap data from the stage to the game team in under 30 minutes?"**

The answer: an event-driven pipeline using a file-system watcher. A Python daemon monitors the stage output directory. When a new .c3d file appears, it triggers the pipeline automatically: validate, submit to the render farm for solving, export FBX in the client's format, deliver via Perforce or NAS, and notify the game team via Slack.

The tradeoff is full automation versus human QA. For hero performances, add a "hold for review" gate. For background animations, fully automated.

The metric: this takes the stage-to-artist time from "whenever someone remembers to do it" — often hours, sometimes next-day — to a consistent 15-25 minutes.

**"How do you handle versioning?"**

Three tiers. Perforce for source-of-truth version control. A semantic version suffix on every filename — v001, v002, v003. And a JSON sidecar file per take that records the full history: who processed it, when, with what version of the pipeline, what changed, and an MD5 hash for integrity.

## Automation Questions

**"Give me an example of tooling to reduce processing time."**

The biggest time sink is manual bone renaming after the Vicon solve. The solver outputs joints with Vicon naming — LFEMUR_jnt, RHand_jnt. The game team expects L_Thigh, R_Hand. Someone manually renames 50+ joints per take.

The tool: a config-driven batch renamer. A JSON file maps Vicon names to game skeleton names. A Python script reads the FBX, renames all joints in one pass, validates the result, writes the output. CLI-first for batch processing, Maya UI wrapper for one-offs.

The metric: manual renaming takes 10-15 minutes per take. The tool takes 2 seconds. Across 5,000 takes per year, that's about 1,000 hours of artist time recovered. That's a compelling answer.

**"How would you validate mocap data before delivery?"**

A validation pipeline with pluggable checkers. Each checker tests one thing: naming convention matches the client's regex pattern, all required joints exist, frame count is within range, root joint is near origin at frame zero, FBX header is valid and the file isn't corrupt. The runner executes all checkers and generates a report. Adding a new check means writing one function and registering it — no changes to the runner.

## System Design Questions

**"15 different clients, one pipeline — how?"**

This is Lesson 10 condensed. One pipeline engine, many JSON config profiles. Config Registry for client profiles, Adapter + Factory for format-specific export.  Plugin architecture for genuinely unique client needs. The litmus test: grep the source for "FIFA" — if you find it, you have a design flaw.

**"How do you ensure zero downtime during deployment?"**

This is Lesson 11 condensed. Symlink-based deployment — the live path is a symlink, swap it atomically, rollback in one command. Defense layers: retry with exponential backoff, circuit breaker, graceful degradation with local queuing, health monitor daemon. The stage never stops recording.

**"How would you unify marker and markerless?"**

This is Lesson 12 condensed. The key insight: different input, same output. Convergence point at a universal internal format. Strategy Pattern for swappable ingest and cleanup. Phased migration over 2-3 years with canary deployment on low-risk content before hero performances.

## Debugging Questions

**"30% of yesterday's takes have broken hands — how do you investigate?"**

Systematic approach: First, pull logs. Are the failures from the same session, actor, or marker set? Second, examine raw .c3d data — are hand markers present or occluded? Third, check the solver's gap-filling — did interpolation go wrong? Fourth, implement a systemic fix: a hand-specific validation checker that detects impossible finger angles. The metric: "we went from 30% failure rate to under 2%."

**"Pipeline is 3x slower than last week — diagnosis?"**

Check the dashboard for gradual vs sudden slowdown. Check recent deployments with git log. Profile a single take with cProfile. Check I/O and network throughput. Check the render farm capacity. The methodology is what matters — show the interviewer you have a systematic diagnostic process, not guesswork.

## The Pipeline Experience Answer

When they inevitably ask about your experience level, here's the prepared answer:

"My production pipeline experience is growing — I'm honest about that. What I bring is a strong foundation in the engineering patterns that make pipelines work: Adapter Pattern for vendor isolation, Strategy Pattern for technology unification, config-driven architecture for client portability, and defensive patterns for zero-downtime resilience.

I've studied EA's specific context — the vendor landscape, the manual post-production reality, the delivery layers, and the universal code vision. What I bring immediately: I can ship Python automation fast. Batch renaming, validation pipelines, file watchers, Perforce integration. And I think in measurable impact — how many artist-hours does this save?

Where I need your mentoring is in the production nuances. The edge cases that surface at 5,000 takes per year. I learn fast because the structural foundation is there."

## Technical Vocabulary

Drop these terms naturally in conversation: convergence point, config-driven, adapter/factory pattern, circuit breaker, graceful degradation, sweeper/watcher, canary deployment, sidecar metadata, residual error, HumanIK, Infrastructure as Code, data gravity.

## Key Takeaways

*   Structure every answer: Context → Architecture → Implementation → Tradeoff → Metric.
*   Always quantify impact. "Reduced X hours to Y minutes" beats "made it faster."
*   Config over code is the silver bullet for half the questions. Client names in config, never in code.
*   Name the patterns: Adapter, Strategy, Factory, Circuit Breaker. The vocabulary demonstrates fluency.
*   Be honest about experience, reframe it as fresh architectural perspective.
*   For debugging: methodology over guesswork. Metrics → changes → profiling → resource checks.
*   Everything connects: Vendors (L09) → Centralization (L10) → Resilience (L11) → Universal Code (L12) → Interview Answers (L13).
