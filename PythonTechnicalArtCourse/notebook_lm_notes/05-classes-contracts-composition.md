# Lesson 05: Classes, Contracts, and Composition-First Design

## The Big Picture

Picture a production pipeline assembled from stations: validation, conversion, naming, and delivery. You can build one giant machine for every combination, or connect small stations with clear inputs and outputs. Python classes support both approaches. This lesson emphasizes the second: understand inheritance and multiple inheritance well enough to read them, but prefer composition when a tool simply uses another capability.

## Inheritance and Explicit Contracts

A subclass inherits behavior and can override a method. The Python equivalent of a C# virtual method and `base` call is a base method plus an override that can use `super()`. The detail that matters is that `super()` follows Python's method-resolution order, not necessarily one visually obvious parent.

An abstract base class makes a nominal contract explicit. A converter ABC can require `convert(source, destination)`, and Python will prevent instantiation of a subclass that still has an abstract method. A protocol expresses the shape a caller needs. An unrelated class with a compatible `validate(record)` method can satisfy that protocol for static type checking without inheriting from it. This is structural typing, close in spirit to “if it has the interface, use it,” while ordinary Python still does not enforce every annotation at runtime.

## Duck Typing and Composition

Duck typing is the runtime version of focusing on behavior: call `validate` if the object is expected to validate. Composition makes the dependency explicit. An `ExportPipeline` can receive a validator and converter in its constructor, then call those collaborators in order. Swap the FBX converter for a glTF converter without inventing a subclass for every combination of format, platform, compression, and validation policy.

For an experienced C# developer, this is close to dependency injection with interfaces, but Python often needs less ceremony. A protocol or documented method shape is enough when static checking is available. The architecture should still validate external data and produce clear errors; duck typing is not permission to skip contracts.

## Mixins and Multiple Inheritance

A mixin is a small class that contributes one focused behavior. A timing mixin might add a method to report duration, while another class owns the actual exporter state. Multiple inheritance can combine these pieces, but it introduces MRO. Python calculates an ordered search path across the class graph. Cooperative methods must use `super()` and compatible arguments so every participant gets a chance to run.

This is where a useful caution belongs. Multiple inheritance is not just composition with different punctuation. It creates hidden coupling through lookup order and shared assumptions about state. Use it sparingly for disciplined, orthogonal mixins. If a pipeline “has a validator,” pass one in. If it “uses a logger,” pass one in. Reserve multiple inheritance for a deliberate design that the team can explain and test.

## Technical-Art Relevance

Asset pipelines change constantly: one client needs a different naming rule, one target needs a different exporter, and one stage needs timing. Composition keeps those variations flat. A class hierarchy can still be appropriate when there is a genuine substitutable family with shared invariants, but a forest of feature-combination subclasses is a maintenance warning.

## Key Takeaways

1. **Inheritance**: overrides reuse behavior, and `super()` follows the MRO.
2. **Contracts**: ABCs are nominal; protocols and duck typing focus on required behavior.
3. **Composition**: pass small collaborators into a pipeline to keep variation replaceable.
4. **Multiple inheritance**: useful for disciplined mixins, advanced by default, and not a substitute for ordinary composition.

