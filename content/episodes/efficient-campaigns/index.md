+++
title = "Extension: Efficient Campaigns"
weight = 70
teaching = 15
exercises = 10
questions = [
  "When are array elements too small to schedule individually?",
  "How can jobs express dependencies and prepare for interruption?",
  "When should campaign logic move to a workflow manager?"
]
objectives = [
  "Choose between arrays and bundling tiny tasks within one allocation.",
  "Run several one-CPU commands without exceeding the CPUs allocated to a job.",
  "Check that a bundle completed and produced a result for every input.",
  "Submit a dependent summary job and verify that it combines the intended results.",
  "Recognise notification, signal, and recovery patterns that depend on site policy.",
  "Identify when a workflow manager is easier to maintain than shell scripts that coordinate many jobs."
]
keypoints = [
  "Group very short commands into fewer jobs when Slurm would spend more time managing each job than the command spends doing useful work.",
  "Commands in a bundle share one Slurm job: cancelling that job affects them all. The script must limit simultaneous commands, keep their logs, and handle failures.",
  "Dependencies express simple ordering but do not replace output validation or a full workflow engine.",
  "Signals and notifications are useful only when the application and site are configured to act on them.",
  "Use a workflow manager when it becomes difficult to track job dependencies, retry failures, or rerun only the work affected by changed inputs or code."
]
+++

Arrays work well when each element runs long enough to justify a separate job
and needs the same resources. Slurm still has to schedule, start, and record
each element. If a command takes less time than this job-management work,
group several commands into one Slurm job instead. We call this **bundling**.

## Array or Bundle?

Prefer an array when:

- each unit is long enough to justify an individual job record
- every unit needs the same initial CPU, memory, and time request
- you need to inspect, cancel, or rerun individual units and see their resource use
- you want Slurm to limit how many units run at once

Prefer a bundle when:

- each unit is very short and lightweight
- one job can run several units at a time until all are finished
- a common time and memory request is acceptable
- your script can keep separate logs for each unit and record which need a rerun

There is no universal duration threshold. Measure launch overhead, filesystem
behaviour, controller limits, and application runtime at your site. A task that
is “tiny” on one cluster may not be tiny on another.

## Bundle the Demonstration Inputs

The course workload is artificially short, making it useful for demonstrating
the mechanics. Use the same eight labels in `inputs.txt` as in the
[array episode]({{< relref "/episodes/06-job-arrays" >}}). Work in your course
directory, where `particle_demo.py` and `site-settings.sh` are available.

### Prepare the Bundle Script

Download [bundle-job.sh](/files/slurm-course/bundle-job.sh) and
[bundle_results.py](/files/slurm-course/bundle_results.py) into your course
directory. The Python helper checks the results and will also be used by the
summary job later in this episode. Both files are complete and use only the
software already required for this course.

```bash
base_url="https://oer-particle-physics.github.io/slurm-workload-manager/files/slurm-course"
curl -fLO "$base_url/bundle-job.sh"
curl -fLO "$base_url/bundle_results.py"
```

Read `bundle-job.sh` before submitting it. The following excerpts show how
the script connects the CPU request to the number of commands it runs at once.
They are already in the downloaded file; submit that complete file in the
next section.

First, the resource request assigns four CPUs to one Slurm task:

```bash
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
```

The script uses that CPU count as its limit on simultaneous commands:

```bash
export SLURM_JOB_ID
export COURSE_WORKERS=$SLURM_CPUS_PER_TASK

xargs -P "$COURSE_WORKERS" -n 1 bash -c '
  set -euo pipefail
  sample=$1
  python3 particle_demo.py \
    --sample "$sample" \
    --workers 1 \
    --seconds 4 \
    --memory-mib 32 \
    --output "results/bundle-${SLURM_JOB_ID}/${sample}.json" \
    > "logs/bundle-${SLURM_JOB_ID}-${sample}.out" \
    2> "logs/bundle-${SLURM_JOB_ID}-${sample}.err"
' _ < inputs.txt
```

`xargs -P 4` keeps at most four one-worker commands active and starts another
as each finishes, until all eight inputs
are processed. `-n 1` passes one input label to each command; the `_` fills
Bash's `$0` so the label becomes `$1`. This example uses the course's simple
labels, which contain no spaces or shell quoting characters.

Each command explicitly uses `--workers 1`. Otherwise, the demonstration
program would default to `SLURM_CPUS_PER_TASK=4`, making each of the four
commands start four workers. The memory request must cover every process
running at the same time, including Python and the script itself.

The program creates `results/bundle-JOB_ID/` for this submission, keeping its
results separate from earlier array and bundle runs. Each input also has its
own output and error log, named with the job ID and sample label. Add any
Python environment setup from your site note before the `xargs` command.

