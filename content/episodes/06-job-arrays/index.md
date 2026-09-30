+++
title = "Scaling with Job Arrays"
weight = 60
aliases = ["/episodes/05-job-arrays/"]
teaching = 15
exercises = 15
questions = [
  "How can one submission process many independent inputs?",
  "How do I map array task IDs safely to input and output files?",
  "How can I limit how many array jobs run at once and rerun only selected jobs?"
]
objectives = [
  "Replace a submission loop with a Slurm job array.",
  "Map `SLURM_ARRAY_TASK_ID` to one validated input.",
  "Give every array element separate log and result filenames so they do not overwrite each other.",
  "Limit how many elements run at once, and inspect, cancel, or resubmit selected elements.",
  "Choose between an array, one multi-CPU job, and bundling tiny tasks."
]
keypoints = [
  "A job array represents similar batch jobs with the same initial resource requests and a different index for each job.",
  "Use `SLURM_ARRAY_TASK_ID` only after validating that it maps to a real input.",
  "Use `%A` and `%a` in log filenames so every array element has its own logs.",
  "Add `%M` to an array range to run at most M elements at once, even when the array contains many more jobs.",
  "Recover only failed or cancelled elements rather than rerunning successful work."
]
+++

You now have a reliable batch job. Researchers often repeat
that job over many independent files, random seeds, parameter values, or parts
of a dataset. We call a related set of runs a **campaign**. A shell loop that
calls `sbatch` hundreds of times sends a separate submission request for each
job. An array lets you submit them together.

