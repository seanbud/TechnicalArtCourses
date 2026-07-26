# Lesson 07: Reliable Tools and Automation

## The Big Picture

Think of an automation tool as a production worker handing a job to the next station. It needs a clear input, a useful result, a warning channel, and a reliable indication of failure. Python exceptions handle failures inside the program; stdout, stderr, and exit codes communicate across the process boundary. The goal is not to hide errors. It is to classify and report them so an artist or CI system can act.

## Exceptions and Tracebacks

A traceback is a route map showing where an exception propagated. Catch the narrowest exception that you can genuinely handle. If a manifest field is missing or cannot be converted to an integer, catch those parsing errors and raise a domain-specific `ConversionError` with the original exception as its cause. `raise ... from error` preserves the useful lower-level detail while giving callers a meaningful pipeline vocabulary.

The `else` block of a `try` runs only when the protected code succeeds. `finally` runs whether the code succeeds or raises, so it is appropriate for unconditional cleanup or a small status action. It is not a reason to return success after failure. A broad `except Exception` can be reasonable at a top-level boundary where you log the traceback and return a non-zero status, but it is usually too broad for local recovery.

## CLI Contracts

`sys.argv` gives you raw strings and is fine for a tiny one-option script. `argparse` adds named arguments, conversion, help text, and consistent usage errors. A technical-art converter might require a source path and output path, then offer a `--dry-run` flag. Keep normal results on stdout, diagnostics on stderr, and return a non-zero exit code for invalid input or failed conversion.

That design lets a C# editor, a CI runner, or another Python process launch the tool without scraping human prose. It also forces you to define the working directory and path rules. A relative path is relative to the process's current working directory, not necessarily the directory containing the script.

## Subprocesses and External Tools

Launching a DCC or converter is like sending a package to another workshop. `subprocess.run` starts a child process and waits for completion by default. `Popen` gives you a handle for longer-lived or interactive control. Passing a list of arguments avoids shell parsing and is the safer default. `shell=True` changes the interpretation and should be deliberate, especially when any input is user-controlled.

Capture stdout and stderr separately, inspect the return code, and set a timeout where an external tool could hang. The caveat is important: a timeout stops your wait and raises an exception, but it does not promise that every descendant process has disappeared. Child-process trees and termination behavior vary across operating systems and tools. Treat process cleanup as a tested platform concern, not a universal Python guarantee.

## Packaging and Technical-Art Delivery

A deliverable is more than source. It includes `pyproject.toml`, dependency declarations, the interpreter choice, configuration, external executable requirements, working-directory assumptions, and a repeatable invocation. A wheel, source distribution, virtual environment, standalone bundle, or container may be appropriate depending on the studio's policy and native dependencies. Packaging does not remove the need to validate DCC installations, licenses, permissions, environment variables, or platform-specific paths.

## Key Takeaways

1. **Exceptions**: catch narrowly, preserve causes, and use cleanup deliberately.
2. **CLI**: separate arguments, stdout, stderr, and exit status so tools compose.
3. **Subprocess**: `run` waits by default, but descendant lifecycle behavior is platform- and tool-dependent.
4. **Delivery**: package dependencies and external-tool assumptions with the code.