### Submit and Wait for Completion

Create the directories and submit from your course directory:

```bash
mkdir -p logs results
source site-settings.sh
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" bundle-job.sh)
BUNDLE_ID=${submission%%;*}
echo "$BUNDLE_ID"
squeue -j "$BUNDLE_ID"
```

Wait while the job is pending, running, or completing. When it leaves the
queue, check its final state:

```bash
sacct -X -j "$BUNDLE_ID" --format=JobID,State,ExitCode,Elapsed,AllocCPUS
```

Expect `COMPLETED` and exit code `0:0`. Accounting can take a short time to
update; if the record is missing or still says `RUNNING`, wait and check again.
`-X` omits job-step rows. All eight commands run inside the batch script, so
there is one job record, with no separate Slurm record for each input.

### Check the Logs and All Eight Results

Inspect the job's error log and the per-input logs:

```bash
cat "logs/particle-bundle-${BUNDLE_ID}.err"
cat logs/bundle-"${BUNDLE_ID}"-*.err
cat logs/bundle-"${BUNDLE_ID}"-*.out
```

For a successful run, the error logs should be empty and the output logs
should contain eight summary lines, one per sample, each reporting
`workers=1`. The job's overall `.out` file can be empty because each Python
command writes to its own log.

Now run the supplied checker. It reads `inputs.txt` and verifies the sample
label, job ID, and worker count in every expected JSON result:

```bash
python3 bundle_results.py "$BUNDLE_ID"
```

With the unchanged course input list, expect eight `OK:` lines followed by
`Checked all 8 results for bundle ...`, with your job ID. The check stops at
the first missing, unreadable, or mismatched result and reports `FAIL:`.
It also rejects an empty input list or repeated labels.
Inspect a complete result as well:

```bash
cat "results/bundle-${BUNDLE_ID}/dyjets_chunk_001.json"
```

All eight results should share the bundle's `job_id`, have
`array_task_id: null`, and report `workers: 1`. Hostnames, timings, and simulated
event counts will vary. Completion, clean logs, and eight verified results
together show that this demonstration ran as intended; they do not validate
a real analysis's scientific conclusions.

