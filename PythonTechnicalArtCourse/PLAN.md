# Python for Technical Artists — Staged Course Plan

## Stage 1 status

This stage contains the approved eight-lesson syllabus, the Alex-course topic
map, and the course shell. Lesson HTML and NotebookLM notes are intentionally
not drafted yet. After coordinator review, lessons will be written in batches
of one or two, with each HTML lesson and its matching podcast notes drafted and
reviewed together.

## Audience and teaching stance

This course is for an experienced C# / Java technical artist who is rusty or
new to Python. It assumes general programming experience, but does not assume
familiarity with Python's object model, collection syntax, import system,
context managers, class mechanics, or async model.

Every lesson should include explicit C# comparisons, at least one explanatory
diagram, “Python surprise” callouts, and short drills. Examples should favor
asset, file, batch, and external-tool workflows. Testing and larger technical-
art applications are deliberately deferred to the follow-on roadmap rather
than becoming prerequisites in the initial eight lessons.

## Eight-lesson syllabus

### 1. How Python Runs and How Projects Start

Interpreter versus bytecode and VM; environments with `uv` and `pyproject.toml`;
modules, packages, imports, and entry points; and the command-line contract of
stdout, stderr, and exit codes. C# comparisons include CLR/assemblies and
`Main`, while the practical outcome is a predictable Python project layout.

### 2. Names, Objects, Values, and Types

Binding and rebinding, object identity, mutability, `None`, truthiness, and
dynamic typing; type hints and common built-ins; then a first look at classes,
instances, attributes, methods, and `self`. The lesson establishes the mental
model needed to understand why Python assignment is not C# value copying.

### 3. Collections and Pythonic Data Transformations

Lists, tuples, dictionaries, and sets; slicing and unpacking; comprehensions;
`lambda`, `map`, and `filter`; sorting with key functions; and direct
comparisons to C# LINQ, arrays, `List<T>`, `Dictionary<TKey,TValue>`, and
`HashSet<T>`. Short drills turn asset-record transformations into readable
Python expressions.

### 4. Functions, Calls, and Reusable Behavior

Positional and keyword arguments, defaults, `*args`, and `**kwargs`; functions
as values; callbacks, closures, method binding, context managers, decorators,
and the role of `functools`. C# delegates, lambdas, `using`, and attributes are
used as bridges without hiding Python's different call and binding rules.

### 5. Classes, Contracts, and Composition-First Design

Inheritance, overrides, `super()`, protocols, ABCs, duck typing, composition,
mixins, multiple inheritance, and MRO. The lesson moves from the introductory
class model in Lesson 2 to design tradeoffs, showing when a Python protocol is
closer to structural typing than to a C# interface declaration.

### 6. Files, Paths, Streams, and Lazy Work

`pathlib`, file objects, `with`, streams, cursors, buffering, iterators,
generators, `yield`, JSON, and CSV. Examples use directory scans and record
conversion, with C# `FileStream`, `using`, `IEnumerable<T>`, and serializers as
comparison points.

### 7. Reliable Tools and Automation

Exceptions and tracebacks, custom errors, `argparse`, `subprocess`, parent-child
behavior, external tools, packaging, and deliverables. The focus is on making
small automation tools diagnosable and composable: clear command-line input,
captured output, meaningful exit status, and safe failure behavior.

### 8. Async, Threads, Processes, and Deployment Mental Models

Coroutine creation, `await`, tasks, and the event loop; concurrency versus
parallelism; CPU limits; main and worker threads; race conditions, locks, and
queues; process isolation and IPC; plus servers and packaging. The lesson gives
the mental model needed before choosing threads, processes, or async for a
pipeline tool.

## Alex-course topic map

The source course is Alex's 50-assignment curriculum in
`/Users/seanbudning/Documents/GitHub/python-learning`. The numbers below retain
its broad coverage while showing where this condensed course places each topic.

| Alex assignments | Condensed destination |
| --- | --- |
| 01–04 Variables/types; numbers/operators; strings/slicing; conditionals/truthiness | Lesson 2 |
| 05 Loops, `range`, `enumerate` | Lesson 3 |
| 06 Functions, defaults, `*args`, `**kwargs` | Lesson 4 |
| 07–12 Lists, tuples, dictionaries, sets, comprehensions, sorting keys | Lesson 3 |
| 13–17 Scope/closures, first-class functions, decorators, decorator arguments, `functools` | Lesson 4 |
| 18 Type hints | Lesson 2 |
| 19–25 Classes, dunder methods, properties, inheritance, dataclasses, operator overloading, protocols/ABCs | Lessons 2 and 5 |
| 26–28 Iterator protocol, generators, `itertools` | Lesson 6 |
| 29 Exceptions and custom errors | Lesson 7 |
| 30 Context managers and `contextlib` | Lesson 4, revisited in Lesson 6 |
| 31 Modules, packages, and imports | Lesson 1 |
| 32–36 Files/pathlib, parsing records, regex, CSV, JSON | Lesson 6 |
| 37 Dates and times | Later study roadmap |
| 38–41 Threads, futures, multiprocessing, async | Lesson 8 |
| 42–44 HTTP client, HTTP service, SQLite | Lesson 8 deployment follow-on |
| 45 Testing with fixtures, parametrization, and mocking | Later study roadmap |
| 46–49 `argparse`, `subprocess`, filesystem automation, logging/config | Lesson 7 |
| 50 Multi-source automation capstone | Later study roadmap |

## Later study roadmap

These topics remain part of Alex's broad map but are intentionally not initial
lesson prerequisites: dates and timezone handling; HTTP clients and services;
SQLite; pytest fixtures, parametrization, mocking, and test strategy; logging
configuration; a multi-source automation capstone; and technical-art projects
such as asset validation, batch conversion, DCC/engine integration, and render
pipeline orchestration. They become follow-on modules after the eight mental
models are stable.

## Authoring and validation gates

1. Coordinator reviews this Stage 1 plan and the scaffold.
2. Draft Lessons 1–2 together: HTML plus 500–950-word NotebookLM notes.
3. Review technical depth, C# comparisons, surprise callouts, diagrams, and
   drills before continuing.
4. Draft later lessons in one- or two-lesson batches, maintaining navigation
   and the concurrent HTML/notes invariant.
5. Build the consolidated cheat sheet after lesson content stabilizes; add
   testing and technical-art application material as follow-on work.

