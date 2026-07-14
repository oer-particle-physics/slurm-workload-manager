+++
title = "Resource Requests and Efficient Use"
weight = 40
teaching = 20
exercises = 10
questions = [
  "How do time, memory, tasks, and CPUs per task describe my workload?",
  "How can accounting data improve the next request?",
  "Why can a realistic request start sooner and use the cluster better?"
]
objectives = [
  "Choose resource options for serial and shared-node parallel applications.",
  "Relate `--ntasks` and `--cpus-per-task` to application processes and workers.",
  "Interpret elapsed time, total CPU time, requested memory, and maximum resident memory from `sacct`.",
  "Revise a completed job's request while retaining practical headroom.",
  "Apply portable shared and node-local storage principles."
]
keypoints = [
  "`--time` is an enforced upper bound; `--mem` and CPU options are resource requests, not performance hints.",
  "Use one task with one CPU for a serial program and one task with multiple CPUs for a threaded or shared-node worker program.",
  "Tune from repeated accounting evidence and keep justified headroom rather than copying defaults or requesting the maximum.",
  "Realistic requests give the scheduler more placement options and reduce wasted shared resources.",
  "Storage paths are site-specific: discover which filesystems are shared or node-local and follow their cleanup policy."
]
+++

Slurm cannot observe the future. At submission time, you describe the largest
allocation the job may need. The scheduler must reserve that combination of
time, CPUs, memory, and other resources even if the application uses only a
small fraction of it.

Right-sizing is therefore an iterative research skill:

1. make a small, safe initial request
1. run a representative test
1. inspect what happened
1. add justified headroom
1. repeat before launching a campaign

## Walltime Is a Limit

```bash
#SBATCH --time=00:10:00
```

This says “terminate the job if it runs for more than ten minutes.” It does not
reserve exactly ten minutes and does not promise a start time. Slurm releases
the allocation when the job finishes early.

Many clusters use backfill scheduling: a lower-priority job can run in a gap if
it will not delay work already planned to start. A realistic time limit gives
the scheduler more gaps in which the job can fit. A one-hour job submitted with
a seven-day limit is much harder to place as short work, even though it will
eventually finish early.

Keep enough headroom for normal variation, I/O, and cleanup. “As short as
possible” is not the same as “shorter than the job can reliably finish”.

## Memory Is Part of the Allocation

For the single-node jobs in this course:

```bash
#SBATCH --mem=256M
```

requests memory for the job on its node. Slurm also supports
`--mem-per-cpu`, which scales the request with allocated CPUs. These options
are mutually exclusive, and local defaults and enforcement differ. Use the
form recommended by your site and be explicit for memory-sensitive work.

The quantity most useful for tuning is normally maximum **resident** memory:
physical RAM occupied at the measured peak. Virtual address space can be much
larger and is not a direct replacement for `MaxRSS`.

## Tasks Are Not CPUs

The most important beginner distinction is:

- `--ntasks`: how many application processes Slurm should be able to launch
- `--cpus-per-task`: how many CPUs each task needs for threads or local workers

Common shapes are:

| Application shape | Typical request |
|---|---|
| Serial program | `--ntasks=1 --cpus-per-task=1` |
| One threaded process | `--ntasks=1 --cpus-per-task=N` |
| One process with N local worker processes | `--ntasks=1 --cpus-per-task=N` |
| MPI program | commonly `--ntasks=N --cpus-per-task=1` |
| Hybrid MPI + threads | multiple tasks and multiple CPUs per task |

The last two shapes depend on MPI and site configuration and are treated in an
optional episode. For now, stay within one node and one Slurm task.

Requesting four CPUs does not make a serial program four times faster. The
application must actually create threads or workers and must be told how many
to use. Conversely, launching four workers after requesting one CPU
oversubscribes the allocation and competes for a resource the job did not
request.

