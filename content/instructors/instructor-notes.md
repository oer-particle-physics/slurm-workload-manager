+++
title = "Instructor Notes"
weight = 10
audience = "instructor"
+++

## Course Plan {#course-contract}

Ask learners to complete [Setup]({{< relref "/learners/setup" >}}) before the
course so cluster access, software, and starter files are ready. Episode 1
guides them through cluster discovery and completing `site-settings.sh`;
episode 2 uses those settings for the first submission.

Teach how Slurm manages jobs across different clusters, and give learners
repeated practice finding their site's rules and interpreting job output.

The six core episodes total approximately 2 hours 45 minutes:

| Episode | Teaching | Exercises |
|---|---:|---:|
| How Slurm and Your Cluster Work | 20 min | 15 min |
| First Batch Job | 15 min | 10 min |
| Monitoring, Control, and Diagnosis | 15 min | 10 min |
| Interactive Work on Compute Nodes | 10 min | 10 min |
| Resource Requests and Efficient Use | 20 min | 10 min |
| Scaling with Job Arrays | 15 min | 15 min |

Waiting for jobs to start, resolving account problems, and taking breaks can
extend a live session. Where interactive access is unavailable, skip that episode;
the other five episodes total approximately 2 hours 25 minutes.

The two extension episodes are better suited to a half-day workshop or
self-study.

## Prepare the Cluster Settings Before Teaching {#adapt-the-site-layer-before-teaching}

Prepare the settings before the course so learners can use and interpret them
during episode 1.
At least one week before the course, check:

- a short CPU partition suitable for many brief training jobs
- required account, QoS, and reservation values
- maximum submission and running-job limits
- whether `salloc` plus `srun --pty bash` is permitted or a wrapper is required
- a shared working path visible from login and compute nodes
- whether Python 3.9+ is available directly or through a module
- whether `sacct` exposes `TotalCPU`, `ReqMem`, and `MaxRSS` to users
- whether `squeue --me` is supported; otherwise teach `squeue -u "$USER"`
- whether the site allows the eight-element array with at most two jobs running at once

Provide a tested `site-settings.sh` containing only the options learners need.
Keep local storage paths and software commands in a short site note. Do not
hide required cluster options inside the exercise scripts.

The episode 1 timing assumes these local details are available. Learners can
compare the supplied settings with command output without having to resolve
account access during class. For self-study, the same steps guide learners
through filling in the template from their site's documentation.

