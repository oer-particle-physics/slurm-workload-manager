+++
title = "First Batch Job"
weight = 20
teaching = 15
exercises = 10
questions = [
  "How do I describe and submit a repeatable batch job?",
  "Where do standard output and error go?",
  "How do I confirm that the job finished successfully?"
]
objectives = [
  "Write a batch script with explicit time, CPU, memory, and log settings.",
  "Submit the script and connect its job ID to output and result files.",
  "Inspect useful Slurm environment variables inside a job.",
  "Confirm completion and verify that the result belongs to the submitted job."
]
keypoints = [
  "`sbatch` submits a script and returns immediately with a job ID; it does not wait for the job to run.",
  "Place `#SBATCH` directives before executable commands and keep cluster-specific options in `site-settings.sh`.",
  "Create log directories before submission because Slurm opens log files before the script body runs.",
  "Confirm the job has completed before looking for its result; time spent waiting in the queue is separate from runtime."
]
+++

Use the `site-settings.sh` and site note you completed in
[How Slurm and Your Cluster Work]({{< relref "/episodes/01-slurm-model#portable-script-local-submission" >}}).

A batch script is an ordinary shell script plus resource and output options for
Slurm. Submitting the script creates a job request. Slurm may run it immediately
or keep it pending until the requested resources are available.

