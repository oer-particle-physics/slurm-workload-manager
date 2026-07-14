+++
title = "Scaling with Job Arrays"
weight = 50
teaching = 15
exercises = 15
questions = [
  "How can one submission process many independent inputs?",
  "How do I map array task IDs safely to input and output files?",
  "How can I limit concurrency and recover selected array elements?"
]
objectives = [
  "Replace a submission loop with a Slurm job array.",
  "Map `SLURM_ARRAY_TASK_ID` to one validated input.",
  "Create collision-free logs and outputs for every array element.",
  "Throttle, inspect, cancel, and resubmit selected elements.",
  "Choose between an array, one multi-CPU job, and bundling tiny tasks."
]
keypoints = [
  "A job array represents similar batch jobs with the same initial resource shape and different array indices.",
  "Use `SLURM_ARRAY_TASK_ID` only after validating that it maps to a real input.",
  "Use `%A` and `%a` in log filenames so every array element has distinct evidence.",
  "Throttle arrays with `%M`; the limit protects shared services and makes campaign size independent of instantaneous concurrency.",
  "Recover only failed or cancelled elements rather than rerunning successful work."
]
+++

The first four episodes developed one reliable job. Research campaigns often
repeat that job over many independent files, random seeds, parameters, or
dataset chunks. A shell loop that calls `sbatch` hundreds of times hides the
structure from Slurm and creates avoidable submission traffic.

