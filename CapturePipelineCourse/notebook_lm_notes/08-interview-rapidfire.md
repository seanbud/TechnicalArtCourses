# Lesson 08: Nigel Round Rapid-Fire

## Infrastructure as Code

Your pipeline is your product. If the build server dies, can you rebuild it from a git clone? That's the test.

Everything lives in version control:
*   **Dockerfile** defines the OS, Maya version, Python version. Exact versions. Not "latest."
*   **.gitlab-ci.yml** defines build, test, deploy stages.
*   **requirements.txt** pins every Python library. `PySide6==6.5.2`, not `PySide6`.
*   **config.json** holds paths, thresholds, server addresses. Never hardcode these.

The Bus Factor test: if you get hit by a bus, a new hire should be able to `git clone` the repo, run `docker build`, and have a working pipeline by end of day. If they can't, your infrastructure is tribal knowledge, not code.

## Data Gravity: The Capture-to-Engine Bridge

The most important answer in this interview. "Data Gravity" means: the bigger the file, the harder it is to move. Capture generates hundreds of gigabytes daily. You cannot have humans manually copying files around.

The overnight flow:
1.  **Capture finishes.** Raw .c3d files land on a local NAS. Fast storage, local to the stage.
2.  **File Watcher triggers.** A Python daemon using the `watchdog` library detects new files. No cron jobs, no manual triggers.
3.  **Validate.** Before processing anything: MD5 hash to verify integrity. File size sanity check. Marker count check. If validation fails, alert immediately and skip.
4.  **Farm submission.** The watcher script auto-submits a Deadline job. Headless MotionBuilder solves the skeleton.
5.  **Export.** The farm node exports .fbx to a staging area.
6.  **Publish.** P4Python auto-submits the .fbx to Perforce.
7.  **Notify.** Slack webhook fires: "Shot 05 is game-ready."

Monday capture → Tuesday morning game-ready. No manual steps. Fully idempotent — if a node crashes, the farm retries automatically.

The key pattern is **decoupling**. The capture stage writes to a buffer (NAS). The sweeper reads from the buffer. The farm processes. Perforce publishes. No single point of failure. If the network between the stage and the NAS is slow, the capture doesn't stall — it just takes longer to appear in the inbox.

## Vendor Integration: The Adapter Pattern

EA works with Vicon, OptiTrack, DI4D, Faceware, Move.ai. Each vendor has a different SDK and data format. Your golden rule: never let a vendor format infect your pipeline.

Write an **Adapter**. It's a class that converts the vendor's proprietary format into YOUR internal data format.
*   `ViconAdapter.load("file.c3d")` → returns your `CaptureData` object.
*   `OptiTrackAdapter.load("file.csv")` → returns the exact same `CaptureData` object.
*   `MoveAIAdapter.load("file.json")` → same thing.

The rest of your pipeline doesn't know or care which vendor produced the data. It just works with `CaptureData`.

Use a **Factory function** to auto-detect the format by file extension. The caller writes `load_capture("file.c3d")` and the factory picks the right adapter automatically.

If a vendor ships SDK version 4 and breaks backward compatibility, you rewrite ONE adapter file. The 50 downstream tools don't change. This is the power of abstraction.

Use Python's `ABC` (Abstract Base Class) to enforce that every adapter implements a `.load()` method. If someone writes a new adapter and forgets to implement `load()`, Python raises an error at import time, not at runtime.

## System Reliability: The Maya Update Problem

"What happens when Autodesk ships Maya 2025 and breaks your tools?"

Four layers of defense:

**1. Pin versions.** Your Docker image specifies `maya:2024.2`, not `maya:latest`. Your `requirements.txt` pins every library. The environment is frozen.

**2. Abstraction layer.** Artists never write `import maya.cmds`. They write `import pipeline.dcc_bridge`. The bridge wraps every Maya API call — `get_selected()`, `parent_node()`, `export_fbx()`. If Maya changes an API in 2025, you fix one file: `dcc_bridge.py`. The 50 tools that import it don't change.

**3. CI gate.** You have a GitLab CI pipeline that runs your full test suite against Maya 2024 on every commit. Before upgrading, you create a branch, swap the Docker image to Maya 2025, and run the tests. If tests fail, you don't upgrade. You fix the failures first.

**4. Rollback.** You keep the Maya 2024 Docker images in your registry. If 2025 causes unexpected failures in production, you revert the farm to 2024 in minutes. One line change in the CI config.

## Context Managers: Scene Safety

A senior TA always wraps risky operations in **Context Managers**.

Imagine a tool that disables AutoKey, does a batch export, then re-enables AutoKey. If the export crashes halfway, AutoKey stays off. The artist works for 4 hours thinking they're keying poses. They aren't. They lose half a day.

The `with` statement and Python context managers guarantee cleanup even on crash:
*   `undo_chunk()` — wraps all operations in a single Undo. If it crashes, you Ctrl+Z once.
*   `maintain_selection()` — restores the user's selection after the tool finishes.
*   `maintain_time()` — restores the timeline position.

