+++
title = "Interactive Work on Compute Nodes"
weight = 40
teaching = 10
exercises = 10
questions = [
  "When is an interactive allocation useful?",
  "How do I check that my commands are running on a compute node?",
  "How do I leave the session and release its resources?"
]
objectives = [
  "Request a short interactive allocation using the site's supported method.",
  "Check the hostname, job ID, working directory, and Python environment on a compute node.",
  "Run the course workload interactively and verify its result.",
  "Release the allocation and confirm that it is no longer active."
]
keypoints = [
  "Interactive allocations let you test commands on compute nodes before putting them in a batch script.",
  "An interactive request can wait in the queue and still needs time, CPU, and memory limits.",
  "In the example, `salloc` starts a shell on the login node; `srun --pty bash` opens a shell on a compute node.",
  "Leaving the compute-node shell ends that step; leaving the shell started by `salloc` releases the allocation."
]
+++

You have submitted a batch job and learned how to inspect and repair it.
Sometimes you need to try a command, check a software environment, or reproduce
an error while seeing the output directly. An **interactive allocation** lets
you do this on a compute node with resources assigned by Slurm.

Use the same shared course directory, `site-settings.sh`, and site note as in
the earlier episodes. Once a command works, put the relevant environment
setup and command into a batch script for repeatable runs.

{{< callout type="note" title="Follow your site's interactive-job instructions" >}}
Some sites require a different partition, a wrapper, or a web portal. Use the
method and submission options recorded in your site note. The example below
applies where `salloc` followed by `srun --pty bash` is supported. If interactive
access is unavailable, continue with [Resource Requests and Efficient Use]({{< relref "/episodes/05-resources-efficiency" >}});
later exercises do not depend on this session's result.
{{< /callout >}}

## Request a Short Allocation

Start on the login node in your shared course directory. Run `hostname` and
note the name so you can compare it with the compute node later.

If the same submission options as your batch jobs are appropriate, request
one node, one task, one CPU, and 256 MiB of memory for up to ten minutes:

```bash
hostname
source site-settings.sh
salloc "${SLURM_SITE_ARGS[@]}" \
  --job-name=particle-interactive \
  --time=00:10:00 \
  --nodes=1 \
  --ntasks=1 \
  --cpus-per-task=1 \
  --mem=256M \
  bash
```

Wait for Slurm to grant the allocation before entering the next commands.
Interactive requests can queue just like batch jobs; the ten-minute limit
starts when the allocation begins. A grant message looks like:

```text
salloc: Granted job allocation 12346
```

Record your actual job ID for the cleanup check at the end. The final `bash`
in this example tells `salloc` to start a Bash shell after obtaining resources.
That shell runs on the login node where you invoked `salloc`.

## Open a Shell on the Compute Node

From the shell started by `salloc`, launch a job step containing another shell:

```bash
srun --pty bash
```

`--pty` gives that shell an interactive terminal. Now check where you are:

```bash
hostname
echo "$SLURM_JOB_ID"
pwd
```

The hostname should identify an allocated compute node, and the job ID should
match the allocation you recorded. The working directory should be your
shared course directory. A job ID alone is not proof that you have moved to a
compute node: the shell started by `salloc` also has that variable.

The official [`salloc`](https://slurm.schedmd.com/salloc.html) and
[`srun`](https://slurm.schedmd.com/srun.html) documentation describes how these
commands allocate resources and launch job steps.

## Check Python and Run a Small Test

Apply any module or environment commands listed in your site note, then check
the interpreter on this compute node:

```bash
python3 --version
```

It should meet the course's Python 3.9-or-newer requirement. Run the same
workload you used in the batch job, with a short duration:

```bash
python3 particle_demo.py \
  --sample interactive-check \
  --seconds 1 \
  --memory-mib 16 \
  --output results/interactive-check.json
cat results/interactive-check.json
```

Here the shell is already a Slurm job step, so run Python directly inside it.
Its output and any errors appear in your terminal. There are no `#SBATCH`
directives in this session to create separate log files. The JSON file should
contain this allocation's job ID and the compute node's hostname.

## Leave the Session and Release the Allocation

For the two-shell example above, leave each shell in turn:

1. Exit the compute-node shell:

   ```bash
   exit
   ```

   You return to the shell started by `salloc` on the login node. The
   allocation still holds resources at this point.

2. Exit that shell to release the allocation:

   ```bash
   exit
   ```

   You return to your original login shell. Look for a message such as
   `salloc: Relinquishing job allocation 12346`.

If your site uses a different launch method, follow its cleanup instructions.
If the time limit has already ended the session, check which shell you are in
before entering another `exit`.

Back in your original login shell, replace the example number with the job ID
you recorded and check that the allocation is no longer active:

```bash
INTERACTIVE_ID=12346
squeue -j "$INTERACTIVE_ID"
```

There should be no matching job row; Slurm may instead report an invalid job
ID after removing the finished job. If the state is `CG` (completing), allow
cleanup to finish and check again. If your allocation is still running and
you have finished using it, cancel that specific job:

```bash
scancel "$INTERACTIVE_ID"
```

Check the queue again after cancellation. The result file remains in your
shared course directory after the allocation ends.

{{< challenge title="Verify the session and its cleanup" >}}
Use your recorded job ID, the JSON result, and the queue to show that:

1. the workload ran on a compute node within your allocation;
1. the result is still accessible from the login node;
1. the allocation is no longer active.

{{< solution >}}
The result's `job_id` matches the recorded allocation ID, and its `hostname`
matches the compute node you checked. You can read
`results/interactive-check.json` from the login node. A final queue check has
no active row for that allocation. Leaving only the compute-node shell would
not release the allocation in the two-shell example.
{{< /solution >}}
{{< /challenge >}}

Continue with [Resource Requests and Efficient Use]({{< relref "/episodes/05-resources-efficiency" >}})
to choose resource requests based on measurements from your jobs.

{{< instructor >}}
Test the local interactive launch method before teaching. Have learners record
their job ID and compare hostnames at each shell transition. Demonstrate both
exits for this example and verify cleanup before continuing. The twenty-minute
lesson allowance includes explanation and review; each allocation should be
released as soon as its short test is complete.
{{< /instructor >}}
