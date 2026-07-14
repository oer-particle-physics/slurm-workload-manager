# Slurm Workload Manager

This repository contains a hands-on course for researchers who are comfortable
with a Linux shell but new to the Slurm workload manager. The required path
takes learners from discovering a cluster's local policy to submitting,
diagnosing, tuning, and scaling a small workload with a throttled job array.

The lesson is designed to be portable across Slurm clusters. Site-specific
partition names, accounts, storage paths, and interactive policies are kept in
a separate checklist rather than embedded in the examples.

## Preview the lesson

Install [Hugo Extended](https://gohugo.io/installation/) and run:

```bash
hugo server
```

The shared layouts are vendored under `_vendor/`, so a normal local build does
not need Go or network access.

## Course structure

- five required, cumulative episodes (about 2 hours 15 minutes)
- three optional extensions on campaigns, scheduling, and parallel hardware
- learner setup and downloadable starter files
- instructor notes with pacing and cluster-adaptation guidance
- generated all-in-one, key-points, glossary, and external-link pages

## Maintainer

Clemens Lange

## Licence

The lesson is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