These are small but they build trust with artists. Your tool never leaves the scene in a broken state.

## Automated Validation

"How do you automate sanity checks for captured data?"

You write a `CaptureValidator` class that runs a gauntlet of checks on every processed file:

1.  **File Integrity:** Can Maya even open this file without crashing?
2.  **Skeleton Hierarchy:** Does `Root → Hips → Spine → Spine1 → Head` exist? Missing a joint means retargeting breaks.
3.  **Frame Range:** Is it absurdly short (truncated capture) or absurdly long (someone forgot to stop recording)?
4.  **Foot Contact:** Check velocity of foot joints at grounded frames. If the foot moves more than 5cm while it's supposed to be planted, that's foot skating. Flag it.
5.  **Naming Convention:** Does the filename match the schema? `project_YYYYMMDD_scNN_shNN_vNNN.fbx`. If not, reject the submit.

Run this validation in CI (headless). Every file that enters Perforce must pass the gauntlet. No exceptions. No "I'll fix it later."

## Scalability: 10 vs 1,000

"How does your pipeline handle 10x the volume?"

The code doesn't change. The deployment target changes.
*   10 takes → single workstation, manual trigger, Python script.
*   100 takes → local farm with Deadline, automated file watcher, 10 render nodes.
*   1,000 takes → cloud burst to AWS Batch. Docker containers on auto-scaling EC2 instances. Input from S3, output to S3, then sync down to Perforce.

The same Docker image that runs on your laptop runs on 1,000 AWS nodes. That's the power of containerization. You write the Dockerfile once and deploy anywhere.

For cloud bursting: use `boto3` (AWS Python SDK). Upload the scene to S3, submit an AWS Batch job that references your Docker image, and the output lands in an S3 bucket. A downstream script syncs the results into Perforce.

## Perforce Automation

As a pipeline TA, you don't use the P4V GUI. You script everything with **P4Python**.

Key automation patterns:
*   **Auto-publish:** Farm node finishes processing → P4Python `run_add()` or `run_edit()` → structured changelist description → `run_submit()`.
*   **Force-unlock:** Artist goes on vacation with a file checked out → Admin script uses `run_revert()` to impersonate and unlock.
*   **Triggers:** Server-side Python scripts that reject bad filenames on submit. If `filename != filename.lower()`, return `exit(1)` → submit blocked.
*   **Typemap:** `binary+l //....fbx` → all FBX files are auto-locked (exclusive checkout).

Key commands to know cold: `fstat`, `edit`, `add`, `submit`, `revert`, `sync`, `typemap`, `protect`, `triggers`.

## Bones, Retargeting & Skeletons

Fast reference if Nigel probes on capture fundamentals:

*   **Rigid Body:** 3+ non-collinear markers define one bone's 6DOF (3 position + 3 rotation).
*   **Solving:** Fitting a skeleton into a point cloud. Uses SVD (Singular Value Decomposition) to minimize the error between the marker positions and the bone model.
*   **Retargeting:** Mapping motion from an actor's skeleton to a game character with different proportions. The actor is 5'8", the character is 6'5". HumanIK handles this by using constraint-based mapping rather than raw rotation copying.
*   **IK (Inverse Kinematics):** "Put the foot at world position X,Y,Z." The solver figures out the knee and hip angles. Used for anything that needs contact — feet on ground, hands on objects.
*   **FK (Forward Kinematics):** "Rotate the shoulder 45 degrees." The elbow and wrist follow. Used for free-swinging motion where contact doesn't matter.
*   **Marker Swap:** After occlusion (arms cross), the system mislabels markers. Left wrist becomes right wrist. Detected by velocity spike — a hand cannot move 5 meters in one frame.
*   **Residual:** Camera ray intersection error in millimeters. Under 1mm is gold standard. Over 10mm is garbage data.
*   **HumanIK (HIK):** MotionBuilder's full-body retargeting solver. You "characterize" your skeleton by mapping your joint names to HIK's template: "Your `L_Thigh` = HIK's `LeftUpLeg`."
*   **Characterization:** The mapping step. If you map wrong (swap left/right), the character mirrors all motion.
*   **T-Pose / A-Pose:** The rest pose. Both the solver and the retarget must agree on the rest pose. If they don't, every frame has an offset error.
*   **Foot Skating:** Feet sliding on ground during a walk cycle. Caused by bad IK constraints or missing foot-lock data. Detectable by checking foot velocity at grounded frames.
*   **.c3d Format:** Industry standard binary format for 3D marker data. Contains XYZ positions per frame, analog channels (force plates), and metadata (subject name, frame rate).

## Photogrammetry Pipeline

If the role touches 3D scanning (likely for "Future Development"), know this flow:

