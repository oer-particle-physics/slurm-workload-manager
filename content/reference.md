+++
title = "Reference"
weight = 60
+++

## Core Commands

| Goal | Command |
|---|---|
| Show partitions and node state | `sinfo` |
| Show selected partition fields | `sinfo -o "%P %a %l %D %G"` |
| Inspect a partition | `scontrol show partition NAME` |
| Submit a script | `sbatch job.sh` |
| Capture a submitted ID | `submission=$(sbatch --parsable job.sh); id=${submission%%;*}` |
| Show your active jobs | `squeue --me` or `squeue -u "$USER"` |
| Inspect a job request | `scontrol show job JOB_ID` |
| Cancel a job | `scancel JOB_ID` |
| Show accounting records | `sacct -j JOB_ID` |
| Show useful accounting fields | `sacct -j JOB_ID --format=JobID,State,ExitCode,Elapsed,Timelimit,AllocCPUS,TotalCPU,ReqMem,MaxRSS` |
| Request an allocation | `salloc [site options] [resource options]` |
| Launch a step | `srun command ...` |

All options are case-sensitive. Use `COMMAND --help`, `man COMMAND`, or the
current [official Slurm documentation](https://slurm.schedmd.com/).

## Common Resource Shapes

```bash
# Serial
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1

# Threaded or local workers
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=N

# MPI orientation (site launcher required)
#SBATCH --ntasks=N
#SBATCH --cpus-per-task=1
```

Always add a realistic `--time` and memory request using the form recommended
by the site. CPUs do not make a serial application parallel; configure the
application to use the allocation.

## Filename Tokens and Environment

| Token or variable | Meaning |
|---|---|
| `%j` | Job ID in a Slurm filename pattern |
| `%x` | Job name in a Slurm filename pattern |
| `%A` | Array master job ID in a filename pattern |
| `%a` | Array task index in a filename pattern |
| `$SLURM_JOB_ID` | Current job ID in the running shell |
| `$SLURM_CPUS_PER_TASK` | CPUs requested per task |
| `$SLURM_ARRAY_JOB_ID` | Array master job ID |
| `$SLURM_ARRAY_TASK_ID` | Current array index |

Filename tokens belong in `#SBATCH --output/--error`; environment variables
are expanded by the shell in the script body.

## Array Patterns

```bash
# Indices 0 through 99, at most 10 running
#SBATCH --array=0-99%10

# Selected indices only
sbatch --array=1,4,8-12%3 array-job.sh

# One array element
scancel ARRAY_JOB_ID_TASK_ID

# Expanded accounting view
sacct --array -j ARRAY_JOB_ID
```

Validate that every index maps to an input and use `%A_%a` in log names.

## Frequent States and Reasons

| Code | State |
|---|---|
| `PD` | Pending |
| `R` | Running |
| `CD` | Completed |
| `F` | Failed |
| `CA` | Cancelled |
| `TO` | Timeout |
| `OOM` | Out of memory |

Common pending reasons include `Priority`, `Resources`, `Dependency`,
`JobArrayTaskLimit`, `PartitionTimeLimit`, `InvalidAccount`, and `InvalidQOS`.
Use the official [state](https://slurm.schedmd.com/job_state_codes.html) and
[reason](https://slurm.schedmd.com/job_reason_codes.html) definitions for the
complete lists.

## Diagnostic Checklist

For a pending job:

1. Confirm the exact job ID.
1. Read state and pending reason in `squeue`.
1. Inspect the full request with `scontrol show job`.
1. Compare it with current site policy.

For a finished job:

1. Read `State` and `ExitCode` with `sacct`.
1. Inspect both output and error logs.
1. Validate expected result files.
1. Compare requested and used time, CPU, and memory.

## Primary Documentation

- [Quick Start User Guide](https://slurm.schedmd.com/quickstart.html)
- [`sbatch`](https://slurm.schedmd.com/sbatch.html)
- [`squeue`](https://slurm.schedmd.com/squeue.html)
- [`scontrol`](https://slurm.schedmd.com/scontrol.html)
- [`sacct`](https://slurm.schedmd.com/sacct.html)
- [`salloc`](https://slurm.schedmd.com/salloc.html)
- [`srun`](https://slurm.schedmd.com/srun.html)
- [Job Array Guide](https://slurm.schedmd.com/job_array.html)
- [CPU Management Guide](https://slurm.schedmd.com/cpu_management.html)
- [Multifactor Priority Guide](https://slurm.schedmd.com/priority_multifactor.html)
