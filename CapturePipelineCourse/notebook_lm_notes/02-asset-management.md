# Lesson 02: Pipeline & Perforce

## The Merge Conflict Problem

Let's talk about the specific challenges of working with Art data versus Code.
If you're a programmer, you love Git. It's decentralized, flexible, and handles text merging beautifully. If two people edit the same script, Git usually figures it out.

But Art is different. Art is **Binary**.
A ZBrush sculpt, a Photoshop file, or a Motion Capture take is a blob of binary data. You cannot "merge" pixels. If Artist A changes the left side of a texture, and Artist B changes the right side, you can't combine them. One person's work must be overwritten.

At the scale of EA—with thousands of artists working on *Battlefield* or *The Sims*—this is a catastrophe waiting to happen. To solve it, we use **Perforce (Helix Core)**.

## Pessimistic Locking

Perforce works differently than Git. It uses a strategy called **Pessimistic Locking**.
Before you can edit a file, you must "Check Out" (lock) it. This tells the server: "I am working on this. Nobody else can touch it."

It sounds restrictive, but it is the only way to prevent binary conflicts. The server uses the `+l` (exclusive lock) file type modifier to enforce this. If you try to checkout a file that someone else has, the server says "No." This simple mechanism saves thousands of hours of lost work every year.

## Designing the Flow: Streams

We organize our data into **Streams**. Think of these as branches with very strict traffic rules.
Typically, we have a structure like this:

1.  **Mainline:** The stable core. The game should always compile and run from here.
2.  **Development:** The chaotic workshop. This is where new features and assets are tested.
3.  **Release:** The frozen snapshot. This is the version we are shipping to Sony or Microsoft.

The rule is "Merge Down, Copy Up."
You merge changes *down* from Mainline to Development daily (absorbing updates).
You only copy changes *up* from Development to Mainline when they are proven stable. This protects the rest of the team from broken builds.

## Automating the Bureaucracy: P4Python

As a Technical Artist, your job isn't to manually check out files. Your job is to build tools that do it for the artists.
We use **P4Python** to script the server.

Imagine a scenario: An artist goes on vacation, but they left a critical file Checked Out. The production is blocked.
You write a script that:
1.  Connects to the server as Admin.
2.  Finds the file.
3.  Impersonates the artist.
4.  Reverts the checkout.
5.  Unlocks the file.

## Admin Strategy: Triggers & Typemaps

We also use **Triggers** to enforce quality. A trigger is a script that runs on the server before a submit is accepted.
For example, we might have a "Naming Convention Trigger." If an artist tries to submit `MyCoolGun.fbx` (caps and spaces), the trigger rejects it and prints an error: "Filename must be lowercase: my_cool_gun.fbx".

This prevents bad data from ever entering the pipeline in the first place.

## EA Relevance: Destruction Data

Why is this so critical at EA? Consider **Battlefield**. The destruction system requires massive pre-baked assets—shattered concrete, bent rebar, glass shards. A single building asset might resolve to 50GB of binary data.
Git would choke on a 50GB repo. Perforce handles Terabytes of binary data effortlessly. It is likely the single most important piece of infrastructure in the entire company.

## Key Takeaways

*   **Binary vs Text:** Art is binary and cannot be merged. This dictates our choice of version control.
*   **Locking:** Perforce prevents conflicts by ensuring only one person edits a file at a time.
*   **Streams:** Isolate instability in Development streams to protect the Mainline.
*   **Automation:** P4Python allows us to manage the pipeline programmatically.

Next, we'll look at how we build the tools that artists actually click on: **Tooling & PySide**.