The [official `sbatch` documentation](https://slurm.schedmd.com/sbatch.html)
notes that submission returns once Slurm has accepted the script and assigned
a job ID. Use that ID to check the job's progress, cancel it, find its records
and logs, or ask the support team for help.

## Write the First Script

In your `~/slurm-course` directory, create `first-job.sh`:

```bash
#!/usr/bin/env bash
#SBATCH --job-name=particle-one
#SBATCH --time=00:02:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=256M
#SBATCH --output=logs/%x-%j.out
#SBATCH --error=logs/%x-%j.err

set -euo pipefail

echo "job_id=$SLURM_JOB_ID"
echo "host=$(hostname)"
echo "workdir=$(pwd)"
echo "cpus_per_task=$SLURM_CPUS_PER_TASK"

srun python3 particle_demo.py \
  --sample dyjets_chunk_001 \
  --seconds 8 \
  --memory-mib 64 \
  --output results/dyjets_chunk_001.json
```

The `#SBATCH` lines, called **directives**, tell Slurm what the job needs:

| Directive | Meaning |
|---|---|
| `--job-name` | A recognisable label for queue and accounting displays |
| `--time` | Maximum runtime (walltime), after which Slurm stops the job |
| `--ntasks=1` | One application process launched as a Slurm task |
| `--cpus-per-task=1` | One CPU available to that task |
| `--mem=256M` | Memory requested for the job on its node |
| `--output`, `--error` | Separate standard-output and standard-error files |

In a filename pattern, `%x` becomes the job name and `%j` becomes the job ID.
Keeping the ID in each filename prevents a later submission from overwriting an
earlier log.

`set -euo pipefail` makes many scripting errors visible instead of allowing the
script to continue silently. It is Bash syntax, which is why the first line
selects Bash explicitly.

If your site note lists module or environment commands needed for Python on
compute nodes, add them before the `srun python3` command. Keep all `#SBATCH`
directives above those commands.

{{< callout type="warning" title="Directive syntax is not shell syntax" >}}
Slurm reads `#SBATCH` lines before the shell runs. Shell variables such as
`$HOME` or `$SLURM_JOB_ID` are treated literally inside directives. Slurm also
stops reading directives after the first non-comment, non-whitespace command.
Use filename tokens such as `%j`, or pass a computed value on the `sbatch`
command line.
{{< /callout >}}

## Submit the Job

Ensure the log directory exists **before** submission, then load your site
options and submit:

```bash
mkdir -p logs results
source site-settings.sh
sbatch "${SLURM_SITE_ARGS[@]}" first-job.sh
```

The response looks like:

```text
Submitted batch job 12345
```

Your number will differ. Record it as `JOB_ID` for the commands below:

```bash
JOB_ID=12345
```

## Wait for the Job to Finish

Check the job's current state:

```bash
squeue -j "$JOB_ID"
```

The `ST` column tells you what to do next:

- `PD` (pending): the job is waiting to start. The log and result files may
  not exist yet. The final column gives the current reason, such as
  `Resources` or `Priority`.
- `R` (running): the job has started. Logs may still be incomplete, and the
  demonstration program writes its JSON result only after finishing its work.

An eight-second workload can wait several minutes or longer before starting.
Its `--time=00:02:00` limit applies to runtime, not time spent waiting in the
queue. Wait and check again manually; do not submit another copy just because
the files are missing.

To see all your pending and running jobs, use:

```bash
squeue --me
```

On older Slurm releases where `--me` is unavailable, use `squeue -u "$USER"`.

If `squeue` shows no job row, or reports an invalid job ID, the job may already
have finished. Disappearing from the queue does not tell you whether it
succeeded. Check its accounting record:

```bash
sacct -j "$JOB_ID" --format=JobID,State,ExitCode
```

Look at the row whose `JobID` matches your number exactly. For this script,
expect `COMPLETED` and `0:0`, meaning it finished with exit status zero and no
terminating signal. Rows ending in `.batch`, `.extern`, or `.0` describe job
steps. Accounting updates can take a short time; if no record appears yet,
wait briefly and check again. If accounting is unavailable on your cluster,
use `scontrol show job "$JOB_ID"` to check `JobState` and `ExitCode` while
Slurm still retains the job record.

The next episode explains [job states and diagnosis]({{< relref "/episodes/03-monitor-diagnose" >}})
in more detail; the [official `sacct` documentation](https://slurm.schedmd.com/sacct.html)
describes the accounting fields.

## Inspect the Output

After confirming completion, inspect the files from your course directory:

```bash
ls -l logs results
cat "logs/particle-one-$JOB_ID.out"
cat "logs/particle-one-$JOB_ID.err"
cat results/dyjets_chunk_001.json
```

An empty error file is normal. The JSON result should now contain the real job
ID and the hostname of a compute node. Check that its job ID matches the
submission you are inspecting, especially if you have run this sample before.

For example, selected fields from a successful result might look like:

```json
{
  "sample": "dyjets_chunk_001",
  "hostname": "compute01",
  "job_id": "12345",
  "array_task_id": null,
  "workers": 1,
  "memory_mib": 64
}
```

Your hostname and job ID will differ. `sample` identifies the requested input
label, `workers` should match this one-worker job, and `array_task_id` is
`null` because this is not an array. `memory_mib` is the program's requested
allocation of memory; it is not a measurement of the whole job's peak usage.
The additional timing and simulated-event fields can vary between runs.

After comparing these fields yourself, run the checker downloaded in Setup:

```bash
python3 check_result.py results/dyjets_chunk_001.json \
  --job-id "$JOB_ID" --sample dyjets_chunk_001 --workers 1
```

Expect `OK:` followed by the result path and your job details. The checker
reports `FAIL:` and exits non-zero if the file is missing, invalid JSON, or
has a mismatched sample, job ID, worker count, or array index. It checks result
metadata; the accounting record and logs remain separate checks.

{{< callout type="note" title="If files are still missing" >}}
If the job failed, inspect any available error log and follow the diagnosis
steps in the next episode. If the logs are missing too, run
`scontrol show job "$JOB_ID"` and inspect `WorkDir`, `StdOut`, and `StdErr`.
These show where the job ran and where Slurm was asked to write the logs.
Compare `WorkDir` with `pwd`: by default, relative paths use the directory
from which you submitted the job. That directory must also be accessible and
writable from compute nodes. For a completed job, check these paths before
assuming the files are missing altogether.
{{< /callout >}}

## Allocation, Script, and Step

This one submission demonstrates all three levels:

1. `sbatch` asks Slurm for a job allocation.
1. Slurm runs one copy of `first-job.sh` on one of the allocated compute nodes.
1. `srun` launches the Python program as a job step.

For a simple serial job, many clusters also allow the script to run
`python3 ...` directly. Here, `srun` starts the program as a job step within
the resources already assigned to the job. Its separate accounting record
will help us examine the program's resource use in a later episode.

## Command-Line Options Override the Script

Options supplied to `sbatch` override matching `#SBATCH` directives. This is
also how `site-settings.sh` supplies the local partition, account, QoS, or
reservation. In the next exercise, use `--job-name=particle-two` and
`--time=00:03:00` at submission time to override those two script settings.

{{< challenge title="Submit a second sample" >}}
Copy the first script to `second-job.sh`. Change the application arguments so
it processes `ttbar_chunk_001` and writes `results/ttbar_chunk_001.json`.
Leave the directives unchanged and override the job name and time limit on
the submission command line as described above. Record the new ID, verify
completion and the new result, and check that the first job's logs and result
are still available.

{{< solution >}}
First finish checking the initial job. Keep its ID and copy its script:

```bash
FIRST_ID=$JOB_ID
cp first-job.sh second-job.sh
```

In `second-job.sh`, replace the final application command with the following.
Keep the directives and any local Python setup from the copied script:

```bash
srun python3 particle_demo.py \
  --sample ttbar_chunk_001 \
  --seconds 8 \
  --memory-mib 64 \
  --output results/ttbar_chunk_001.json
```

Submit the copy, overriding its name and time limit:

```bash
source site-settings.sh
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" \
  --job-name=particle-two --time=00:03:00 second-job.sh)
SECOND_ID=${submission%%;*}
echo "$SECOND_ID"
squeue -j "$SECOND_ID"
```

`--parsable` returns the ID without the introductory sentence. Some
multi-cluster installations append `;cluster`; `${submission%%;*}` keeps the
numeric ID. If submission reports an error, resolve it before continuing.

Wait for this job to leave the queue, then check accounting:

```bash
sacct -X -j "$SECOND_ID" --format=JobID,JobName%20,State,ExitCode,Timelimit
```

Expect `particle-two`, `COMPLETED`, `0:0`, and a three-minute time limit.
`-X` omits the job-step rows. Allow time for accounting to update. Then inspect
the logs and validate both results:

```bash
cat "logs/particle-two-${SECOND_ID}.out"
cat "logs/particle-two-${SECOND_ID}.err"
python3 check_result.py results/ttbar_chunk_001.json \
  --job-id "$SECOND_ID" --sample ttbar_chunk_001 --workers 1
ls -l "logs/particle-one-${FIRST_ID}.out" "logs/particle-one-${FIRST_ID}.err"
python3 check_result.py results/dyjets_chunk_001.json \
  --job-id "$FIRST_ID" --sample dyjets_chunk_001 --workers 1
```

The new error log should be empty, both checks should print `OK:`, and the
original logs should still exist. Separate result names preserve the first
result; `%x` and `%j` distinguish the logs. Keep `first-job.sh` unchanged for
later episodes.
{{< /solution >}}
{{< /challenge >}}

{{< challenge title="Why create logs first?" >}}
Why can the script not rely on `mkdir -p logs` immediately before the `srun`
line?

{{< solution >}}
Slurm opens the configured standard-output and standard-error paths when the
job starts, before the script body executes. If `logs/` does not exist, the
batch step can fail before it reaches `mkdir`.
{{< /solution >}}
{{< /challenge >}}

## Next Steps {#a-short-interactive-allocation}

Continue with [Monitoring, Control, and Diagnosis]({{< relref "/episodes/03-monitor-diagnose" >}})
to investigate waiting jobs, cancel work, and repair a failure. Interactive
allocations follow in their own episode,
[Interactive Work on Compute Nodes]({{< relref "/episodes/04-interactive-jobs" >}}).

{{< instructor >}}
Fast jobs may disappear from `squeue` before learners see them. Show how to
find their records with `sacct`. Keep one prepared output log and one completed
job ID available in case the training partition is delayed.
{{< /instructor >}}
