+++
title = "Instructor Notes"
weight = 10
audience = "instructor"
+++

## Course Contract

The required path is designed for researchers who can already use SSH and a
Linux shell but are new to Slurm. It deliberately does not require MPI, GPUs,
containers, administrator privileges, or PSI infrastructure.

The five core episodes total approximately 2 hours 15 minutes:

| Episode | Teaching | Exercises |
|---|---:|---:|
| How Slurm and Your Cluster Work | 15 min | 10 min |
| First Batch and Interactive Jobs | 15 min | 10 min |
| Monitoring, Control, and Diagnosis | 15 min | 10 min |
| Resource Requests and Efficient Use | 20 min | 10 min |
| Scaling with Job Arrays | 15 min | 15 min |

Queue latency, account troubleshooting, and breaks can extend a live session.
The three extension episodes are better suited to a half-day workshop or
self-study.

## Adapt the Site Layer Before Teaching

Do not ask learners to infer submission policy during the first exercise. At
least one week before the course, validate:

- a short CPU partition suitable for many brief training jobs
- required account, QoS, and reservation values
- maximum submission and running-job limits
- whether `salloc` plus `srun --pty bash` is permitted or a wrapper is required
- a shared working path visible from login and compute nodes
- whether Python 3.9+ is available directly or through a module
- whether `sacct` exposes `TotalCPU`, `ReqMem`, and `MaxRSS` to users
- whether `squeue --me` is supported; otherwise teach `squeue -u "$USER"`
- whether the eight-element, `%2` array is within local policy

Provide a tested `site-settings.sh` containing only the options learners need.
Keep local storage paths and software commands in a short site note. Do not
edit the portable scripts to hide required local options.

For a PSI delivery, validate the current CMS Tier-3 or Merlin documentation
rather than relying on names in historical examples. Partition, account, and
storage policy can change independently of this lesson.

## The Cumulative Exercise

Learners use the same `particle_demo.py` workload throughout:

1. Setup runs a tiny login-node check.
1. The first script runs one labelled sample under Slurm.
1. A misspelled option creates a deterministic failure and then a repaired job.
1. A four-worker job connects `--cpus-per-task` to application concurrency;
   a one-worker comparison demonstrates over-requesting.
1. The input list becomes a throttled array with per-element logs and selective
   recovery.

The program intentionally does no real physics. It allocates a controlled
amount of memory, performs deterministic CPU work for approximately a requested
duration, and records job metadata in JSON. This keeps the Slurm concepts
visible and avoids external data or packages.

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

- After cluster discovery, resolve every learner's site settings before
  continuing.
- Ask for job IDs whenever learners discuss evidence; job names are not unique.
- If jobs finish too quickly for `squeue`, move directly to `sacct` and explain
  the lifecycle transition.
- If jobs remain pending, use prepared accounting output for the teaching point
  while leaving the real job queued for later inspection.
- Debrief resource exercises using patterns and uncertainty, not an expected
  exact efficiency percentage.
- In the array episode, treat `JobArrayTaskLimit` as evidence that `%2` works.

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
: Resource allocation does not configure application concurrency. Compare
  `SLURM_CPUS_PER_TASK`, the result's `workers` field, and the application
  command.

**Array task reads the wrong input**
: Check zero- versus one-based indexing, range/list length, blank lines, and the
  use of `SLURM_ARRAY_TASK_ID` rather than numeric job-ID ordering.

**Interactive shell is still on the login node**
: `salloc` may grant an allocation without moving the shell. Use the site's
  supported `srun --pty` step or wrapper, and inspect `hostname` and
  `SLURM_JOB_ID`.

## Safety and Shared-System Practice

- Keep the demonstration memory and duration small.
- Do not create an intentional out-of-memory job; the invalid application
  option provides a safe deterministic failure.
- Never demonstrate submission storms or tight polling loops against a live
  controller.
- Use a `%2` throttle even though the training array is small.
- Cancel stale training jobs and interactive allocations at the end.
- Avoid hardcoded node-local paths; only demonstrate staging after validating
  site policy.

## Teaching the Extensions

**Efficient Campaigns**
: Emphasise the trade-off: bundling reduces job records but transfers
  concurrency, logging, and recovery to the script. The `xargs -P` example is
  a transparent demonstration, not a universal production runner.

**Scheduler Mechanics**
: Explain observed behaviour without inviting learners to game priority.
  `sprio`, `sshare`, and `sacctmgr` may be restricted or irrelevant under the
  local plugin configuration.

**Parallel Hardware Orientation**
: Keep this conceptual unless the course has a tested MPI environment or GPU
  reservation. Site MPI launch and GPU request syntax must be verified locally.

## Completion Evidence

A learner has achieved the core goals when they can show:

- a locally appropriate site-settings file
- a successful serial job with traceable logs and result
- a failed and repaired attempt diagnosed from state, exit code, and error log
- an accounting-based revision to time, CPU, or memory with stated headroom
- a completed `0-7%2` array with distinct logs/results
- a selected array element cancelled or failed and then resubmitted alone

The final discussion should connect these artefacts into one workflow rather
than treating the episode exercises as isolated command drills.
