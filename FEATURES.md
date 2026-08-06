# FEATURES — 2DAnimator backlog

> **Note:** No saved copy of our prior backlog discussion was available in this
> project's knowledge, so this backlog is reconstructed from the project vision
> (Manim-based, plain-language → ≤60s explainer with voiceover + editing layer).
> Correct or reorder anything that doesn't match what we discussed.

Legend: **P0** must-have for MVP · **P1** fast-follow · **P2** later.

## Generation pipeline

- **[P0] Prompt intake** — plain-language concept box with example prompts and
  length/target-audience hints.
- **[P0] Narration script generation** — LLM turns the concept into a structured,
  timed narration script (the source of truth for scenes + voiceover).
- **[P0] Manim scene codegen** — LLM generates Manim scene code from the script,
  constrained by injected scene templates and a safe API surface.
- **[P0] Sandboxed render** — run generated code in the Docker sandbox; return MP4
  or a structured error.
- **[P0] Voiceover (TTS)** — synthesize narration audio and mux with video.
- **[P0] Job status + progress streaming** — per-stage progress over WebSocket
  (script → render → voiceover → done).
- **[P1] Codegen self-repair** — on render failure, feed the error back to the LLM
  and retry N times before surfacing to the user.
- **[P1] Voice + pacing controls** — pick voice, speed, and language.
- **[P2] Style presets** — theme/color/font palettes for a consistent look.
- **[P2] Auto background music** — optional royalty-free bed under narration.

## Editing layer

- **[P0] Scene timeline** — see generated scenes as blocks; scrub and preview.
- **[P0] Re-prompt a single scene** — regenerate one scene without redoing the
  whole video.
- **[P1] Edit narration text inline** — change wording; re-run TTS for that scene
  only.
- **[P1] Reorder / trim / delete scenes** — drag on the timeline; adjust durations.
- **[P1] Manual timing tweaks** — nudge when elements appear relative to narration.
- **[P2] Direct Manim code editing** — power-user escape hatch with live re-render.
- **[P2] Version history** — snapshot and revert edits.

## Playback, export & sharing

- **[P0] In-app player** — play the muxed result with captions.
- **[P0] Download MP4** — export the finished video.
- **[P1] Auto captions / subtitles** — burned-in or sidecar `.srt` from the script.
- **[P1] Shareable link** — public/unlisted URL to a rendered video.
- **[P2] Export formats & aspect ratios** — 16:9, 9:16 (shorts), 1:1; GIF export.

## Accounts, projects & infra

- **[P0] Auth & user accounts** — sign in; own your projects.
- **[P0] Project persistence** — save prompts, scenes, edits, and renders.
- **[P1] Render queue & quotas** — fair scheduling, per-user limits, cost guards.
- **[P1] Sandbox hardening** — enforce no-network, CPU/mem/time caps, output size
  limits; audit generated code.
- **[P1] Observability** — per-stage timing, failure rates, render logs.
- **[P2] Team workspaces** — shared projects and roles.
- **[P2] Asset storage / CDN** — served renders with signed URLs and expiry.

## Stretch

- **[P2] Template gallery** — start from an existing explainer and adapt it.
- **[P2] Interactive concept refinement** — clarifying Q&A before generating.
- **[P2] Multi-language dubbing** — one script, several voiceover languages.
