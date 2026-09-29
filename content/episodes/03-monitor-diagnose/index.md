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

Work in your shared course directory with the first script and site settings
from the previous episodes. Submit that script **on hold** for this exercise:
Slurm will keep it pending until it is released or cancelled. This gives you
time to inspect it even when the demonstration workload would finish quickly.

```bash
source site-settings.sh
submission=$(sbatch --parsable --hold "${SLURM_SITE_ARGS[@]}" \
  --job-name=particle-monitor first-job.sh)
MONITOR_ID=${submission%%;*}
echo "$MONITOR_ID"
squeue --me
```

`--parsable` returns the job ID; `${submission%%;*}` removes a possible
`;cluster` suffix. Continue only after submission succeeds and an ID is
printed. Keep this job held: you will cancel it below, so it will not run or
replace an earlier result.

For a more informative, repeatable layout:

```bash
squeue --me -o "%.18i %.12P %.24j %.2t %.10M %.6D %R"
```

Two fields are especially useful:

- `%t` is the compact job state, such as `PD` (pending) or `R` (running).
- `%R` is the pending reason, or the node list after the job starts.

Your `MONITOR_ID` should have state `PD` and reason `JobHeldUser`. Compare its
ID with the number you captured rather than relying on its name.

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
| `JobHeldUser` | The user has held the job; it needs release or cancellation |
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
scontrol show job "$MONITOR_ID"
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

Cancel the held job you just inspected. `scancel` can cancel pending or
running jobs; here no application work has started:

```bash
scancel "$MONITOR_ID"
squeue -j "$MONITOR_ID"
```

It may disappear from `squeue` quickly. Check its recorded state with:

```bash
sacct -X -j "$MONITOR_ID" --format=JobID,JobName%20,State%20,ExitCode,Elapsed
```

You should see `CANCELLED`, although accounting updates can take a short time.
There should be no active queue row; an invalid-job-ID response can also mean
Slurm has removed the finished job. No application logs or result are expected
from this held attempt. If you stop the episode before this point, cancel the
held job before leaving.

## Create and Diagnose a Real Failure

Copy the first script:

```bash
cp first-job.sh diagnose-job.sh
```

In `diagnose-job.sh`, change the job-name directive:

```bash
#SBATCH --job-name=particle-diagnose
```

Replace the application command with the following, which deliberately
misspells one option:

```bash
srun python3 particle_demo.py \
  --sample diagnosis \
  --seconds 4 \
  --memory-mb 64 \
  --output "results/diagnosis-${SLURM_JOB_ID}.json"
```

Submit it and capture the ID:

```bash
source site-settings.sh
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" diagnose-job.sh)
DIAGNOSE_ID=${submission%%;*}
echo "$DIAGNOSE_ID"
squeue -j "$DIAGNOSE_ID"
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

The repair exercise below will create a corrected copy and track it with a
new job ID. Keep the failed attempt's ID and logs for comparison.

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
This course uses `sacct` directly. If `seff "$DIAGNOSE_ID"` works at your site,
use it alongside the job records and logs.
{{< /callout >}}

{{< challenge title="Repair and verify the workload" >}}
Copy `diagnose-job.sh` to `repaired-job.sh`, fix the misspelled option, and
change the job name to `particle-repaired`. Submit the copy once and
demonstrate success using accounting, logs, and a result belonging to this
new attempt.

{{< solution >}}
Copy the script:

```bash
cp diagnose-job.sh repaired-job.sh
```

In the copy, set `#SBATCH --job-name=particle-repaired` and replace the
application command with:

```bash
srun python3 particle_demo.py \
  --sample diagnosis \
  --seconds 4 \
  --memory-mib 64 \
  --output "results/diagnosis-${SLURM_JOB_ID}.json"
```

Keep the other directives and any Python environment setup from the copied
script. Submit and record the new ID:

```bash
source site-settings.sh
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" repaired-job.sh)
REPAIR_ID=${submission%%;*}
echo "$REPAIR_ID"
squeue -j "$REPAIR_ID"
```

Wait for it to leave the queue, then compare the two attempts:

```bash
sacct -X -j "$DIAGNOSE_ID,$REPAIR_ID" --format=JobID,JobName%20,State,ExitCode
```

The original should be `FAILED` with a non-zero exit status; the repaired job
should be `COMPLETED` with `0:0`. Allow time for accounting updates. Inspect
the new logs and check its result:

```bash
cat "logs/particle-repaired-${REPAIR_ID}.out"
cat "logs/particle-repaired-${REPAIR_ID}.err"
python3 -m json.tool "results/diagnosis-${REPAIR_ID}.json"
python3 check_result.py "results/diagnosis-${REPAIR_ID}.json" \
  --job-id "$REPAIR_ID" --sample diagnosis --workers 1
```

Expect an empty error log and an `OK:` result check. The job ID in the filename
keeps this attempt separate, and the ID inside the JSON confirms its origin.
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
