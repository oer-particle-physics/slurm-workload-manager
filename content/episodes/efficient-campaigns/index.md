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
  "Use job dependencies to represent simple ordering.",
  "Recognise notification, signal, and recovery patterns that depend on site policy.",
  "Identify when a workflow manager is safer than hand-written orchestration."
]
keypoints = [
  "Bundle genuinely tiny tasks when per-element scheduling overhead would dominate useful work.",
  "A bundle has one allocation and shared fate; it needs its own concurrency, logging, and failure handling.",
  "Dependencies express simple ordering but do not replace output validation or a full workflow engine.",
  "Signals and notifications are useful only when the application and site are configured to act on them.",
  "Use a workflow manager when dependencies, retries, provenance, and incremental recomputation become substantial."
]
+++

Arrays are efficient for many substantial jobs with the same resource shape.
They are not free: each element still has a job record, priority evaluation,
launch, completion, and accounting. If each useful command takes less time than
that surrounding machinery, use a larger unit of work.

This episode calls the pattern **bundling tiny tasks within one allocation**.
Some presentations use “packed jobs”, but Slurm also uses “pack” and older
“pack job” terminology for other features. The descriptive name avoids that
ambiguity.

## Array or Bundle?

Prefer an array when:

- each unit is long enough to justify an individual job record
- every unit has the same initial resource shape
- per-unit state, cancellation, retry, and accounting matter
- the units can be throttled independently

Prefer a bundle when:

- each unit is very short and lightweight
- one allocation can run many units in waves
- a common time and memory request is acceptable
- you are willing to implement per-unit logs and recovery

There is no universal duration threshold. Measure launch overhead, filesystem
behaviour, controller limits, and application runtime at your site. A task that
is “tiny” on one cluster may not be tiny on another.

## Bundle the Demonstration Inputs

The course workload is artificially short, making it useful for demonstrating
the mechanics. Create `bundle-job.sh`:

```bash
#!/usr/bin/env bash
#SBATCH --job-name=particle-bundle
#SBATCH --time=00:05:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=512M
#SBATCH --output=logs/%x-%j.out
#SBATCH --error=logs/%x-%j.err

set -euo pipefail

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
    --output "results/${sample}.json" \
    > "logs/bundle-${SLURM_JOB_ID}-${sample}.out" \
    2> "logs/bundle-${SLURM_JOB_ID}-${sample}.err"
' _ < inputs.txt
```

One Slurm task owns four CPUs. `xargs -P 4` keeps at most four one-worker
commands active, so the bundle does not intentionally exceed its allocation.
Eight inputs run in two waves. The memory request must cover all concurrent
processes plus interpreter and script overhead, not just one input.

Create `logs` and `results` before submission, then run:

```bash
source site-settings.sh
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" bundle-job.sh)
BUNDLE_ID=${submission%%;*}
echo "$BUNDLE_ID"
```

After completion, audit the overall job and every per-input log. With
`set -e`, a non-zero `xargs` result makes the bundle fail, but Slurm accounting
still records one job rather than eight independently recoverable elements.

{{< callout type="warning" title="Bundling moves responsibility into the script" >}}
The script—not Slurm—maps inputs to workers, caps concurrency, names logs, and
decides how one failed command affects the bundle. For long or valuable units,
an array's per-element state and selective recovery are usually worth the
additional job records.
{{< /callout >}}

## Express Simple Ordering with Dependencies

Suppose a summary job must run only after the entire analysis array succeeds.
Submit the array, capture its ID, and attach an `afterok` dependency to the
summary submission:

```bash
analysis_submission=$(sbatch --parsable \
  "${SLURM_SITE_ARGS[@]}" array-job.sh)
analysis_id=${analysis_submission%%;*}

summary_submission=$(sbatch --parsable \
  "${SLURM_SITE_ARGS[@]}" \
  --dependency="afterok:${analysis_id}" \
  summary-job.sh)
summary_id=${summary_submission%%;*}
```

The summary remains pending with reason `Dependency` until the condition is
satisfied. Useful dependency types include:

- `afterok`: start after successful completion
- `afterany`: start after completion in any state
- `afternotok`: start after a failure state
- `aftercorr`: relate corresponding elements of two arrays

Check the current [`sbatch --dependency` documentation](https://slurm.schedmd.com/sbatch.html#OPT_dependency)
for exact semantics. A dependency that can never be satisfied may remain
pending, depending on submission options and cluster configuration.

Dependencies order jobs; they do not prove that expected files are complete,
valid, or scientifically correct. A summary script must still validate its
inputs.

## Notifications and Time-Limit Signals

Slurm can request email notifications:

```bash
#SBATCH --mail-type=END,FAIL,TIME_LIMIT
#SBATCH --mail-user=you@example.org
```

Mail works only if the cluster configures delivery. Avoid per-element mail for
large arrays unless you truly need it; a campaign can otherwise generate a
storm of messages.

For applications that can checkpoint, Slurm can send a signal before the time
limit:

```bash
#SBATCH --signal=B:USR1@60
```

The batch shell can trap it:

```bash
checkpoint_requested=false
trap 'checkpoint_requested=true' USR1
```

This is not automatic checkpointing. The application must write a consistent,
restartable state, the script must wait for that write to finish, and the next
job must know how to resume. Signal timing has limited resolution and can occur
earlier than the nominal lead time. Test the entire recovery path with local
policy before relying on it.

## When a Workflow Manager Is the Better Tool

A few Slurm dependencies are manageable in shell. Move to a workflow manager
when the campaign develops:

- a graph of many dependent stages
- file-level provenance and validity checks
- automatic selective retries
- incremental recomputation after inputs or code change
- different resource requests per stage
- software-environment and data-movement requirements

The [Snakemake for Particle Physics](https://oer-particle-physics.github.io/snakemake-particle-physics/)
course demonstrates one such system. A workflow manager should submit sensible
Slurm jobs; it does not remove the need to understand resources, logs,
accounting, and cluster policy.

{{< challenge title="Design a campaign shape" >}}
You have 12,000 independent commands. Each takes 0.4 seconds, uses one CPU, and
needs 20 MiB. The node type has at least 32 CPUs. Outline a better first test
than a 12,000-element array.

{{< solution >}}
Start with a small representative benchmark that requests several CPUs in one
allocation and runs no more one-CPU commands concurrently than were allocated.
Group many inputs into each allocation, keep per-input output/error and a
manifest of successes, and size memory for all concurrent processes. Measure
throughput and launch overhead before choosing the number and size of bundles.
Do not jump directly to a full 12,000-unit campaign.
{{< /solution >}}
{{< /challenge >}}

{{< instructor >}}
`xargs -P` is used because it is widely available on Linux and keeps the
concurrency rule visible. It is an example, not a universal production runner.
Discuss how a failed subcommand, uneven durations, and log volume complicate a
bundle; these trade-offs explain why arrays remain the default for substantial
work units.
{{< /instructor >}}
