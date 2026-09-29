+++
title = "Resource Requests and Efficient Use"
weight = 50
aliases = ["/episodes/04-resources-efficiency/"]
teaching = 20
exercises = 10
questions = [
  "How do time, memory, tasks, and CPUs per task describe my workload?",
  "How can accounting data improve the next request?",
  "Why can a realistic request start sooner and use the cluster better?"
]
objectives = [
  "Choose resource options for programs using one CPU or several CPUs on one node.",
  "Relate `--ntasks` and `--cpus-per-task` to application processes and workers.",
  "Interpret elapsed time, total CPU time, requested memory, and maximum resident memory from `sacct`.",
  "Use a completed job's measurements to improve the next request, allowing extra time and memory for variation.",
  "Choose storage that keeps inputs accessible and results available after the job ends."
]
keypoints = [
  "`--time` limits how long the job can run; memory and CPU options tell Slurm which resources to assign to it.",
  "Use one task with one CPU for a serial program and one task with multiple CPUs for a threaded or shared-node worker program.",
  "Adjust requests using measurements from several runs, allowing extra time and memory for variation.",
  "Realistic requests can fit on more available nodes or into shorter gaps in the schedule, and reduce unused allocations.",
  "Storage paths are site-specific: discover which filesystems are shared or node-local and follow their cleanup policy."
]
+++

When you submit a job, Slurm uses your request to find nodes with enough CPUs,
memory, and other resources for the requested time. It plans for the full
request even if your program will use only a small fraction of it.

To choose suitable amounts, work through a few test runs:

1. make a small, safe initial request
1. run a representative test
1. compare the resources requested with those actually used
1. allow some extra time and memory for differences between runs
1. repeat before submitting many jobs

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

Allow extra time for differences between inputs, reading and writing files,
and cleanup. This margin is often called **headroom**. Choose a limit that
lets the job finish reliably.

## Memory Is Part of the Allocation

For the single-node jobs in this course:

```bash
#SBATCH --mem=256M
```

requests memory for the job on its node. Slurm also supports
`--mem-per-cpu`, which scales the request with allocated CPUs. These options
cannot be used together. Defaults and the way limits are enforced differ
between clusters, so use the form recommended by your site.

The quantity most useful for tuning is normally maximum **resident** memory:
physical RAM occupied at the measured peak. Virtual address space can be much
larger and is not a direct replacement for `MaxRSS`.

## Tasks Are Not CPUs

The most important beginner distinction is:

- `--ntasks`: how many application processes Slurm should be able to launch
- `--cpus-per-task`: how many CPUs each task needs for threads or local workers

Common combinations are:

| How the program runs | Typical request |
|---|---|
| Serial program | `--ntasks=1 --cpus-per-task=1` |
| One threaded process | `--ntasks=1 --cpus-per-task=N` |
| One process with N local worker processes | `--ntasks=1 --cpus-per-task=N` |

These examples stay within one node and one Slurm task. Applications that use
[MPI or GPUs]({{< relref "/reference" >}}#mpi-and-gpu-applications) need additional
application and site instructions.

Requesting four CPUs does not make a serial program four times faster. The
application must actually create threads or workers and must be told how many
to use. Launching four workers after requesting one CPU makes them compete for
that CPU. Running more workers than the allocated CPUs can support is called
**oversubscription**.

{{< callout type="note" title="What does Slurm count as a CPU?" >}}
A Slurm CPU can represent a physical core or one hardware thread of a core,
depending on cluster configuration. Hardware threads on the same core share
its execution resources, so four allocated CPUs do not necessarily mean four
physical cores. Check your site's definition when interpreting CPU requests
and accounting records.
{{< /callout >}}

The official [CPU Management Guide](https://slurm.schedmd.com/cpu_management.html)
documents these options in detail. The combinations above are a starting
point; check your site's instructions for how to use them on your cluster.

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
combination of tasks and CPUs.

## Read the Accounting Evidence

Show both the resources assigned to the job and the amounts it used:

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

Do not expect an exact 100%. CPUs can wait while the program starts, reads or
writes files, or finishes work that only one worker can do. Workers may also
finish at different times. Measurement precision and the way Slurm counts CPUs
affect the result. Compare it with how you expect the program to use its CPUs.

`MaxRSS` is also sampled and can miss short peaks. Keep headroom for input
variation and memory used by Python or its libraries; do not set the next
request equal to a single measured peak.

{{< callout type="note" title="Measurements from short jobs can be imprecise" >}}
This course workload is intentionally brief. CPU and memory accounting may be
imprecise, delayed, or absent for very short steps. Practise measuring a
representative job, comparing its request with its use, and adjusting the next
request. Use several runs before drawing conclusions from the numbers.
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
large set of such jobs would tie up CPUs that the programs do not use.

## Storage: Check Where Your Files Belong {#storage-learn-the-site-before-staging-data}

Slurm allocates compute resources; it does not automatically move your input
and output files. A cluster commonly offers some combination of:

- a shared home, project, or work filesystem visible on all nodes
- node-local temporary storage, visible only within one compute node
- object, tape, or experiment-specific storage accessed through other tools

Follow these steps using the paths recommended by your site:

1. Keep the script and results you need after the job ends on approved shared
   or project storage.
1. Use node-local storage for temporary files that the program reads or writes
   frequently only when local documentation recommends it.
1. Create a job-specific temporary directory and set `TMPDIR` if the site asks
   you to.
1. Check the results and copy them to shared storage before deleting temporary
   files.
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
The [PSI Tier-3 storage guide](https://tier3.pages.psi.ch/storage/Tier3Storage/)
recommends using node-local `/scratch` for intensive I/O and moving completed
results to their final storage. Its
[CPU job examples](https://tier3.pages.psi.ch/batch-jobs/CPUExamples/)
show how to create a directory for each job, set `TMPDIR`, and clean up.
Follow that sequence using paths documented for your cluster; Slurm does not
guarantee a `/scratch` directory.
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
the number of application workers to the requested CPUs and on using multiple
measurements. If accounting has few measurements, use the result's worker
count plus a prepared `sacct` record.
{{< /instructor >}}
