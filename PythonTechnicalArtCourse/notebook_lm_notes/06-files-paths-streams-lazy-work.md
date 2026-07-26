# Lesson 06: Files, Paths, Streams, and Lazy Work

## The Big Picture

Consider a shipping label, a loading dock, and a worker holding an open box. The label tells you where the box is; it is not the box, and it is not the worker's current position inside the box. In Python, a `Path` is the filesystem location, a file object is the live access stream, and its cursor is the current position. Keeping those concepts separate prevents a large class of asset-tool bugs.

## Paths Versus File Objects

`Path("assets/take.json")` creates a value that describes a location. It does not read the file, prove that it exists, or open a handle. `Path` methods such as `exists`, `glob`, and `rglob` help discover and inspect locations. Calling `path.open(...)` creates a file object with a mode, encoding, buffering behavior, and cursor.

That file object is closer to a C# `FileStream` or a reader layered over one. Text mode decodes bytes into strings; binary mode gives you bytes. `readline` and `read` advance the cursor, `tell` reports a position, and `seek` moves it. Buffering may fetch more data from the operating system than one call requests, but the file object's interface still exposes a logical position. A path can safely be stored for later. A file object should normally stay inside a `with` block.

## Cleanup and Structured Data

The `with` statement is a lifecycle boundary. It opens a stream, runs the indented work, and closes the stream even if an exception occurs. This is not file-only magic: the same context-manager idea can control locks, temporary directories, transactions, and network sessions. For a function, pass a `Path` when it needs a location; open the stream locally when it needs access.

JSON maps naturally to Python dictionaries, lists, strings, numbers, booleans, and `None`. CSV rows arrive as text, even when a column looks numeric, so convert fields deliberately. Parsing is not validation. An asset importer still needs to check required keys, ranges, and file existence before sending a record to a converter.

## Iterators, Generators, and Lazy Work

An iterable can participate in a `for` loop. An iterator maintains progress and provides the next value. A generator function uses `yield` to produce one value, suspend, and resume later. Calling the generator function does not immediately scan the whole file. Each loop step resumes it until the next yield.

This resembles C# `IEnumerable<T>` with `yield return`. A generator is useful for a large event log or directory scan because it can keep memory bounded and stop early. `next(generator, None)` can find the first matching record without reading later records. Lazy does not mean magically faster: if the consumer needs every item, parsing and disk I/O still cost time. The benefit is deferred work, early exit, and avoiding a giant intermediate list.

## Technical-Art Relevance

A scalable asset audit can discover paths with `pathlib`, open one manifest at a time, yield normalized records, and stop when it finds a fatal condition. The next stage receives data, not an accidental closed stream. This separation also makes the code easier to test later: path discovery, parsing, validation, and conversion are distinct responsibilities.

## Key Takeaways

1. **Path**: a location value, not a file pointer.
2. **Stream**: a live text or binary resource with mode, buffering, and cursor position.
3. **Lifecycle**: `with` owns cleanup for the stream's lifetime.
4. **Lazy work**: generators yield incrementally, enabling bounded memory and early exit.
5. **Parsing**: JSON and CSV create data structures, but validation remains your responsibility.

