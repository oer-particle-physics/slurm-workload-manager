+++
title = "Setup"
weight = 10
+++

This course runs on a Linux cluster that uses Slurm. You do not need
administrator access, MPI, a GPU, or any Python packages beyond the standard
library.

By the end of setup, you will have checked your access and Python environment,
created a shared course directory, and downloaded the starter files. In the
[first episode]({{< relref "/episodes/01-slurm-model" >}}), you will learn how
to inspect your cluster and fill in the submission settings.

## What You Need

Before the course, confirm that you:

- can connect to the cluster with SSH
- can create and edit files in a working directory
- have permission to run small CPU jobs, as confirmed by your instructor or
  site's user documentation

Run the commands on the cluster after connecting with SSH. The course examples
use Bash; if your login shell is different, run `bash` and use that shell for
the exercises.

On the cluster, verify the commands and Python interpreter:

```bash
sinfo --version
sbatch --version
python3 --version
```

`sinfo` and `sbatch` should report the same Slurm release. The course workload
needs Python 3.9 or newer and uses only the standard library. If `python3` is
not immediately available, check whether your site asks you to load a software
module first.

## Create a Course Directory

Choose a shared filesystem that is visible from compute nodes. Your site's
user documentation should identify a suitable home, project, or work area.
If your home directory is shared, use the commands below. Otherwise, replace
`~/slurm-course` with a directory in the recommended shared area, including
when that path appears in later exercises.

```bash
mkdir -p ~/slurm-course
cd ~/slurm-course
mkdir -p logs results
```

Use this shared directory throughout the course. Temporary storage on an
individual compute node may disappear when a job ends and may not be visible
from the login node.

## Download the Starter Files

Download the workload, its input list, and the result checker:

```bash
base_url="https://oer-particle-physics.github.io/slurm-workload-manager/files/slurm-course"
curl -fLO "$base_url/particle_demo.py"
curl -fLO "$base_url/inputs.txt"
curl -fLO "$base_url/check_result.py"
chmod u+x particle_demo.py
```

You will also need `site-settings.sh` in this directory. If your instructor
has supplied a tested copy, save it here. Otherwise, download the template:

```bash
curl -fLO "$base_url/site-settings.sh"
```

Leave the template unchanged for now; the first episode explains its options
and guides you through filling it in.

You can also download the files individually:

- [particle_demo.py](/files/slurm-course/particle_demo.py)
- [inputs.txt](/files/slurm-course/inputs.txt)
- [check_result.py](/files/slurm-course/check_result.py)
- [site-settings.sh](/files/slurm-course/site-settings.sh)

## Check the Workload

`particle_demo.py` performs a small synthetic CPU calculation and allocates a
chosen amount of memory. Sample names such as `dyjets_chunk_001` are labels;
there are no physics data files to obtain. The program writes JSON containing
the sample label, job ID, hostname, worker count, and measurements. Its
`selected_events` value is simulated, not a physics result.

The `--seconds` argument sets an approximate work duration per worker. Adding
workers changes how much calculation happens during that time, so this program
is useful for learning job handling rather than timing a fixed analysis.
The supplied `check_result.py` checks result metadata against the job and
workload you intended to run; the first episode that submits jobs explains
the fields to compare.

Run the workload once on the login node with deliberately tiny settings. This
is only a setup check, not a benchmark:

```bash
python3 particle_demo.py \
  --sample setup-check \
  --seconds 0.5 \
  --memory-mib 16 \
  --output results/setup-check.json
cat results/setup-check.json
```

The output should contain `"job_id": "not-running-under-slurm"`. In a later
episode the same field will contain a real Slurm job ID. This check confirms
that the downloaded program runs with your current Python setup; the first
batch exercise will check it on a compute node.

## Next Step {#complete-the-site-checklist}

Before continuing, confirm that:

- You can use the cluster's Slurm commands and Python 3.9 or newer.
- Your shared course directory contains the four starter files and the
  `logs/` and `results/` directories.
- The tiny workload check produced `results/setup-check.json`.

Continue with [How Slurm and Your Cluster Work]({{< relref "/episodes/01-slurm-model" >}}).
There you will choose your submission options, complete `site-settings.sh`,
and record the local details needed before submitting your first job.
