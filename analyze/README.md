# Benchmark Baseline

This folder captures the current performance baseline before core library refactors.

## Current State

- Runtime target is Node `24`.
- Tests are green on this branch (`npm test`).
- Benchmark harness compares:
  - `CurrentRLL` (current library implementation)
  - `LegacyBytewise` (baseline-compatible byte-at-a-time strategy)
  - `ChunkedReverse` (candidate optimized reverse-chunk strategy)
  - `SplitSlice` (full-file read + split/slice approach)
  - `tail` (system CLI reference, when available)

## Latest Quick Baseline

Run used:

```bash
RLL_BENCHMARK_PROFILE=quick RLL_BENCHMARK_ITERATIONS=2 npm run analyze
```

Generated artifacts:

- `benchmark/results/report-2026-02-13T00-55-29-045Z.json`
- `benchmark/results/report-2026-02-13T00-55-29-045Z.md`

Observed trend:

- Small files: `SplitSlice` is generally fastest.
- Larger files / small tail reads: `ChunkedReverse` is significantly faster.
- `CurrentRLL` is consistently slower in this baseline.

## Full Baseline

- Run used:
  - `RLL_BENCHMARK_PROFILE=full RLL_BENCHMARK_ITERATIONS=5 npm run analyze`
- Generated artifacts:
  - `benchmark/results/report-2026-02-14T02-41-15-947Z.json`
  - `benchmark/results/report-2026-02-14T02-41-15-947Z.md`
- Summary:
  - Small files winner: `SplitSlice` is usually fastest; `ChunkedReverse` is often a close second.
  - Medium files winner: `ChunkedReverse` dominates most scenarios; `tail` is generally second.
  - Large files winner: `ChunkedReverse` consistently wins by a large margin.
  - Timeout notes: timeout guard now prevents hangs. In full runs, `CurrentRLL`/`LegacyBytewise` time out in larger scenarios; `SplitSlice` also times out on very large files and larger line-count requests.
  - CurrentRLL delta notes: `CurrentRLL` is consistently slower and becomes non-viable at larger scales in this baseline.

## How To Run

1. Ensure benchmark fixtures exist:

```bash
npm run analyze:make-files
```

2. Run quick profile:

```bash
RLL_BENCHMARK_PROFILE=quick RLL_BENCHMARK_ITERATIONS=2 npm run analyze
```

3. Run full profile:

```bash
RLL_BENCHMARK_PROFILE=full RLL_BENCHMARK_ITERATIONS=5 npm run analyze
```

Per-strategy timeout is enabled by default to prevent hangs on large scenarios:

```bash
RLL_BENCHMARK_CASE_TIMEOUT_MS=60000 npm run analyze
```

Reports are written to `benchmark/results/` as timestamped JSON + Markdown files and also as `latest.json` / `latest.md`.