The official [CPU Management Guide](https://slurm.schedmd.com/cpu_management.html)
documents the interactions in detail. Those interactions are constrained by
the site's Slurm configuration, so start with these explicit common shapes.

## Run the Course Workload with Four Workers

Copy `first-job.sh` to `parallel-job.sh`. Change these lines:

```bash
#SBATCH --job-name=particle-parallel
#SBATCH --cpus-per-task=4
#SBATCH --mem=256M
```

Replace the application command with:

```bash
srun python3 particle_demo.py \
  --sample parallel-check \
  --seconds 8 \
  --memory-mib 64 \
  --output results/parallel-check.json
```

There is deliberately no `--workers` argument. The program reads
`SLURM_CPUS_PER_TASK`, so the allocation and application agree.

Submit and capture the ID:

```bash
source site-settings.sh
submission=$(sbatch --parsable "${SLURM_SITE_ARGS[@]}" parallel-job.sh)
PARALLEL_ID=${submission%%;*}
echo "$PARALLEL_ID"
```

After completion, inspect the log and result:

```bash
cat "logs/particle-parallel-$PARALLEL_ID.out"
cat results/parallel-check.json
```

Both should report four workers. This verifies the resource count reached the
application; it does not by itself prove that four workers are faster for a
real scientific program. Benchmark representative inputs before choosing a
parallel shape.

## Read the Accounting Evidence

Request both allocation and use fields:

```bash
sacct -j "$PARALLEL_ID" \
  --format=JobID,JobName%20,State,Elapsed,Timelimit,AllocCPUS,TotalCPU,ReqMem,MaxRSS
```

Interpret them as follows:

**Elapsed**
: Wall-clock duration of the job or step.

**Timelimit**
: Maximum walltime requested or imposed for the job.

**AllocCPUS**
: CPUs allocated to the job or step.

**TotalCPU**
: Sum of user and system CPU time consumed. Four busy CPUs can accumulate
  roughly four CPU-seconds during one elapsed second.

**ReqMem**
: Requested memory. Depending on output and configuration, a suffix may
  indicate whether it was expressed per CPU or per node.

**MaxRSS**
: Maximum resident memory measured for a task in the job step. It often appears
  on `.batch` or an `srun` step row rather than the top-level job row.

A useful CPU-efficiency idea is:

```text
TotalCPU / (Elapsed × AllocCPUS)
```

Do not expect an exact 100%. Startup, I/O, serial sections, load imbalance,
measurement resolution, and CPU topology all matter. The question is whether
the observation is consistent with the program's expected behaviour.

`MaxRSS` is also sampled and can miss short peaks. Keep headroom for input
variation and interpreter or library overhead; do not set the next request
equal to one observed byte count.

{{< callout type="note" title="Short training jobs are noisy measurements" >}}
This course workload is intentionally brief. CPU and memory accounting may be
coarse, delayed, or absent for very short steps. The method—measure a
representative job, compare request and use, then tune—is more important than
the exact training number.
{{< /callout >}}

## Demonstrate an Over-Request

Make a second copy called `over-requested-job.sh`. Keep
`--cpus-per-task=4`, but force the application to use one worker:

```bash
srun python3 particle_demo.py \
  --sample over-requested \
  --workers 1 \
  --seconds 8 \
  --memory-mib 64 \
  --output results/over-requested.json
```

Submit it and compare `AllocCPUS`, `Elapsed`, and `TotalCPU` with the four-worker
job. The one-worker application cannot use the other three allocated CPUs. A
real campaign of such jobs would reserve capacity it does not use.

## Storage: Learn the Site Before Staging Data

Slurm allocates compute resources; it does not automatically move your input
and output files. A cluster commonly offers some combination of:

- a shared home, project, or work filesystem visible on all nodes
- node-local temporary storage, visible only within one compute node
- object, tape, or experiment-specific storage accessed through other tools

Portable principles are:

1. Keep the source script and durable outputs on approved shared/project
   storage.
1. Use node-local storage for intensive temporary I/O only when local
   documentation recommends it.
1. Create a job-specific temporary directory and set `TMPDIR` if the site asks
   you to.
1. Copy validated results out before cleanup.
1. Clean temporary files even when the script exits unexpectedly.

A site that defines a suitable `$TMPDIR` may recommend a pattern like:

```bash
job_tmp=$(mktemp -d "${TMPDIR%/}/slurm-${SLURM_JOB_ID}.XXXXXX")
trap 'rm -rf "$job_tmp"' EXIT
```

Do not use this merely because it appears here. First confirm that `$TMPDIR`
is defined for jobs, has enough space, is node-local if that is what you need,
and permits this cleanup pattern.

{{< callout type="note" title="PSI storage example" >}}
The PSI Tier-3 guidance recommends job-specific directories on its node-local
`/scratch`, setting `TMPDIR`, performing intensive I/O locally, copying durable
results to shared storage, and cleaning up. The transferable lesson is the
stage/use/copy/clean lifecycle; `/scratch` itself is a PSI path, not a Slurm
standard.
{{< /callout >}}

{{< challenge title="Revise a fictional request" >}}
A stable serial job was submitted with 4 CPUs, 2 GiB of memory, and a one-hour
time limit. Several representative runs report approximately:

```text
Elapsed   AllocCPUS  TotalCPU  ReqMem  MaxRSS  State
00:01:05  4          00:01:02  2G      180M    COMPLETED
```

What would you test next, and what should you avoid claiming from this one
line?

{{< solution >}}
Test a request with one CPU because total CPU time is close to elapsed time,
which is consistent with serial execution. Test a much smaller memory request
with sensible headroom above 180 MiB, for example a site-supported value around
256–384 MiB, and a time limit of a few minutes rather than an hour if repeated
inputs show similar runtime.

Do not claim a universally correct memory or walltime from one job. Input
variation, sampling, startup, failures, and site policy still need to be
considered. Do not claim four CPUs made the serial job faster.
{{< /solution >}}
{{< /challenge >}}

{{< instructor >}}
The Python workload creates threads and reads `SLURM_CPUS_PER_TASK`, but the
short run is not intended as a scaling benchmark. Focus the debrief on matching
the application's execution model to the request and on using multiple
observations. If accounting is sparse, use the result's worker count plus a
prepared `sacct` record.
{{< /instructor >}}
