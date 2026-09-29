+++
title = "Monitoring, Control, and Diagnosis"
weight = 30
teaching = 15
exercises = 10
questions = [
  "How can I tell whether a job is pending, running, completed, or failed?",
  "What does a pending reason tell me?",
  "How do I inspect, cancel, and diagnose a job?"
]
objectives = [
  "Filter and format `squeue` output for your own jobs.",
  "Use pending reasons and `scontrol show job` to investigate a queued job.",
  "Cancel a pending or running job deliberately.",
  "Use `sacct`, job logs, state, and exit code to diagnose a completed job."
]
keypoints = [
  "Use `squeue` for pending and running work and `sacct` to look up job records, including after a job finishes.",
  "A pending reason describes the condition currently preventing a start; it is not a promise of start order or time.",
  "To investigate a job, check its ID, state, reason or exit code, requested resources, and both output and error logs.",
  "Cancel work you no longer need with `scancel` and confirm the resulting state."
]
+++

After submitting a job, check whether it ran, whether it produced the intended
result, and whether its time, CPU, or memory request needs to change next time.

Two commands provide complementary views:

- `squeue` shows jobs currently known to the scheduler, normally pending and
  running work.
- `sacct` reads accounting records for running and completed jobs and job
  steps.

## Read Your Queue

Submit `first-job.sh` again if you have no active job, then run:

```bash
squeue --me
```

For a more informative, repeatable layout:

```bash
squeue --me -o "%.18i %.12P %.24j %.2t %.10M %.6D %R"
```

The final two fields are especially useful:

- `%t` is the compact job state, such as `PD` (pending) or `R` (running).
- `%R` is the pending reason, or the node list after the job starts.

Common states include:

| Short | Long state | Meaning |
|---|---|---|
| `PD` | `PENDING` | Waiting for scheduling or another condition |
| `R` | `RUNNING` | Has an allocation and is executing |
| `CD` | `COMPLETED` | Finished with exit code zero |
| `F` | `FAILED` | Finished unsuccessfully |
| `CA` | `CANCELLED` | Cancelled by a user or system action |
| `TO` | `TIMEOUT` | Reached its time limit |
| `OOM` | `OUT_OF_MEMORY` | Detected as exceeding available/allocated memory |

