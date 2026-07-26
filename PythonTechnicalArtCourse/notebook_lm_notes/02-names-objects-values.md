# Lesson 02: Names, Objects, Values, and Types

## The Big Picture

Here is a useful studio analogy: a Python name is a label attached to an object, not a permanent box with a built-in type. You might put a label called `files` on a list, attach a second label called `pending` to that same list, and later move the `files` label to a completely different object. That picture explains Python assignment more reliably than trying to translate every line into a C# local variable.

## Binding and Mutation

When Python evaluates `files = ["hero.fbx"]`, it creates a list object and binds the name `files` to it. If `alias = files`, both names refer to the same list. Calling `alias.append("tree.fbx")` mutates that shared object, so `files` sees the new item too. If you then write `files = ["camera.fbx"]`, only the name `files` is rebound. The old list still exists as long as `alias` refers to it.

This is comparable to sharing a reference-type object in C#, but Python makes the object-and-name model especially visible. Strings and tuples are immutable: an operation that appears to change one produces another object. Lists, dictionaries, and sets are mutable. Lists preserve order and are useful for work queues. Dictionaries hold key-value metadata. Sets hold unique members and are useful for membership checks, but their iteration order is not a sequence contract you should use for output.

One Python surprise is `+=`. For a list it commonly extends the existing list. For an immutable string or tuple it produces a new object and rebinds the name. Always ask two questions: what type is this object, and does this operation mutate it or return a replacement?

## None, Truthiness, Identity, and Equality

`None` means that a value is absent or not available. It is different from an empty list, an empty string, and zero. Python also lets objects participate in conditions through truthiness. `None`, `False`, zero, and empty built-in collections are falsey; most other values are truthy. Therefore `if not files` can mean “the collection is empty,” while `if result is None` specifically means “no result was returned.”

Use `==` for value equality and `is` for identity. Two separately created lists can compare equal while being different objects. The standard missing-value spelling is `result is None`, not `result == None`. Identity asks whether the references point to the same object; equality asks whether the objects compare as equivalent.

## Dynamic Typing and Classes

Python is dynamically typed. The runtime checks whether an operation is valid when it executes, and a name can later refer to another type. Type hints such as `count: int` or `-> str` document intent and help editors and static analyzers, but ordinary Python does not automatically enforce them. This is like using a C# interface or type declaration as a design contract, except the default runtime behavior is more permissive.

Classes introduce a structured way to create objects. A class called `AssetRecord` can define `__init__`, which initializes each instance, and a method such as `add_tag`. The first method parameter is conventionally named `self`; it is the instance receiving the call. When you write `record.add_tag("environment")`, Python supplies `record` as `self` behind the scenes. Instance attributes such as `self.path` and `self.tags` belong to one record. A class attribute such as `category = "unclassified"` is a shared lookup default, and an instance assignment can shadow it for one record.

The dangerous version is a mutable class attribute, such as `tags = []` at class scope. That creates one list shared by every instance. Put per-instance mutable state in `__init__`, so every asset record receives a fresh list. For technical-art tooling, this distinction is the difference between one asset accumulating another asset's tags and each record remaining independent.

## Key Takeaways

1. **Names**: assignment binds or rebinds names; mutation changes the object they reference.
2. **Values**: strings and tuples are immutable, while lists, dictionaries, and sets are mutable.
3. **Checks**: use `is None` for absence, `==` for value equality, and truthiness deliberately.
4. **Classes**: `self` identifies the instance; keep per-instance state on the instance, not in mutable class attributes.