1.  **Capture:** 200+ DSLR photos of a subject from all angles. Or a structured-light scanner (Artec, FARO).
2.  **Alignment (SfM):** Structure from Motion. The software computes camera positions from overlapping photos.
3.  **Dense Cloud (MVS):** Multi-View Stereo. Generates millions of 3D points.
4.  **Mesh Reconstruction:** Poisson or Delaunay algorithms convert the point cloud into a triangle mesh. This mesh is ugly — 50 million triangles, holes, noise.
5.  **Retopology:** Converting the messy scan into clean quad topology suitable for animation.
6.  **LOD Generation:** Multiple resolutions — 50K tris (cinematic), 10K tris (gameplay), 2K tris (background).
7.  **UV & Bake:** Project the high-poly detail onto the low-poly mesh as Normal Maps and Diffuse Textures.

Tools: RealityCapture, Agisoft Metashape, Meshroom (open source). RealityCapture has a CLI for automation: `RealityCaptureApp -set "Input Folder" photos/ -align -reconstruct -exportModel output.obj`.

## Pipeline API Design

"How do you ensure IT and Engineering can support your tools after you move on?"

Four pillars:

**CLI First.** Every tool has a command-line interface with `argparse`. The GUI wraps the CLI, never the other way around. This means CI, the farm, and other scripts can call your tool without importing Qt.

**Structured Logging.** Use Python's `logging` module. Levels: DEBUG, INFO, WARNING, ERROR, CRITICAL. Two handlers: `StreamHandler` for console, `FileHandler` for disk. In production, pipe to an ELK Stack (Elasticsearch, Logstash, Kibana) for centralized monitoring. When the farm fails at 3AM, you search the logs from your laptop.

**Auto-generated Documentation.** Sphinx reads your Python docstrings and generates a website. `make html` → hosted on the internal wiki. The code IS the documentation. If someone changes a function, the docs update automatically on the next CI run.

**Config over Code.** All studio-specific settings live in a `config.json`: Perforce server address, frame rate, expected joint names, Slack webhook URL, S3 bucket name. The Python code reads the config at startup. To deploy the same pipeline at a different studio, you change the config, not the code.

## The Bottleneck Story

If they ask "tell me about a time you solved a complex infrastructure bottleneck":

**Problem:** Capture team producing 200 takes per day. Processing pipeline handling 50. Artists waiting 3–4 days for cleaned data. The bottleneck: a single workstation running MotionBuilder sequentially.

**Diagnosis:** I profiled the process end to end. Each take took 12 minutes: 2 minutes to solve the skeleton, 10 minutes waiting for file I/O on a shared NAS. The CPU was idle 80% of the time. The real bottleneck wasn't compute — it was NAS throughput.

**Solution:** Three changes. First, I containerized the MotionBuilder solve into a headless Docker image and deployed it to 20 Deadline farm nodes. Second, I wrote a Python file watcher using the `watchdog` library that auto-detected new .c3d files in the NAS inbox and submitted farm jobs without any human trigger. Third — and this was the key insight — I moved the intermediate cache to each node's local SSD. The farm node copies the .c3d to local disk, solves locally, and writes only the final .fbx back to the NAS. This cut the per-take I/O from 10 minutes to under 30 seconds.

**Result:** Throughput went from 50 takes/day to 200+/day. Overnight turnaround. Monday capture → Tuesday morning game-ready. Zero manual intervention. I also added MD5 validation at every transfer stage and Slack notifications on both success and failure.

**Architecture principle:** Decoupling. The capture stage writes to a buffer (NAS inbox). The sweeper reads from the buffer. The farm processes using local SSDs. Perforce publishes the final output. No component depends on another being online in real-time.

## Global Collaboration: Multi-Site Data Flow

"If a capture happens in Vancouver, how does Stockholm use it?"

1.  **Perforce Proxy** in Stockholm. Sits on the local network. First request for a file fetches it from Vancouver (slow, crosses the WAN). Every subsequent request serves it from the local cache (fast).
2.  **Pre-fetch script** runs at 3AM Stockholm time. Force-syncs yesterday's processed output. When artists arrive at 9AM, the data is already local.
3.  **Tiered replication.** Only the game-ready FBX files (small, ~100MB) are replicated to all sites. The raw capture data (large, ~50GB per take) stays in Vancouver. If Stockholm needs the raw data, they request it explicitly.
4.  **Metadata first.** As soon as a take is processed, publish a small JSON manifest (take name, frame count, actor, thumbnail path) to a shared database. Artists in Stockholm can search and preview BEFORE syncing the heavy files.
5.  **Bandwidth budgeting.** Schedule large syncs for off-peak hours. Use `p4 sync --parallel=threads=8` for maximum throughput during the transfer window.

## Questions to Ask Nigel

Show you're thinking at the Senior/Lead level:
*   "How does Future Development balance bespoke solutions for titles versus building a unified platform across studios?"
*   "What are the biggest IT or infrastructure hurdles currently slowing capture-to-engine throughput?"
*   "How do you handle global data flow between Vancouver and international studios?"
*   "What does the vendor relationship look like — are we consuming SDKs or co-developing with Vicon/DI4D?"
*   "What's the team's stance on markerless mocap (Move.ai, DeepMotion)? Is that on the Future Development roadmap?"
*   "How does the team approach documentation and handoff when a TA moves to a different project?"
