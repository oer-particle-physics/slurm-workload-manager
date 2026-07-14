+++
title = "Setup"
weight = 10
+++

This course runs on a Linux cluster that uses Slurm. You do not need
administrator access, MPI, a GPU, or any Python packages beyond the standard
library.

## What You Need

Before the course, check that you can:

- connect to the cluster with SSH
- create and edit files in a working directory
- run ordinary shell commands
- submit small jobs to at least one CPU partition

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

{{< callout type="warning" title="Do not guess site settings" >}}
Partition names, accounts, QoS values, reservations, storage paths, and
interactive-job rules are local policy. A value copied from PSI, CERN, or
another university can be invalid or inappropriate on your cluster.
{{< /callout >}}

## Create a Course Directory

Choose a shared filesystem that is visible from compute nodes. Your site's
user documentation should identify a suitable home, project, or work area.

```bash
mkdir -p ~/slurm-course
cd ~/slurm-course
mkdir -p logs results
```

Do not use node-local temporary storage yet: files created there may disappear
when an allocation ends and may not be visible from the login node.

## Download the Starter Files

Download the dependency-free workload, its input list, and the site-settings
template:

```bash
base_url="https://oer-particle-physics.github.io/slurm-workload-manager/files/slurm-course"
curl -fLO "$base_url/particle_demo.py"
curl -fLO "$base_url/inputs.txt"
curl -fLO "$base_url/site-settings.sh"
chmod u+x particle_demo.py
```

You can also download them individually:

- [particle_demo.py](/files/slurm-course/particle_demo.py)
- [inputs.txt](/files/slurm-course/inputs.txt)
- [site-settings.sh](/files/slurm-course/site-settings.sh)

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
episode the same field will contain a real Slurm job ID.

## Complete the Site Checklist

Read your cluster's user documentation first. These commands can then help you
confirm what the documentation says:

```bash
sinfo
sinfo -o "%P %a %l %D %G"
scontrol show partition
```

Record the following before submitting anything:

| Item | What to find |
|---|---|
| Short CPU partition | A partition suitable for jobs of a few minutes |
| Account | Whether `--account` is required and which value you may use |
| QoS or reservation | Whether the course requires one |
| Maximum and default time | The limits of the chosen partition |
| Interactive policy | Whether `salloc`, `srun --pty`, or a site wrapper is expected |
| Shared storage | A path visible from login and compute nodes |
| Node-local storage | Whether it exists, its path, and cleanup rules |
| Software setup | Whether `python3` requires a module or environment |

If your site exposes accounting associations to users, this command may also
help identify accounts and QoS values:

```bash
sacctmgr show assoc where user="$USER" \
  format=Cluster,Account,Partition,QOS%30
```

It is normal for `sacctmgr` to be unavailable or restricted. Site
documentation or the support team remains the authority.

Edit `site-settings.sh` and replace the partition placeholder. Uncomment only
the options your site requires:

```bash
SLURM_SITE_ARGS=(
  --partition="your-short-cpu-partition"
  # --account="your-account"
  # --qos="your-qos"
  # --reservation="course-reservation"
)
```

Load the settings into your current shell:

```bash
source site-settings.sh
printf '%s\n' "${SLURM_SITE_ARGS[@]}"
```

Every course submission adds this array of site-specific options on the
command line. The job scripts themselves therefore remain portable.

{{< callout type="note" title="PSI is a tested example, not the default" >}}
The [PSI CMS Tier-3 Slurm documentation](https://tier3.pages.psi.ch/batch-jobs/SlurmUsage/)
uses PSI partition and account names and describes storage paths such as
`/scratch`. These are valuable examples of local policy, but this course never
assumes that another cluster has the same names or filesystem layout.
{{< /callout >}}

{{< challenge title="Your site card" >}}
Before continuing, write down the short partition, any required account/QoS,
the maximum runtime, the shared course directory, and the interactive-job
rule for your cluster.

{{< solution >}}
There is no universal answer. A complete answer cites your site's current
documentation and contains no values copied solely from this course or from
another cluster.
{{< /solution >}}
{{< /challenge >}}

## Next Step

Continue with [How Slurm and Your Cluster Work]({{< relref "/episodes/01-slurm-model" >}}).
