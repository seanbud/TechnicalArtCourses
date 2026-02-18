# Lesson 04: Automation & CI

## The "Works on My Machine" Problem

There is a phrase that drives Technical Directors crazy: "But it works on my machine!"
In a professional studio, your machine is irrelevant. The only machine that matters is the Build Server.
Your machine is "dirty"—it has your custom settings, your specific file paths, your admin permissions. The Build Server is "clean."

To bridge this gap, we use **Continuous Integration (CI)**.
Conceptually, it's simple: We have a robot (GitLab CI) that watches our code interactions. Every time you push a change, the robot wakes up, spawns a fresh computer, and runs a battery of tests to prove your code actually works.

## The Clean Room: Docker

How do we ensure the robot's computer is exactly right? We use **Docker**.
Docker allows us to define a "Container"—a lightweight Virtual Machine—that contains the exact environment we need.
We write a recipe (a `Dockerfile`) that says: "Start with Linux. Install Maya 2024. Install Python 3.9."
Because this is defined in code, we know that the environment is identical every single time. It eliminates the "Works on my machine" excuse forever.

## Headless Mode: The Invisible Maya

Here is the catch: Docker containers don't have monitors. They are just code running in the cloud.
So, any tool you write must be able to run **Headless** (Batch Mode).
`mayapy.exe -batch`

If your tool pops up a dialog box saying "Click OK to Continue," the robot can't click it. The process hangs forever. The build times out.
This reinforces the MVC lesson: Your logic must be completely decoupled from your UI, or it cannot be automated.

## The Pipeline Configuration

We control this robot with a YAML file (`.gitlab-ci.yml`). It defines stages:
1.  **Build:** Compile the code or bake the assets.
2.  **Test:** Run unit tests and validation scripts.
3.  **Deploy:** Upload the results to the game engine or build server.

If any stage fails, the robot stops and emails the team. This "Fail Fast" philosophy catches bugs minutes after they are written, rather than weeks later during QA.

## EA Relevance: Live Service & Apex Legends

For a live service game like *Apex Legends*, we update the game constantly—sometimes weekly. We might have thousands of character skins. If we change a bone in the master rig, we risk breaking 500 skins.
We cannot manually check 500 skins.
Instead, we rely on CI. We have automated tests that load every single skin, play a test animation, and check for errors. We trust the robot to tell us if we broke the game. Without this automation, maintaining a modern Live Service game would be impossible.

## Key Takeaways

*   **Consistency:** Docker ensures everyone (and the server) runs in the exact same environment.
*   **Headless execution:** Tools must run without a GUI to work in automation.
*   **Fail Fast:** CI catches bugs immediately, preventing them from polluting the main build.
*   **Scale:** Automation creates the confidence to make changes in massive projects.

Next, we'll see how we scale this compute power up to thousands of nodes in **Distributed Computing**.
