+++
title = "Extension: Parallel Hardware Orientation"
weight = 90
teaching = 15
exercises = 10
questions = [
  "How do threaded, MPI, hybrid, and GPU jobs request different resources?",
  "What can a Slurm CPU mean on a multithreaded node?",
  "Which launch details must come from the application and the local site?"
]
objectives = [
  "Classify an application as serial, threaded/shared-node, MPI/distributed, hybrid, or GPU-accelerated.",
  "Sketch an appropriate Slurm resource shape for each model.",
  "Identify site-dependent launcher, GPU, and CPU-topology choices.",
  "Avoid requesting parallel hardware that the application cannot use."
]
keypoints = [
  "Match `--ntasks` to application processes and `--cpus-per-task` to CPUs used within each process.",
  "MPI launch commands and libraries must follow site documentation; resource flags alone do not make a program distributed.",
  "GPU type, partition, account, QoS, and request syntax can all be site-specific.",
  "A Slurm CPU may represent a core or hardware thread depending on configuration, so inspect and benchmark before using topology hints.",
  "More CPUs, nodes, or GPUs improve performance only when the application can use them effectively."
]
+++

Slurm describes resources; the application determines how computation uses
them. Before writing flags, identify the application's execution model from
its documentation and a small benchmark.

## Five Common Shapes

### Serial

One process uses one CPU:

```bash
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
srun ./serial_program input.dat
```

This is the shape used for each element of the course array.

### Threaded or Shared-Node Workers

One main process creates threads or local workers that share a node:

```bash
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=8
export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK
srun ./threaded_program input.dat
```

The environment variable is application-specific. OpenMP commonly uses
`OMP_NUM_THREADS`; BLAS libraries, ROOT, Python frameworks, and other programs
have their own controls. The course workload reads `SLURM_CPUS_PER_TASK`
directly.

### MPI or Other Distributed Processes

Multiple processes communicate, possibly across nodes:

```bash
#SBATCH --nodes=2
#SBATCH --ntasks=8
#SBATCH --cpus-per-task=1
srun ./mpi_program input.dat
```

This requests eight tasks across two nodes. It does not compile the program
with MPI or guarantee that this is the correct launcher. MPI integration
depends on the MPI implementation, build, process-management interface, and
site configuration. Some sites require an `srun --mpi=...` option; others
document a compatible `mpirun` workflow. Follow the local MPI guide.

### Hybrid MPI and Threads

Several distributed processes each create threads:

```bash
#SBATCH --nodes=2
#SBATCH --ntasks=4
#SBATCH --cpus-per-task=8
export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK
srun ./hybrid_program input.dat
```

The allocation has 4 tasks × 8 CPUs per task = 32 CPUs in total, subject to
how Slurm places them. Hybrid jobs also need task distribution and binding
choices, which should come from application benchmarks and site guidance.

### GPU-Accelerated

A common generic request for one GPU is:

```bash
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=16G
#SBATCH --gpus=1
srun ./gpu_program input.dat
```

Sites may instead document `--gres=gpu:1`, `--gpus-per-task`, a GPU type such
as `gpu:a100:1`, a dedicated partition or cluster, and a particular account or
QoS. The number of supporting CPUs and memory are application choices, not
universal GPU defaults.

Inspect advertised generic resources with:

```bash
sinfo -o "%P %G %N"
```

Then read the site's GPU documentation before submitting. A GPU request is
useful only when the application contains a compatible GPU code path and
software environment.

## CPU, Core, and Hardware Thread

A physical CPU core may expose more than one hardware thread (simultaneous
multithreading, often called hyperthreading). Whether Slurm presents each
hardware thread or each core as an allocatable “CPU” depends on cluster
configuration.

Inside an allocation, these commands can help describe what the job sees:

```bash
lscpu
echo "$SLURM_CPUS_PER_TASK"
scontrol show job "$SLURM_JOB_ID"
```

Where users may inspect nodes, `scontrol show node NODE` reports values such as
sockets, cores, threads per core, and configured CPUs. Those values still need
to be interpreted in the context of the allocation and task-binding plugins.

Slurm offers hints such as:

```bash
#SBATCH --hint=nomultithread
```

This commonly requests one hardware thread per core, but it can affect CPU
counts, placement, memory calculation, accounting, and fair-share usage under
local configuration. Do not add it automatically. Benchmark the application
and use the site's recommended topology options.

The official [Multi-core/Multi-thread Guide](https://slurm.schedmd.com/mc_support.html)
and [CPU Management Guide](https://slurm.schedmd.com/cpu_management.html)
document the available controls, but administrators choose how they interact
on a particular cluster.

## Throughput Versus Time to Solution

Hardware threads illustrate a useful trade-off:

- one CPU-bound task may finish sooner when it has an entire physical core
- two suitable tasks sharing a core's execution resources may produce more
  total results per hour, even if each takes longer

Likewise, doubling MPI ranks, threads, or GPUs may increase communication,
memory traffic, serial overhead, or load imbalance. Measure both:

- **time to solution**: how long one job takes
- **throughput**: how much useful work completes per unit of allocated resource

Use the metric that matches the research and shared-system objective.

{{< callout type="note" title="PSI Merlin case study" >}}
The Merlin slides discuss a configuration where core and memory accounting,
hyperthreading, and `--hint=nomultithread` interact in a specific way. They
provide a valuable warning that a fully busy application can look surprising
under accounting. The exact CPU counts and memory defaults are Merlin
configuration, not general Slurm behaviour.
{{< /callout >}}

## A Decision Sequence

Before requesting parallel hardware, answer in order:

1. Does the executable support threads, worker processes, MPI, GPUs, or a
   combination?
1. How is that mode enabled and how is its concurrency set?
1. Does the cluster provide the required hardware and software stack?
1. Which partition, account, QoS, launcher, and binding options does the site
   require?
1. Does a small scaling test show useful improvement in time or throughput?
1. Do accounting and application metrics show that the resources were used?

{{< challenge title="Translate applications into requests" >}}
Sketch the task/CPU/GPU shape for each application. Do not invent partition or
account names.

1. A Python program is strictly serial.
1. An OpenMP program is configured and tested with 12 threads.
1. An MPI program should launch 32 ranks with one CPU each.
1. A machine-learning program uses one GPU and four CPU data-loader workers.

{{< solution >}}
1. `--ntasks=1 --cpus-per-task=1`.
1. `--ntasks=1 --cpus-per-task=12`, plus the application's thread setting such
   as `OMP_NUM_THREADS=12`.
1. `--ntasks=32 --cpus-per-task=1`, with nodes and launcher chosen according to
   site and MPI guidance.
1. One task, four CPUs per task, and one GPU using the site's supported GPU
   syntax. Memory, GPU type, partition, account, and QoS still require
   application measurements and local documentation.
{{< /solution >}}
{{< /challenge >}}

{{< instructor >}}
Keep this as orientation unless the teaching environment guarantees a tested
MPI stack or GPU reservation. The learning outcome is choosing and verifying a
resource shape, not memorising one launch command that may be wrong on the next
cluster.
{{< /instructor >}}
