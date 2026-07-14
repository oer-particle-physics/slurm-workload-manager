+++
title = "First Batch and Interactive Jobs"
weight = 20
teaching = 15
exercises = 10
questions = [
  "How do I describe and submit a repeatable batch job?",
  "Where do standard output and error go?",
  "When should I use an interactive allocation instead?"
]
objectives = [
  "Write a batch script with explicit time, CPU, memory, and log settings.",
  "Submit the script and connect its job ID to output and result files.",
  "Inspect useful Slurm environment variables inside a job.",
  "Use a short interactive allocation for testing and release it afterwards."
]
keypoints = [
  "`sbatch` submits a script and returns immediately with a job ID; it does not wait for the job to run.",
  "Place `#SBATCH` directives before executable commands and keep site-specific options outside the portable script.",
  "Create log directories before submission because Slurm opens log files before the script body runs.",
  "Use interactive allocations for short tests and debugging, and batch scripts for normal repeatable work."
]
+++

A batch script is an ordinary shell script plus resource and output options for
Slurm. Submitting the script creates a job request. Slurm may run it immediately
or keep it pending until the requested resources are available.

The [official `sbatch` documentation](https://slurm.schedmd.com/sbatch.html)
notes that submission returns once the controller has accepted the script and
assigned a job ID. That ID is your handle for monitoring, cancellation,
accounting, logs, and support requests.

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

The directives describe a small, single-task job:

| Directive | Meaning |
|---|---|
| `--job-name` | A recognisable label for queue and accounting displays |
| `--time` | Maximum walltime, not an estimate printed for information |
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
squeue -j "$JOB_ID"
```

If the queue is quiet, the job may finish before `squeue` displays it. That is
not an error; `squeue` normally shows pending and running jobs, while `sacct`
will show the completed record in the next episode.

Once the job finishes, inspect its files:

```bash
ls -l logs results
cat "logs/particle-one-$JOB_ID.out"
cat "logs/particle-one-$JOB_ID.err"
cat results/dyjets_chunk_001.json
```

An empty error file is normal. The JSON result should now contain the real job
ID and the hostname of a compute node.

## Allocation, Script, and Step

This one submission demonstrates all three levels:

1. `sbatch` asks Slurm for a job allocation.
1. Slurm runs one copy of `first-job.sh` on the batch host in that allocation.
1. `srun` launches the Python program as a job step.

For a simple serial job, many clusters also allow the script to run
`python3 ...` directly. Using `srun` here makes the allocation/step distinction
visible and prepares the script for more explicit task launching later. Follow
local guidance when an application or MPI implementation has its own launcher.

## Command-Line Options Override the Script

You can change a submission without editing the reusable script:

```bash
sbatch "${SLURM_SITE_ARGS[@]}" \
  --job-name=particle-repeat \
  --time=00:03:00 \
  first-job.sh
```

Options supplied to `sbatch` override matching `#SBATCH` directives. This is
also how `site-settings.sh` supplies the local partition, account, QoS, or
reservation.

## A Short Interactive Allocation

Interactive allocations are useful for checking an environment, reproducing a
failure, or testing a command briefly on a compute node. They still consume
shared resources and should be given realistic limits.

If your site permits the standard Slurm interface, request a short allocation:

```bash
source site-settings.sh
salloc "${SLURM_SITE_ARGS[@]}" \
  --time=00:05:00 \
  --ntasks=1 \
  --cpus-per-task=1 \
  --mem=256M
```

After Slurm grants it, launch an interactive shell as a job step:

```bash
srun --pty bash
hostname
echo "$SLURM_JOB_ID"
python3 particle_demo.py \
  --sample interactive-check \
  --seconds 1 \
  --memory-mib 16 \
  --output results/interactive-check.json
exit
```

You are now back in the shell started by `salloc`. Release the allocation:

```bash
exit
```

Look for `Relinquishing job allocation` or confirm with `squeue --me` that the
interactive job is gone. Never leave an interactive allocation idle.

{{< callout type="note" title="Interactive access is local policy" >}}
Some sites provide a dedicated partition, reservation, `srun --pty` command,
wrapper, or web portal. Use the local recipe instead of forcing the commands
above. The portable concept is an explicitly limited Slurm allocation used for
short interactive work.
{{< /callout >}}

{{< challenge title="Submit a second sample" >}}
Without changing the resource directives, edit the application arguments so a
new submission processes `ttbar_chunk_001` and writes
`results/ttbar_chunk_001.json`. Submit it, record its job ID, and verify that
the old log and result still exist.

{{< solution >}}
Change the final command to:

```bash
srun python3 particle_demo.py \
  --sample ttbar_chunk_001 \
  --seconds 8 \
  --memory-mib 64 \
  --output results/ttbar_chunk_001.json
```

Submit with `sbatch "${SLURM_SITE_ARGS[@]}" first-job.sh`. The new log has a
different `%j` value, so it does not replace the previous log. The result name
is also distinct.
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

{{< instructor >}}
Fast jobs may disappear from `squeue` before learners see them. Treat that as a
transition to accounting, not as a failure. Keep one prepared output log and
one completed job ID available in case the training partition is delayed.
{{< /instructor >}}
