# Render sandbox

A locked-down Docker image that executes generated Manim code. The worker
launches one throwaway container per job with `--network=none`, a read-only
code mount, a writable output volume, and CPU/memory/time limits. This is the
only place untrusted code runs.