A **job array** submits the common request once and gives each element an array
index. The [official Job Array Guide](https://slurm.schedmd.com/job_array.html)
describes arrays as collections of similar batch jobs with the same initial
options. Slurm schedules each element separately and records its state and
exit status.

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

Add any Python module or environment commands from your site note before
`srun`, keeping all `#SBATCH` directives at the top, as in the first batch job.

The array directive has two parts:

- `0-7` creates eight indices matching the eight input lines.
- `%2` permits at most two array elements to run simultaneously.

This limit on how many jobs run at once is called a **concurrency limit** or
**throttle**. It does not divide two CPUs among all eight jobs. Each
running element requests its own one-CPU, 256 MiB allocation. At most two such
allocations run at once.

{{< callout type="warning" title="Keep the range and input list consistent" >}}
Slurm does not know how many lines are in `inputs.txt`. If the file changes,
you must update or override the array range. The bounds and empty-input checks
turn a mismatch into a clear failure instead of silently processing the wrong
input.
{{< /callout >}}

## Give Every Element Its Own Logs and Results {#give-every-element-its-own-evidence}

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

The exact display depends on the Slurm version and which elements have started.
While two run, other eligible elements can show the pending reason
`JobArrayTaskLimit`. That is the throttle working as intended.

After completion, expand the accounting records:

```bash
sacct --array -j "$ARRAY_ID" \
  --format=JobID%24,JobIDRaw,JobName%24,State,ExitCode,Elapsed,AllocCPUS,MaxRSS
```

Expect eight top-level element records, each `COMPLETED` with `0:0`. Allow
time for accounting updates before interpreting missing records. Then match
one result to its accounting record. Start with index 0:

```bash
sacct --array -X -j "${ARRAY_ID}_0" --format=JobID%24,JobIDRaw,State,ExitCode
mapfile -t samples < inputs.txt
python3 -m json.tool "results/${samples[0]}.json"
cat "logs/particle-array-${ARRAY_ID}_0.out"
cat "logs/particle-array-${ARRAY_ID}_0.err"
```

For example, if the accounting row is `24680_0` with `JobIDRaw=24681`, the
JSON must contain `job_id: "24681"`, `array_task_id: "0"`, and the first label
from `inputs.txt`. The result's job ID is the element's numeric ID, which can
differ from the array's master ID. The output log should name the same sample
and index; the error log should be empty.

Capture that numeric ID and check the same fields automatically:

```bash
ELEMENT_JOB_ID=$(sacct --array -X --noheader --parsable2 \
  -j "${ARRAY_ID}_0" --format=JobIDRaw)
python3 check_result.py "results/${samples[0]}.json" \
  --job-id "$ELEMENT_JOB_ID" --sample "${samples[0]}" \
  --workers 1 --array-task-id 0
```

Expect `OK:`. This establishes the matching rule; now apply it to all eight
inputs with [check_array.py](/files/slurm-course/check_array.py), a standalone
checker using only Python's standard library:

```bash
base_url="https://oer-particle-physics.github.io/slurm-workload-manager/files/slurm-course"
curl -fLO "$base_url/check_array.py"
sacct --array -X --noheader --parsable2 -j "$ARRAY_ID" \
  --format=JobID%32,JobIDRaw%32,State%32,ExitCode > array-accounting.txt
python3 check_array.py "$ARRAY_ID" --accounting array-accounting.txt
```

`--parsable2` separates fields with `|` and `--noheader` omits column titles.
The checker reads this export and `inputs.txt`. For each index, it requires a
successful accounting record, matching sample/job/index/worker fields in the
JSON, both log files, and an empty error log. Expect eight `OK:` lines and
`Checked all 8 inputs: successful jobs, matching results, and empty error logs.`

On `FAIL:`, inspect the named record, result, or log. A non-empty error log
requires reading; a message can be harmless, but the checker cannot decide
that for you. For missing accounting, wait and regenerate the export. Use the
next exercise to learn how to recover an input that has no successful result.

{{< callout type="note" title="An existing result may belong to an earlier run" >}}
This script names results by sample label. Running the same sample again
replaces its JSON file, but cancelling an element before it runs leaves any
older result untouched. A file's existence alone does not prove that the
current attempt succeeded; check the job ID inside it.
{{< /callout >}}

## Cancel and Recover One Element

Submit a fresh practice array **on hold** so no element can start before you
choose which one to cancel. The `--hold` option keeps the jobs pending until
you release them:

```bash
source site-settings.sh
submission=$(sbatch --parsable --hold "${SLURM_SITE_ARGS[@]}" array-job.sh)
RECOVERY_ARRAY_ID=${submission%%;*}
echo "$RECOVERY_ARRAY_ID"
squeue -r -j "$RECOVERY_ARRAY_ID"
```

Check that indices 0–7 are present and pending. Record the array ID and your
chosen cancellation target, index 7, in your notes. Then cancel only that
element and inspect the queue again:

```bash
scancel "${RECOVERY_ARRAY_ID}_7"
squeue -r -j "$RECOVERY_ARRAY_ID"
```

Index 7 should no longer be listed, while 0–6 remain held. If cancellation
reports an error or the display has not updated, check the job ID and state
before continuing. Release the remaining elements:

```bash
scontrol release "$RECOVERY_ARRAY_ID"
```

Releasing the hold makes them eligible to run; they can still wait for
resources. See the [`sbatch --hold` documentation](https://slurm.schedmd.com/sbatch.html#OPT_hold)
for this submit-and-release workflow. If you stop this exercise early, cancel
the held array so it is not left waiting indefinitely.

After elements 0–6 finish, inspect their accounting records:

```bash
sacct --array -X -j "$RECOVERY_ARRAY_ID" \
  --format=JobID%24,JobIDRaw,State%20,ExitCode,Elapsed
```

`-X` omits job-step rows for this summary. Expect elements 0–6 to show
`COMPLETED` with exit code `0:0`. Element 7 may appear as `CANCELLED`, but it
may also be absent from accounting after cancellation before it started.

{{< callout type="note" title="Why a cancelled element can be missing" >}}
Slurm initially keeps pending array elements together in one job record. It
creates individual records as elements start or are modified. Cancelling one
while it still belongs to that group can remove it without leaving a separate
accounting row. `sacct --array` expands the records available; it cannot
reconstruct a missing one. The [Job Array Guide](https://slurm.schedmd.com/job_array.html#squeue)
explains how Slurm creates these records.

For this exercise, your recorded cancellation and the queue checks before
and after it explain the missing index. For an unexpected missing element,
check the submitted range, queue, logs, and result's job ID before deciding
what happened. Missing accounting alone is not proof of cancellation.
{{< /callout >}}

Recover the deliberately cancelled input by overriding the script's array
directive at submission time:

```bash
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" \
  --array=7 \
  array-job.sh)
RECOVERY_ID=${submission%%;*}
echo "$RECOVERY_ID"
```

The command-line `--array=7` overrides `#SBATCH --array=0-7%2`. This produces a
new array job containing just the selected index. Note its new ID so you can
find the logs and results of the rerun.

Check the rerun's state:

```bash
sacct --array -X -j "$RECOVERY_ID" \
  --format=JobID%24,JobIDRaw,State%20,ExitCode,Elapsed
```

Once it reports `COMPLETED` with `0:0`, read the result for index 7:

```bash
mapfile -t samples < inputs.txt
python3 -m json.tool "results/${samples[7]}.json"
cat "logs/particle-array-${RECOVERY_ID}_7.out"
cat "logs/particle-array-${RECOVERY_ID}_7.err"
```

Confirm that `array_task_id` is `7` and `job_id` matches the rerun's `JobIDRaw`.
The file may have existed before recovery, so these checks distinguish the
new result from an older one.

You can likewise recover several elements with a list or range, for example
`--array=1,4,6-7%2`. Always derive that list from accounting and output
validation together with any cancellations you recorded.

## Why Not a Submission Loop?

Calling `sbatch` once for every input in a shell loop sends a separate request
to Slurm for each job. With an array, the jobs share
one array ID, and `%M` limits how many run at once. You can inspect or cancel
the whole array or select individual elements.

An array is not automatically right for every repetition. Thousands of
commands taking less than a second still create thousands of jobs for Slurm
to schedule. The optional [Efficient Campaigns]({{< relref "/episodes/efficient-campaigns" >}})
episode shows when to bundle tiny work inside a smaller number of allocations.

## The Complete Workflow

You can now carry out the full beginner workflow:

1. find the partition, account, and submission rules for your cluster
1. submit a batch script with explicit resource requests
1. monitor state and pending reason
1. diagnose from accounting and logs
1. compare requested and consumed time, CPU, and memory
1. tune the next request
1. submit an array with a limit on simultaneous jobs and separate logs and results
1. recover only unsuccessful elements

For each result, you should be able to find the job that produced it, the
resources you requested, the amounts it used, and any errors it reported.

{{< challenge title="Choose how to submit the work" >}}
Choose an array, one multi-CPU job, or bundled tiny tasks for each case:

1. 500 independent simulations take about 30 minutes each and use the same
   request of one CPU and 1 GiB of memory.
1. One reconstruction program creates eight threads that cooperate on one
   input and share memory.
1. 20,000 independent checks each take less than one second.

{{< solution >}}
1. Use an array with a limit on simultaneous jobs. Each simulation is
   independent, runs long enough to justify a separate job, and needs the same
   resources.
1. Use one task with eight CPUs per task, provided measurements show the
   program benefits from eight threads.
1. Bundle many checks into fewer allocations. An array with 20,000 sub-second
   elements would spend disproportionate effort on job launch, scheduling, and
   accounting.
{{< /solution >}}
{{< /challenge >}}

{{< challenge title="Audit your finished campaign" >}}
For the eight intended inputs, produce evidence that:

- each input has a successful attempt after any necessary recovery
- every successful element has exit code zero
- every result belongs to the successful attempt you identified
- any deliberately cancelled attempt is accounted for, even if it has no
  separate accounting row
- no non-empty error log has been overlooked
- no more than two elements were intended to run at once

{{< solution >}}
First show the intended inputs and the script's concurrency limit:

```bash
nl -ba inputs.txt
grep '^#SBATCH --array=' array-job.sh
```

Expect eight labels and `#SBATCH --array=0-7%2`. Together with the submission
commands recorded earlier, this shows the intended two-element limit. It
does not retrospectively measure how many actually ran at every instant.

If you completed recovery, wait for all its jobs to finish. Use the practice
array for indices 0–6 and the single-element rerun for index 7:

```bash
sacct --array -X --noheader --parsable2 \
  -j "$RECOVERY_ARRAY_ID,$RECOVERY_ID" \
  --format=JobID%32,JobIDRaw%32,State%32,ExitCode > recovery-accounting.txt
python3 check_array.py "$RECOVERY_ARRAY_ID" \
  --recovery-id "$RECOVERY_ID" --recovery-index 7 \
  --accounting recovery-accounting.txt
```

The checker downloaded earlier should print eight `OK:` lines, identifying the
practice array for indices 0–6 and the rerun for index 7, followed by its
successful eight-input summary. This checks current result files against the
specific successful attempts and reads the sizes of their matching error logs.

Also retain the recorded cancellation of `${RECOVERY_ARRAY_ID}_7` and the
before/after queue checks. Those explain the cancelled attempt even if no
accounting row exists. The checker verifies successful results; it cannot
reconstruct a missing cancellation record.

If you skipped recovery, use this alternative instead:

```bash
sacct --array -X --noheader --parsable2 -j "$ARRAY_ID" \
  --format=JobID%32,JobIDRaw%32,State%32,ExitCode > array-accounting.txt
python3 check_array.py "$ARRAY_ID" --accounting array-accounting.txt
```

Run only the branch that matches the files currently in `results/`. A later
array submission replaces results with the same sample names; using an older
array ID should then fail the identity check. For a reported problem, inspect
the named log or result, resolve it, and refresh the accounting export before
checking again.
{{< /solution >}}
{{< /challenge >}}

{{< instructor >}}
Use the held submission to let learners inspect the array before cancelling
index 7. Ensure they release or cancel the remaining held jobs. A cancelled
pending element need not have its own accounting row: assess the recorded
target, queue checks, and successful single-element recovery rather than
requiring a `CANCELLED` row. Learners must check result job IDs because the
practice submissions reuse the same sample filenames.

In Slurm 25.11.8, the [pending-array cancellation code](https://github.com/SchedMD/slurm/blob/slurm-25-11-8-1/src/slurmctld/job_mgr.c#L5489-L5573)
removes selected pending indices from the shared record without logging a
separate completion for each removed index when other pending elements remain.
{{< /instructor >}}
