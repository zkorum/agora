---
name: test-lifecycle
description: Choose how to verify a change, decide which tests to keep, and make production code easier to test. Use when adding, rewriting, removing, or auditing tests, or refactoring for testability.
---

# Test lifecycle

**Verify the change now. Decide separately what future maintainers should
inherit.** There is no required test-first workflow.

1. **Verify locally.** Start with an existing check if it answers the question.
   Otherwise, use a scratch test, script, or browser probe with synthetic data.
   Scratch checks can inspect internals or compare intermediate results. Prefer
   `.local/` or a session temporary directory, and leave scratch files out of
   the final diff. Report what ran and what couldn't be verified.
2. **Choose the smallest boundary that can expose the failure.** Use a pure
   function for a domain decision, the real route for HTTP behavior, PostgreSQL
   for locks or constraints, and the browser for focus or navigation. If setup
   is cumbersome, ask whether separating decisions from I/O, time, or
   randomness would also make the production code clearer. Don't expose private
   helpers or add abstractions solely for tests.
3. **Keep only what earns its place.** A retained test, fixture, or helper is
   maintained source code. Name the important behavior it protects, use an
   independent expectation, and make the inputs that matter easy to see. Avoid
   duplicating coverage or asserting incidental details. For an important
   regression test, check that it catches the intended failure when practical.
   Before removing an existing test, identify what still protects the behavior
   or why it no longer needs protection.

For example, test **which items belong in a comparison task** without checking
their shuffled order. Conversely, keep real PostgreSQL in a publication-lock
test: replacing it with a fake removes the behavior the test is meant to prove.
