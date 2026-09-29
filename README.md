# Slurm Workload Manager

This repository contains a hands-on course for researchers who are comfortable
with a Linux shell but new to the Slurm workload manager. The required path
takes learners from finding their cluster's settings to submitting jobs,
diagnosing failures, and adjusting resource requests. It ends with a job array
that processes multiple inputs while limiting how many jobs run at once.

The lesson can be used on different Slurm clusters. Setup checks access and
prepares the starter files. In episode 1, learners put their partition, account,
and other submission options in `site-settings.sh` and record storage paths
and interactive-job instructions in a short site note.

## Preview the lesson

Install [Hugo Extended](https://gohugo.io/installation/) and run:

```bash
hugo server
```

The shared layouts are vendored under `_vendor/`, so a normal local build does
not need Go or network access.

## Course structure

- six core episodes that build on each other (about 2 hours 50 minutes)
- two optional extensions on efficient campaigns and scheduler mechanics
- learner setup and downloadable starter files
- instructor notes with pacing and cluster-adaptation guidance
- generated all-in-one, key-points, glossary, and external-link pages

The interactive episode can be skipped where the cluster does not support
interactive access. The remaining core episodes take about 2 hours 30 minutes.

## Writing examples

Provide the programs and inputs needed by every runnable example, together
with submission commands and a way to check the result. Put complete worked
exercise solutions in expandable solution sections. Offer longer scripts as
downloads under `static/files/slurm-course/`.

Choose code for the main text according to the learning objective. Show and
explain the lines learners need to understand, including relevant excerpts
from downloadable scripts. Routine parsing, file handling, or repeated setup
can stay in the download when it adds no teaching value; explain the script's
inputs, behaviour, and expected outputs. A download does not automatically
need an inline listing. Label excerpts, link to the complete file, and keep
displayed code in sync. Make clear when a command is being explained and
when learners should run it. Explain how to obtain local settings rather than
inventing site values.

Use official Slurm documentation for Slurm behaviour and publicly accessible
PSI Tier-3 documentation for PSI examples. Learner-facing explanations should
be self-contained and link to these sources, without depending on unpublished
slides or internal documentation.

## Maintainer

Clemens Lange

## Licence

The lesson is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
