# Lesson 01: How Python Runs and How Projects Start

## The Big Picture

Imagine a small asset-processing studio. An artist hands a tool a folder, the tool examines files, and another tool consumes the results. For that studio to work, it is not enough for the code to be “correct.” Everyone needs the same interpreter, dependencies, startup command, and definition of success. Python's runtime model and project conventions are the foundation of that contract.

## From Source to a Running Process

For a familiar comparison, think of CPython as having a role similar to the CLR or JVM. Python source lives in `.py` modules. CPython commonly parses and compiles those modules to bytecode, then executes the bytecode in its runtime. It may cache imported-module bytecode in `__pycache__`, but that cache is an implementation detail, not a portable executable. Other Python implementations can make different choices, so the precise bytecode format is not the thing to build your pipeline around.

The useful mechanic is simple: when you run `python tool.py`, the interpreter creates a process, loads the module, and executes its top-level statements. If you run `python -m package.tool`, Python resolves the module through the package import system and runs it as the command-line module. That `-m` form is often a good way to make package-relative behavior predictable.

## Modules, Packages, and Entry Points

A module is an importable Python file. A package is an import namespace containing one or more modules. A distribution is the installable project artifact, which may contain several packages. These words are easy to blur together, much like confusing a C# namespace, assembly, and class. Keeping them separate makes project layout and deployment conversations clearer.

Python does not require every program to have a method named `Main`. A common entry-point pattern defines reusable functions, defines `main()`, and then uses `if __name__ == "__main__":` to call it. When the file is run directly, that condition is true. When another module imports it, the module gets its import name and the startup block does not run. Here is the surprise: importing a module executes its top-level statements the first time in that process. Put expensive scans, command-line parsing, and side effects behind functions and the main guard.

## Environments and Project Metadata

A virtual environment is like a project-specific tool locker. It prevents one course or pipeline from silently using another project's installed packages. `uv` is a tool that can create environments, resolve dependencies, and run commands inside the selected project context. It is convenient, but it is not part of the Python language.

In a new project, commands such as `uv init`, `uv venv`, `uv add rich`, and `uv run python -m asset_audit` express the workflow. The important artifact is `pyproject.toml`: it records project metadata and declared dependencies. The local `.venv` is environment state and is normally excluded from version control. For a technical artist, this is the difference between a documented converter and a mysterious script that only works on one workstation.

## Streams and Exit Codes

Now picture a tool connected to a conveyor belt. Standard output is the box of results handed to the next station. Standard error is the warning light for a human or log collector. The exit code is the green or red status beacon. Python's `print()` writes to stdout by default; `print(..., file=sys.stderr)` writes a diagnostic to stderr. `raise SystemExit(0)` ends successfully, while a non-zero code communicates failure.

That distinction matters when a C# editor, CI job, or Python parent process launches an external tool. A validator can print machine-readable findings to stdout, reserve stderr for diagnostics, and return `2` for invalid command-line usage. This is much easier to automate than scraping a mixture of prose and errors from one stream.

## Key Takeaways

1. **Runtime**: CPython commonly compiles source to bytecode and executes it in its runtime; details are implementation-specific.
2. **Imports**: Modules are executable namespaces, so protect startup work with the main guard.
3. **Projects**: Virtual environments isolate dependencies, while `pyproject.toml` describes the project.
4. **Automation**: stdout, stderr, and exit codes form a small but powerful process contract.