If the job failed or a result check reports a problem, inspect the affected
sample's `.err` file and the job's error log. Missing logs can also indicate
that the job never started; follow the
[diagnosis steps]({{< relref "/episodes/03-monitor-diagnose" >}}).
A failed command makes `xargs` return a non-zero status, and `set -e` makes
the batch script fail. Other commands may still finish and leave valid
results. The script does not automatically retry failed inputs; identify
which need another attempt before resubmitting. The
[GNU `xargs` documentation](https://www.gnu.org/software/findutils/manual/html_node/find_html/Invoking-xargs.html)
lists its exit codes.

{{< callout type="warning" title="Bundling moves responsibility into the script" >}}
The script assigns inputs to workers, limits how many commands run at once,
names their logs, and decides what happens if a command fails. For longer
commands, an array often makes this easier: Slurm records each element's state,
and you can rerun failed elements individually.
{{< /callout >}}

### One Input or the Whole Campaign?

The bundle runs up to four inputs at once, with one worker per input. This can
finish the whole list sooner without making any individual input faster:

- **Time to solution** is how long it takes to finish one input.
- **Throughput** is how many inputs finish successfully per unit of time,
  such as inputs per hour.

Bundling also reduces the number of jobs Slurm must start. To measure whether
this helps a real analysis, compare the same inputs and application settings
with the same CPU and memory budget and the same limit on simultaneous inputs.
Count only results that pass validation.

The course examples are not a direct performance comparison: the array allows
two inputs at once and uses `--seconds 8`, while this bundle allows four and
uses `--seconds 4`. The demonstration program runs for that configured duration
per worker; it does not process a fixed amount of analysis work. Use a
representative analysis to measure performance.

## Express Simple Ordering with Dependencies

The bundle produces eight JSON files. A second job can collect them into one
report, but it must wait until the bundle succeeds. An **`afterok` dependency**
expresses this order: Slurm makes the summary job eligible to run only after
the bundle finishes with exit code zero.

This exercise uses `bundle-job.sh` from the preceding section. Check that your
saved copy uses `--output "results/bundle-${SLURM_JOB_ID}/${sample}.json"`;
an earlier copy that writes directly into `results/` will not provide the
directory the summary reads. Keep `inputs.txt` unchanged until both jobs finish.

The supplied `bundle_results.py` can also collect the validated results into
one report. Its `--summary-job-id` option names that report using the summary
job's own ID. The report records both job IDs, the sample count, and all eight
input results.

Before doing the exercise, read the key submission command from its worked
solution. The exercise prepares `summary-job.sh` and captures the producer's
job ID as `ANALYSIS_ID` before running this command:

```bash
sbatch "${SLURM_SITE_ARGS[@]}" \
  --dependency="afterok:${ANALYSIS_ID}" \
  --kill-on-invalid-dep=yes \
  summary-job.sh "$ANALYSIS_ID"
```

The producer's ID appears twice for two purposes:

- `--dependency="afterok:${ANALYSIS_ID}"` tells Slurm when the summary may run.
- `"$ANALYSIS_ID"` after the script name becomes its first argument, `$1`, and
  tells the script which bundle's files to read.

The dependency controls scheduling; the script argument selects the data.
`--kill-on-invalid-dep=yes` asks Slurm to cancel the summary if the producer
fails or is cancelled, so the summary does not remain pending indefinitely.

{{< challenge title="Run a summary after a successful bundle" >}}
Create `summary-job.sh` with one task, one CPU, 256 MiB of memory, a two-minute
time limit, and separate logs named with its job ID. Have it accept the
producer bundle's job ID as its first argument and run:

```bash
python3 bundle_results.py "$bundle_id" --summary-job-id "$SLURM_JOB_ID"
```

Submit a fresh bundle on hold so you can inspect the dependency before any
work starts. Submit the summary with `--dependency="afterok:..."`, inspect the
two jobs, then release the bundle. Confirm both jobs succeed and that the
summary contains eight results from the intended bundle.

{{< solution >}}
A complete [summary-job.sh](/files/slurm-course/summary-job.sh) is available for
download. It uses the `bundle_results.py` downloaded earlier, so keep both
files in your shared course directory:

```bash
base_url="https://oer-particle-physics.github.io/slurm-workload-manager/files/slurm-course"
curl -fLO "$base_url/summary-job.sh"
```

The complete batch script is:

```bash
#!/usr/bin/env bash
#SBATCH --job-name=particle-summary
#SBATCH --time=00:02:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=256M
#SBATCH --output=logs/%x-%j.out
#SBATCH --error=logs/%x-%j.err

set -euo pipefail
bundle_id=${1:?Pass the producer bundle job ID as the first argument}

python3 bundle_results.py "$bundle_id" --summary-job-id "$SLURM_JOB_ID"
```

Add any Python environment setup from your site note before the Python
command, as you did for the earlier jobs. The helper exits with a non-zero
status if any result is missing, invalid JSON, or has the wrong sample, job
ID, or worker count. With `set -e`, that also fails the summary job. It writes
`results/summary-JOB_ID.json` only after all inputs pass these checks.

First submit the bundle on hold:

```bash
mkdir -p logs results
source site-settings.sh
analysis_submission=$(sbatch --parsable --hold \
  "${SLURM_SITE_ARGS[@]}" bundle-job.sh)
ANALYSIS_ID=${analysis_submission%%;*}
echo "Bundle: $ANALYSIS_ID"
```

Continue only after submission succeeds and you have a valid `ANALYSIS_ID`.
Then submit its dependent summary:

```bash
summary_submission=$(sbatch --parsable \
  "${SLURM_SITE_ARGS[@]}" \
  --dependency="afterok:${ANALYSIS_ID}" \
  --kill-on-invalid-dep=yes \
  summary-job.sh "$ANALYSIS_ID")
SUMMARY_ID=${summary_submission%%;*}
echo "Summary: $SUMMARY_ID"
```

If either submission fails, stop and resolve its error before continuing. If
the bundle was accepted but the summary was not, it remains held: either fix
and retry the summary submission with the same `ANALYSIS_ID`, or cancel the
held bundle with `scancel "$ANALYSIS_ID"`.

Inspect both jobs before releasing the bundle:

```bash
squeue -j "$ANALYSIS_ID,$SUMMARY_ID" -o "%.18i %.24j %.2t %R"
scontrol show job "$SUMMARY_ID"
```

The bundle should be pending because it is held, and the summary should be
pending for `Dependency`. In the summary's job record, `Dependency` should
refer to `afterok` and your `ANALYSIS_ID`. Release the bundle:

```bash
scontrol release "$ANALYSIS_ID"
squeue -j "$ANALYSIS_ID,$SUMMARY_ID"
```

Once the bundle succeeds, the dependency is satisfied. The summary may still
wait for resources or priority; eligibility does not guarantee an immediate
start. Check the queue manually until both jobs finish, then inspect accounting:

```bash
sacct -X -j "$ANALYSIS_ID,$SUMMARY_ID" \
  --format=JobID,JobName%24,State,ExitCode,Start,End
```

Expect two `COMPLETED` records with `0:0`. The summary's start time should be
at or after the bundle's end time. Allow for accounting updates before
interpreting missing records. Read the summary's logs and report:

```bash
cat "logs/particle-summary-${SUMMARY_ID}.out"
cat "logs/particle-summary-${SUMMARY_ID}.err"
python3 -m json.tool "results/summary-${SUMMARY_ID}.json"
```

The output log should report `8 results from bundle` followed by your
`ANALYSIS_ID`; the error log should be empty. In the report, check that:

- `bundle_job_id` matches `ANALYSIS_ID`;
- `summary_job_id` matches `SUMMARY_ID`;
- `sample_count` is `8`;
- `results` contains the eight labels from `inputs.txt`, each with the bundle's
  job ID and `workers: 1`.

The report collects the demonstration results; it does not turn their simulated
event counts into a physical measurement.

If the bundle fails or is cancelled, `afterok` cannot be satisfied.
`--kill-on-invalid-dep=yes` asks Slurm to cancel that summary instead of
leaving it pending indefinitely. Inspect the bundle's logs to find the cause.
If the summary itself fails, its error log identifies a missing or mismatched
input. Correct the problem before submitting another attempt. If you stop
before releasing the bundle, cancel both practice jobs:

```bash
scancel "$ANALYSIS_ID" "$SUMMARY_ID"
```
{{< /solution >}}
{{< /challenge >}}

### Other Dependency Types

Useful dependency types include:

- `afterok`: start after successful completion
- `afterany`: start after completion in any state
- `afternotok`: start after a failure state
- `aftercorr`: let each array element start after the element with the same
  index in another array succeeds

Check the current [`sbatch --dependency` documentation](https://slurm.schedmd.com/sbatch.html#OPT_dependency)
for the precise conditions each dependency requires. A dependency that can
never be satisfied may remain pending, depending on submission options and
cluster configuration.

Dependencies order jobs; they do not prove that expected files are complete,
valid, or scientifically correct. That is why the summary script checks every
input even though it has an `afterok` dependency. For an array, `afterok` with
the array's master ID waits for all elements to finish successfully; the
summary's validation must then account for each element's own job ID. See
the [Job Array Guide](https://slurm.schedmd.com/job_array.html)
for array dependency behaviour.

## Notifications and Time-Limit Signals

Slurm can request email notifications:

```bash
#SBATCH --mail-type=END,FAIL,TIME_LIMIT
#SBATCH --mail-user=you@example.org
```

Mail works only if the cluster configures delivery. Avoid per-element mail for
large arrays unless you truly need it; a campaign can otherwise generate a
storm of messages.

Some applications can save their progress to a file and resume from it later;
this is called **checkpointing**. Slurm can send a signal before the time limit
so the application has a chance to save that progress:

```bash
#SBATCH --signal=B:USR1@60
```

The batch shell can trap it:

```bash
checkpoint_requested=false
trap 'checkpoint_requested=true' USR1
```

The signal alone does not save progress. The application must write all the
information needed to resume, the script must wait for the write to finish,
and the next job must read the saved state. The signal may arrive earlier than
the requested interval before the time limit. Test saving and restarting on
your cluster before relying on it.

## When a Workflow Manager Is the Better Tool

A few Slurm dependencies are manageable in shell. Move to a workflow manager
when the campaign develops:

- many stages that depend on each other's results
- a need to track which inputs and code produced each output, and check those outputs
- automatic retries of failed work
- a need to rerun only the stages affected when inputs or code change
- different resource requests per stage
- different software environments or files that must be copied between locations

The [Snakemake for Particle Physics](https://oer-particle-physics.github.io/snakemake-particle-physics/)
course demonstrates one such system. A workflow manager should submit sensible
Slurm jobs; it does not remove the need to understand resources, logs,
accounting, and cluster policy.

{{< challenge title="Group short commands into jobs" >}}
You have 12,000 independent commands. Each takes 0.4 seconds, uses one CPU, and
needs 20 MiB. The node type has at least 32 CPUs. Outline a better first test
than a 12,000-element array.

{{< solution >}}
Start with a small representative benchmark that requests several CPUs in one
allocation and runs no more one-CPU commands concurrently than were allocated.
Group many inputs into each allocation, keep per-input output/error and a
list of successful inputs, and request enough memory for all processes running
at once. Measure how many inputs finish per hour and how much time is spent
starting commands before choosing the number and size of bundles.
Do not jump directly to a full 12,000-unit campaign.
{{< /solution >}}
{{< /challenge >}}

{{< instructor >}}
`xargs -P` is used because it is widely available on Linux and keeps the
limit on simultaneous commands visible. Discuss what would need to change
before using this script for a large dataset.
Discuss how a failed subcommand, uneven durations, and log volume complicate a
bundle; these trade-offs explain why arrays remain the default for substantial
work units.
{{< /instructor >}}