The complete definitions live in the official
[Job State Codes](https://slurm.schedmd.com/job_state_codes.html) page.

## Understand Pending Reasons

A pending job's reason answers “what condition prevented this job from starting
when it was considered?” Examples include:

| Reason | Interpretation |
|---|---|
| `Priority` | Other jobs are ahead of this job under Slurm's priority rules |
| `Resources` | The requested resource combination is not currently available |
| `Dependency` | A prerequisite job or condition is not yet satisfied |
| `JobArrayTaskLimit` | The array already has as many running jobs as its limit allows |
| `PartitionTimeLimit` | The requested walltime exceeds the partition limit |
| `InvalidAccount` or `InvalidQOS` | The requested account or QoS is not valid for this job |

Only one reason may be displayed even when several conditions apply, and the
reason can change when Slurm next checks the queue. `Priority` and `Resources`
do not mean that the cluster is broken. They also do not provide a guaranteed
start time.

See the official [Job Reason Codes](https://slurm.schedmd.com/job_reason_codes.html)
page when a reason is unfamiliar.

Inspect one job in detail:

```bash
scontrol show job "$JOB_ID"
```

Look for `JobState`, `Reason`, `Partition`, `Account`, `QOS`, `TimeLimit`,
`NumCPUs`, `ReqTRES`, `WorkDir`, `StdOut`, and `StdErr`. The exact fields vary
with Slurm version and configuration.

{{< callout type="note" title="Allow time between status checks" >}}
Commands such as `squeue`, `sacct`, and `scontrol` query shared Slurm services.
Refresh manually while learning. Automated monitoring should use a sensible
interval and site guidance rather than issuing requests several times per
second.
{{< /callout >}}

## Cancel Work Deliberately

Create a harmless two-minute sleep job directly with `--wrap`:

```bash
source site-settings.sh
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" \
  --job-name=cancel-me \
  --time=00:03:00 \
  --ntasks=1 \
  --cpus-per-task=1 \
  --mem=64M \
  --output=logs/%x-%j.out \
  --error=logs/%x-%j.err \
  --wrap='srun sleep 120')
CANCEL_ID=${submission%%;*}
echo "$CANCEL_ID"
```

`--parsable` makes `sbatch` return an easy-to-capture identifier. On a
multi-cluster setup the response can include `;cluster`, so the parameter
expansion keeps the numeric job ID.

Cancel it whether it is pending or running:

```bash
scancel "$CANCEL_ID"
```

It may disappear from `squeue` quickly. Check its recorded state with:

```bash
sacct -j "$CANCEL_ID" --format=JobID,JobName,State,ExitCode,Elapsed
```

You should see `CANCELLED`, although accounting updates can take a short time.

## Create and Diagnose a Real Failure

Copy `first-job.sh` to `diagnose-job.sh`, change its job name to
`particle-diagnose`:

```bash
#SBATCH --job-name=particle-diagnose
```

and deliberately misspell one application option:

```bash
srun python3 particle_demo.py \
  --sample diagnosis \
  --seconds 4 \
  --memory-mb 64 \
  --output results/diagnosis.json
```

Submit it and capture the ID:

```bash
source site-settings.sh
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" diagnose-job.sh)
DIAGNOSE_ID=${submission%%;*}
echo "$DIAGNOSE_ID"
```

After it leaves `squeue`, request a focused accounting view:

```bash
sacct -j "$DIAGNOSE_ID" \
  --format=JobID,JobName%20,State,ExitCode,Elapsed,ReqMem,MaxRSS
```

A typical record has a row for the job and rows such as `.batch`, `.extern`,
or a numbered `srun` step. Usage measurements such as `MaxRSS` may appear on a
step row rather than the top-level job row.

The failed batch script will normally show a non-zero `ExitCode`. Slurm formats
this as `status:signal`; for example, `2:0` means exit status 2 and no terminating
signal. Now inspect both logs:

```bash
cat "logs/particle-diagnose-$DIAGNOSE_ID.out"
cat "logs/particle-diagnose-$DIAGNOSE_ID.err"
```

Python's argument parser reports that `--memory-mb` is unknown. The evidence
now forms a complete explanation:

- job ID identifies the exact attempt
- `FAILED` says it did not complete successfully
- the exit code confirms the script returned non-zero
- standard error identifies the invalid option
- the missing result file is a consequence, not the root cause

Correct the option to `--memory-mib`, submit again, and keep the new job ID.
Never diagnose a new submission using an old log merely because the job names
match.

## A Repeatable Diagnostic Order

For a pending job:

1. Find the exact job ID in `squeue`.
1. Read `ST` and `NODELIST(REASON)`.
1. Use `scontrol show job` for the complete request.
1. Compare the request with current site policy.

For a finished job:

1. Use `sacct` to read `State` and `ExitCode`.
1. Check both standard output and standard error.
1. Confirm expected result files exist and are valid.
1. Inspect requested versus consumed resources before changing the request.

{{< callout type="note" title="`seff` is optional" >}}
Some clusters install `seff`, a convenient summary script. It is not available
everywhere and its efficiency values need site-specific interpretation.
This course uses `sacct` directly. If `seff "$JOB_ID"` works at your site,
use it alongside the job records and logs.
{{< /callout >}}

{{< challenge title="Repair and verify the workload" >}}
Fix `diagnose-job.sh`, submit it again, and demonstrate success using three
independent pieces of evidence.

{{< solution >}}
A strong answer includes:

1. `sacct` reports `COMPLETED` and `ExitCode` `0:0` for the repaired job.
1. The standard-error log is empty (or contains no application error).
1. `results/diagnosis.json` exists, parses as JSON, and contains the repaired
   job's ID.

Use the new job ID in every command.
{{< /solution >}}
{{< /challenge >}}

Continue with [Interactive Work on Compute Nodes]({{< relref "/episodes/04-interactive-jobs" >}})
to check an environment and try commands within a short allocation.

{{< instructor >}}
The misspelled option reliably causes an error without depending on how the
site enforces memory limits. If accounting is delayed, give learners a prepared
`sacct` example but still have them inspect their own error log and result
file. Emphasise that “not in `squeue`” does not mean “successful”.
{{< /instructor >}}