A **job array** submits the common request once and gives each element an array
index. The [official Job Array Guide](https://slurm.schedmd.com/job_array.html)
describes arrays as collections of similar batch jobs with the same initial
options. Each element is still a schedulable job with its own state and exit
status.

## Map Indices to Inputs

The supplied `inputs.txt` contains eight sample labels:

```bash
nl -ba inputs.txt
```

`nl` displays human-friendly line numbers starting at 1. This episode uses
array indices `0-7`, so the script loads the file into a zero-based Bash array
and validates the index explicitly.

Create `array-job.sh`:

```bash
#!/usr/bin/env bash
#SBATCH --job-name=particle-array
#SBATCH --time=00:02:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=256M
#SBATCH --array=0-7%2
#SBATCH --output=logs/%x-%A_%a.out
#SBATCH --error=logs/%x-%A_%a.err

set -euo pipefail

mapfile -t samples < inputs.txt
task_id=${SLURM_ARRAY_TASK_ID:?This script must run as a job array}

if (( task_id < 0 || task_id >= ${#samples[@]} )); then
  echo "No input for array index $task_id" >&2
  exit 2
fi

sample=${samples[$task_id]}
if [[ -z "$sample" ]]; then
  echo "Input for array index $task_id is empty" >&2
  exit 2
fi

echo "array_job_id=$SLURM_ARRAY_JOB_ID"
echo "array_task_id=$task_id"
echo "sample=$sample"

srun python3 particle_demo.py \
  --sample "$sample" \
  --seconds 8 \
  --memory-mib 64 \
  --output "results/${sample}.json"
```

The array directive has two parts:

- `0-7` creates eight indices matching the eight input lines.
- `%2` permits at most two array elements to run simultaneously.

The concurrency limit does not divide two CPUs among all eight jobs. Each
running element requests its own one-CPU, 256 MiB allocation. At most two such
allocations run at once.

{{< callout type="warning" title="Keep the range and input list consistent" >}}
Slurm does not know how many lines are in `inputs.txt`. If the file changes,
you must update or override the array range. The bounds and empty-input checks
turn a mismatch into a clear failure instead of silently processing the wrong
input.
{{< /callout >}}

## Give Every Element Its Own Evidence

Array logs use two filename tokens:

- `%A`: the array's master job ID (`SLURM_ARRAY_JOB_ID`)
- `%a`: the element index (`SLURM_ARRAY_TASK_ID`)

For array job 24680, element 3 writes:

```text
logs/particle-array-24680_3.out
logs/particle-array-24680_3.err
```

The result path uses the validated sample label, so successful elements also
write distinct JSON files.

Do not assume that element 0 starts first or that element 7 finishes last.
Scheduling and requeueing can create elements out of order. The array index,
not execution order or numeric `SLURM_JOB_ID`, selects the input.

## Submit and Inspect the Array

Ensure the log directory exists, load the site settings, and submit:

```bash
mkdir -p logs results
source site-settings.sh
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" array-job.sh)
ARRAY_ID=${submission%%;*}
echo "$ARRAY_ID"
```

Inspect the compact queue view:

```bash
squeue -j "$ARRAY_ID"
```

Slurm may compress pending indices into expressions such as `_[2-7%2]`.
Expand them to one line per element with:

```bash
squeue -r -j "$ARRAY_ID"
```

The exact display depends on Slurm version and which elements have started.
While two run, other eligible elements can show pending reason
`JobArrayTaskLimit`. That is the throttle working as intended.

After completion, expand the accounting records:

```bash
sacct --array -j "$ARRAY_ID" \
  --format=JobID,JobName%24,State,ExitCode,Elapsed,AllocCPUS,MaxRSS
```

Then check results and error logs:

```bash
ls -1 results/*.json
find logs -name "particle-array-${ARRAY_ID}_*.err" -size +0 -print
```

The `find` command prints non-empty error logs. No output is a good sign, but
still confirm states and result files.

## Cancel and Recover One Element

To practise selective control, submit the array again and immediately cancel
element 7, which should remain pending initially because of the `%2` throttle:

```bash
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" array-job.sh)
RECOVERY_ARRAY_ID=${submission%%;*}
scancel "${RECOVERY_ARRAY_ID}_7"
```

After the other elements finish, inspect all states:

```bash
sacct --array -j "$RECOVERY_ARRAY_ID" \
  --format=JobID,State,ExitCode,Elapsed
```

Element 7 should be `CANCELLED`; the others should complete. Recover only that
input by overriding the script's array directive at submission time:

```bash
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" \
  --array=7 \
  array-job.sh)
RECOVERY_ID=${submission%%;*}
echo "$RECOVERY_ID"
```

The command-line `--array=7` overrides `#SBATCH --array=0-7%2`. This produces a
new array job containing just the selected index. Keep its new ID with the
recovery record.

You can likewise recover several elements with a list or range, for example
`--array=1,4,6-7%2`. Always derive that list from accounting and output
validation, not from guesswork.

## Why Not a Submission Loop?

Avoid this pattern for a large campaign:

```bash
while read -r sample; do
  sbatch "${SLURM_SITE_ARGS[@]}" job-for-one-sample.sh "$sample"
done < inputs.txt
```

Every `sbatch` is a separate request to the controller, the campaign has no
single array identity, and adding a concurrency limit becomes awkward. Arrays
let Slurm represent the repetition directly and allow collective or
per-element management.

An array is not automatically right for every repetition. Thousands of
sub-second commands still create thousands of schedulable elements. The
optional [Efficient Campaigns]({{< relref "/episodes/efficient-campaigns" >}})
episode shows when to bundle tiny work inside a smaller number of allocations.

## The Complete Workflow

You can now carry out the full beginner workflow:

1. discover the local partition, account, and policy
1. submit a portable, explicit batch script
1. monitor state and pending reason
1. diagnose from accounting and logs
1. compare requested and consumed time, CPU, and memory
1. tune the next request
1. scale to a throttled array with isolated logs and outputs
1. recover only unsuccessful elements

The commands matter, but the larger skill is maintaining a traceable
relationship between request, allocation, application, evidence, and result.

{{< challenge title="Choose the correct job shape" >}}
Choose an array, one multi-CPU job, or bundled tiny tasks for each case:

1. 500 independent simulations take about 30 minutes each and use the same
   one-CPU, 1 GiB resource shape.
1. One reconstruction program creates eight threads that cooperate on one
   input and share memory.
1. 20,000 independent checks each take less than one second.

{{< solution >}}
1. Use a throttled array. The units are independent, substantial, and have the
   same initial resource shape.
1. Use one task with eight CPUs per task, provided measurements show the
   program benefits from eight threads.
1. Bundle many checks into fewer allocations. An array with 20,000 sub-second
   elements would spend disproportionate effort on job launch, scheduling, and
   accounting.
{{< /solution >}}
{{< /challenge >}}

{{< challenge title="Audit your finished campaign" >}}
For your completed eight-element array, produce evidence that:

- all intended indices have a final state
- every successful element has exit code zero
- every successful element has a distinct result
- no non-empty error log has been overlooked
- no more than two elements were intended to run at once

{{< solution >}}
Use `sacct --array -j "$ARRAY_ID"` for states and exit codes, list the eight
expected JSON files derived from `inputs.txt`, search the matching error logs
for non-empty files, and show that the submitted array specification was
`0-7%2` (from the script or `scontrol show job "$ARRAY_ID"`).
{{< /solution >}}
{{< /challenge >}}

{{< instructor >}}
The cancellation exercise relies on the `%2` limit to leave element 7 pending,
but a heavily delayed queue may keep every element pending. Cancelling a
pending element is still valid. If accounting groups array records, ensure
learners include `sacct --array` or use a prepared expanded example.
{{< /instructor >}}