For a PSI Tier-3 delivery, use the
[Slurm usage guide](https://tier3.pages.psi.ch/batch-jobs/SlurmUsage/) and
[storage guide](https://tier3.pages.psi.ch/storage/Tier3Storage/).
Recheck current partition, account, and storage rules before each delivery;
these can change independently of this lesson.

## How the Exercises Build on Each Other {#the-cumulative-exercise}

Learners use the same `particle_demo.py` workload throughout:

1. Setup runs a tiny login-node check.
1. Cluster discovery produces a settings file and site note for later jobs.
1. The first script runs one labelled sample under Slurm.
1. A misspelled option makes the program fail; learners find the error and fix it.
1. An interactive session checks the compute-node environment, runs a small
   test, and ends with verified release of the allocation.
1. A four-worker job connects `--cpus-per-task` to the number of application
   workers; a one-worker comparison shows what happens when CPUs go unused.
1. The input list becomes an array with at most two jobs running at once,
   separate logs for each element, and reruns of only unsuccessful elements.

The program intentionally does no real physics. It allocates a controlled
amount of memory, repeats a CPU calculation for approximately the requested
duration, and records details such as the job ID and worker count in JSON.
This keeps the focus on Slurm without requiring external data or packages.

## Suggested Live Flow

### Before learners arrive

- Put the starter files in an accessible location in case outbound `curl` is
  blocked.
- Create one completed serial job, one failed job, one completed four-worker
  job, and one completed array.
- Save representative `squeue`, `scontrol show job`, and `sacct` output.
- Confirm that the log directory exists before each prepared submission.
- Test the learner account type, not only an administrator account.

### During the core path

- At the end of episode 1, check that every learner can load their settings
  and has recorded the remaining local details before continuing.
- Ask for job IDs whenever learners discuss evidence; job names are not unique.
- If jobs finish too quickly for `squeue`, move directly to `sacct` and explain
  that completed jobs are found in the accounting records.
- If jobs remain pending, use prepared accounting output for the teaching point
  while leaving the real job queued for later inspection.
- In the interactive episode, check hostnames at each shell transition and
  confirm that learners have released their allocations before continuing.
- Debrief resource exercises using patterns and uncertainty, not an expected
  exact efficiency percentage.
- In the array episode, treat `JobArrayTaskLimit` as evidence that `%2` works.
- In the recovery exercise, check the held array before and after cancelling
  index 7, then release the remaining elements. Do not require a separate
  `CANCELLED` accounting row for an element cancelled before it started.

## Common Trouble Spots

**Log path does not exist**
: Slurm opens output/error paths before the script body runs. Create `logs/`
  before submission.

**`#SBATCH` contains a shell variable**
: Directives are parsed by Slurm, not expanded by Bash. Use `%j`, `%A`, `%a`,
  or a command-line option.

**Job vanished from `squeue`**
: It probably reached a final state. Check `sacct`; disappearance is not proof
  of success.

**Top-level `MaxRSS` is blank**
: Inspect `.batch` and `srun` step rows. Accounting plugins and sampling differ
  by site, and very short jobs may have sparse measurements.

**Four CPUs but one worker**
: Requesting CPUs does not set the program's worker count. Compare
  `SLURM_CPUS_PER_TASK`, the result's `workers` field, and the application
  command.

**Array task reads the wrong input**
: Check zero- versus one-based indexing, range/list length, blank lines, and the
  use of `SLURM_ARRAY_TASK_ID` rather than numeric job-ID ordering.

**A cancelled array element has no accounting row**
: Slurm can remove an element from a group of pending tasks without creating
  an individual accounting record. Use the recorded cancellation target and
  queue checks as evidence. A result file may belong to an earlier run;
  compare its job ID with `JobIDRaw` for the successful attempt.

**Interactive shell is still on the login node**
: `salloc` may grant an allocation without moving the shell. Use the site's
  supported `srun --pty` step or wrapper, and inspect `hostname` and
  `SLURM_JOB_ID`.

## Safety and Shared-System Practice

- Keep the demonstration memory and duration small.
- Do not create an intentional out-of-memory job; the invalid application
  option reliably causes a failure without exhausting memory.
- Avoid scripts that submit many jobs in rapid succession or query job status
  repeatedly without a pause.
- Use `%2` to limit the array to two simultaneous jobs, even for the small example.
- Cancel stale training jobs and interactive allocations at the end.
- Check the site's storage paths and cleanup rules before demonstrating how
  to copy input and output files to and from node-local storage.

## Teaching the Extensions

**Efficient Campaigns**
: Grouping commands into fewer jobs gives Slurm less work to manage. The script
  must then limit simultaneous commands, keep their logs, and handle failures.
  Use `xargs -P` to demonstrate this, and discuss what a script needs before it
  can reliably process a large dataset. The dependency exercise then submits
  a held bundle and a dependent summary, inspects their relationship, releases
  the bundle, and verifies both jobs and the summary report. The complete
  scripts and result-checking helper are downloadable from the episode.
  Ensure learners use the bundle's job-specific result directory and release
  or cancel held jobs before leaving the exercise.
  Distinguish finishing one input sooner from processing more inputs per hour.
  The array and bundle examples use different concurrency limits and work
  durations; their runtimes do not measure the performance benefit of bundling.

**Scheduler Mechanics**
: Explain observed behaviour without inviting learners to game priority.
  `sprio`, `sshare`, and `sacctmgr` may be restricted or irrelevant under the
  local plugin configuration.

## Completion Evidence

A learner has achieved the core goals when they can show:

- a locally appropriate site-settings file
- a successful serial job with traceable logs and result
- a failed and repaired attempt diagnosed from state, exit code, and error log
- an interactive test on a compute node and a released allocation, where
  interactive access is available
- revised time, CPU, or memory requests based on measurements, with an
  explanation of any extra time or memory allowed for variation
- a completed `0-7%2` array with distinct logs/results
- a selected array element cancelled or failed and then resubmitted alone

In the final discussion, ask learners to explain how they chose their requests,
checked the results, and decided what to change for the next run.
