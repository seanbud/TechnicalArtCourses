# Lesson 08: Async, Threads, Processes, and Deployment Mental Models

## The Big Picture

Imagine one coordinator handling three jobs: waiting for network replies, updating a desktop interface, and processing a CPU-heavy mesh. Those jobs can overlap, but the mechanism matters. Async tasks interleave at explicit suspension points. Threads share one process and its memory. Processes have separate memory and communicate through an IPC boundary. “Concurrent” means overlapping progress; “parallel” means simultaneous execution on separate resources.

## Coroutines and the Event Loop

Calling an `async def` function creates a coroutine object. It does not immediately finish the function. `await coroutine` runs it until it produces a result or suspends on another awaitable. `asyncio.create_task` schedules the coroutine on an event loop, allowing other scheduled tasks to run when the first task waits. This is cooperative concurrency: the task must reach an await point.

The analogy is one dispatcher at a loading dock. The dispatcher can switch to another waiting order when the current order is waiting for a truck, but cannot help the next order while staring at a blocking operation. A blocking file call, synchronous HTTP request, or long Python loop can freeze every task on that event-loop thread. Async is a strong fit for many I/O waits when the libraries actually provide non-blocking interfaces; it is not a magic thread.

## CPU Work and Threads

Standard CPython builds have a global interpreter lock that limits simultaneous execution of Python bytecode in multiple threads. Free-threaded builds exist, but they are not a safe default assumption for a portable technical-art course. Threads still have value for I/O, libraries that release the lock, and carefully bounded worker jobs. Their shared memory is both convenient and dangerous: two operations can race, and a multi-step update is not automatically safe just because the interpreter prevents one bytecode instruction from overlapping another.

Protect critical sections with locks, or design around queues so the coordinator sends jobs and receives results. For desktop tools, keep UI calls on the UI thread required by the framework. Send data back to that thread instead of updating controls from arbitrary workers.

## Processes and IPC

A process owns a separate interpreter and address space. A process worker does not automatically see the parent's Python objects. Inputs and outputs cross a boundary through a queue, pipe, socket, or serialized file. That costs time, especially for a large scene graph, but it provides isolation and can enable true parallel CPU work. A process pool is a good candidate for independent mesh or texture jobs when records are small enough to serialize and external libraries behave correctly in the target environment.

## Servers and Deployment

An async server uses an event loop to handle many I/O-bound connections, while worker threads or processes may handle blocking or CPU-heavy work. A desktop automation tool has a different deployment contract: launch command, configuration location, logging, external executable discovery, and clean shutdown. In both cases, package the same decisions made during development. Declare the interpreter and dependencies, document the worker model, define error propagation, and test the platform's process-start behavior.

## Technical-Art Relevance

Use async when the bottleneck is waiting on many service calls. Use threads when shared-process I/O or UI-adjacent work is appropriate and the libraries are safe. Use processes when CPU work or crash isolation justifies serialization and IPC. Measure before choosing, and send explicit asset records across boundaries rather than assuming that objects or global state are shared.

## Key Takeaways

1. **Coroutine**: calling creates an object; `await` receives its result; a task schedules it on an event loop.
2. **Concurrency**: async interleaves cooperative waits, while parallelism requires simultaneous execution resources.
3. **Threads**: share memory, so design for synchronization and thread-safe APIs.
4. **Processes**: isolate memory and communicate explicitly, trading overhead for isolation and CPU scaling.
5. **Deployment**: package the interpreter, dependencies, worker model, configuration, and shutdown contract together.

