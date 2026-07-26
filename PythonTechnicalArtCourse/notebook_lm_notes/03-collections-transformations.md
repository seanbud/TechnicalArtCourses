# Lesson 03: Collections and Pythonic Data Transformations

## The Big Picture

Imagine an asset department receiving a cart of files. Some items need to stay in order, some need to be grouped by key, and some are duplicates that should be counted only once. Python gives you four core containers for those jobs: lists, tuples, dictionaries, and sets. The important skill is not memorizing punctuation. It is choosing the container whose guarantee matches the data, then transforming it in a way another technical artist can audit.

## The Four Core Collections

A list uses square brackets and is ordered and mutable. It is a good work queue or ordered result. A tuple uses parentheses and is immutable, so it is useful for a fixed record such as an XYZ coordinate or a pair returned from a function. A dictionary uses key-value pairs and provides named lookup for metadata. A set stores unique values and is useful for membership, such as asking whether an extension is supported. An empty `{}` is a dictionary, not a set; use `set()` for an empty set.

These have familiar C# neighbors: `List<T>`, value tuples, `Dictionary<TKey,TValue>`, and `HashSet<T>`. The comparison helps, but keep the guarantees visible. A set is not a presentation-order collection. A dictionary's primary purpose is lookup, even though modern Python preserves insertion order. A list gives fast index access, but inserting at the front shifts later elements. Converting a list to a set can make membership faster, but costs a pass and discards duplicates and sequence order.

## Mutation, Slicing, and Unpacking

Here is the first practical trap. If two names refer to one list, `append` or `pop` changes the shared object. A shallow copy creates a new list container, but nested objects inside it can still be shared. This is the same ownership question you ask with reference types in C#, expressed with fewer declarations.

Slicing is about positions. `items[1:4]` returns positions 1, 2, and 3. `items[-2:]` takes the last two positions, and `items[::-1]` returns a reversed copy. Slicing is not filtering. If you want “all files whose extension is FBX,” you need a predicate, not a range of indices. This distinction is especially important when an artist asks for a content rule rather than a batch position.

Unpacking assigns several names from one iterable: `width, height = (1920, 1080)`. Starred unpacking can capture the middle of a sequence. It is a compact form of structured assignment, similar to deconstruction in C#, but it still requires the values to fit the pattern.

## Comprehensions and the LINQ Bridge

A list comprehension says: for each item, compute this output, and optionally keep it when this condition passes. A set comprehension creates unique output, and a dictionary comprehension creates key-value records. For an asset manifest, a comprehension can turn paths into records while filtering out files without extensions.

`map` applies a function to each item. `filter` keeps items whose predicate is true. In Python 3, both return lazy iterator objects, so call `list(...)` when you need a reusable list immediately. `lambda` creates a small anonymous function, often useful as a sorting key. `sorted(paths, key=lambda path: path.lower())` resembles C# `OrderBy`, while `map` resembles `Select` and `filter` resembles `Where`.

But Python does not turn every collection into a fluent LINQ object with chained methods. You will usually choose among a comprehension, a built-in function, `map`/`filter`, or an explicit loop. Use the form that makes the rule easiest to understand. A one-line comprehension is not automatically more professional than a four-line loop with a clear validation branch.

## Technical-Art Relevance

Consider a texture audit. A list preserves the scan order for a report. A set records unique extensions. A dictionary maps a path to metadata. A comprehension can normalize records, while a filter keeps only files above a size threshold. If the transformation is expensive, remember that a comprehension eagerly creates its result. A generator expression, which you will study with iterators later, can defer work. For now, make evaluation and ownership explicit.

## Key Takeaways

1. **Container choice**: list, tuple, dictionary, and set communicate different data contracts.
2. **Slicing**: selects by position; filtering selects by a predicate.
3. **Pythonic transforms**: comprehensions, `map`, and `filter` are tools, not a mandatory style.
4. **LINQ comparison**: `Select`/`Where`/`OrderBy` are useful analogies, but Python's call and laziness model is different.

