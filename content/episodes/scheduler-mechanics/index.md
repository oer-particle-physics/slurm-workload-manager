+++
title = "Extension: Scheduler Mechanics"
weight = 80
teaching = 15
exercises = 10
questions = [
  "Why is the queue not simple first-in, first-out?",
  "How do priority, fair share, QoS, and backfill interact?",
  "Which parts of scheduler behaviour are local policy?"
]
objectives = [
  "Explain why queue order alone does not determine start order.",
  "Inspect priority factors with `sprio` when the cluster supports them.",
  "Relate realistic walltime and resource requests to backfill opportunities.",
  "Interpret fair-share and QoS information without assuming another site's policy."
]
keypoints = [
  "Slurm considers which jobs meet the cluster's rules, their priorities, and the resources available. Jobs do not necessarily start in submission order.",
  "Multifactor priority weights are configured locally, so the factors visible in `sprio` do not have universal importance.",
  "Backfill can start lower-priority work when it does not delay planned higher-priority work.",
  "Accurate requests help Slurm find nodes and time slots where a job can run, but do not guarantee an immediate start.",
  "Fair share compares a user's or project's assigned share of resources with past usage. Each site decides how this affects priority."
]
+++

Two jobs submitted in order do not necessarily start in that order. Before a
job can run, its account, QoS, reservation, and partition must permit it, and
any jobs it depends on must have reached the required state. Slurm then uses
job priorities and the resources available to choose which jobs can start.

This episode explains common mechanisms. Your cluster's documentation and
configuration remain the authority.

## Choose a Job to Inspect

List your current jobs:

```bash
squeue --me -o "%.18i %.12P %.24j %.2t %.10M %R"
```

If you have a pending job, record its ID as `PENDING_ID` and inspect it:

```bash
PENDING_ID=24680  # Replace with your own pending job's ID
scontrol show job "$PENDING_ID"
```

If you have no pending job, or a command is restricted, use the fictional
records below for the interpretation exercises. No additional submission is
needed. Run the later job-specific commands only with a real job of your own.

The following selected fields describe our example job throughout this episode:

```text
JobId=24680 JobState=PENDING Reason=Resources
   Account=project QOS=normal Partition=short
   TimeLimit=00:20:00 NumNodes=1 NumCPUs=4
   ReqTRES=cpu=4,mem=8G,node=1
```

Record the reason and requested CPU, memory, node, and time values. These let
you distinguish a priority question from a resource or policy constraint.

## Priority Is One Part of Scheduling

Many clusters use Slurm's **multifactor priority plugin**, which calculates
a job's priority by combining several factors. The site sets how much each
factor contributes. They can include:

- **age**: how long a job has waited while meeting the conditions for scheduling
- **association**: a priority adjustment for the user's membership of an account
- **fair share**: assigned share of resources compared with past usage
- **job size**: requested CPUs or nodes
- **partition**: a factor attached to the partition
- **QoS**: a factor attached to a quality of service
- **site**: administrator- or plugin-defined input
- **TRES**: trackable resources such as CPU, memory, or GPU

The official [Multifactor Priority Guide](https://slurm.schedmd.com/priority_multifactor.html)
lists the factors and the weighted formula. A factor matters only when the site
enables and weights it. The same `sprio` columns can therefore have very
different importance on two clusters.

Check the configured priority type if your site permits it:

```bash
scontrol show config | grep '^PriorityType'
```

If it reports `priority/multifactor`, inspect your own pending jobs, then focus
on the selected job's weighted age, fair-share, and QoS contributions:

```bash
sprio -l -u "$USER"
sprio -j "$PENDING_ID" -o "%.12i %.10Y %.10A %.10F %.10Q"
```

If no job row appears, use the example below. Here is simplified fictional
output for our example; the other contributions and the nice adjustment are
zero:

```text
JOBID    PRIORITY    AGE    FAIRSHARE    QOS
24680        7000   1000         6000      0
```

The fair-share contribution is larger than the age contribution, and QoS adds
no priority points to this job. These columns are already weighted; do not
multiply them by the site weights again. Your real job can have contributions
in other columns shown by `sprio -l`. Use the
[`sprio` field definitions](https://slurm.schedmd.com/sprio.html) to identify them.

`sprio` explains a priority value; it does not promise a start time. Slurm also
considers partition priority levels, reservations, whether a job meets the
scheduling rules, and whether its requested resources are available together.
Some sites allow **preemption**: interrupting a running job to free resources
for another job.

## Past Usage Can Affect Priority {#fair-share-is-historical-context}

Fair-share policy balances usage over time among users, accounts, or projects.
A project that has recently consumed more than its configured share may receive
a lower fair-share contribution than one that has consumed less. The history
may count less as it gets older. Each site decides how shares are divided
among projects and users, and how much fair share affects priority.

Where enabled and visible, inspect the fair-share factor for your accounts:

```bash
sshare -u "$USER" --format=Account,User,FairShare
```

For the fictional job's user and account, a selected row might be:

```text
Account    User       FairShare
project    learner     0.600000
```

Find the user row for the account charged by your job; a user can have several
accounts. This factor contributes to priority according to the site's weight.
With a weight of 10,000, the example factor gives the 6,000 points shown above.
It does not mean that 60% of a quota remains or that the job will start before
every job with a lower factor. The
[`sshare` documentation](https://slurm.schedmd.com/sshare.html) describes the
fields and how the configured fair-share algorithm affects them. If the
factor is unavailable, use the site's explanation or the example row.

## QoS and Partitions Express Policy

A **quality of service (QoS)** can define priority, limits, preemption, or usage
rules. A partition can have its own priority tier and limits. Both are
configured locally.

If users may query them, inspect the partition and job QoS from the job record.
Replace the placeholders with your job's actual names:

```bash
scontrol show partition YOUR_PARTITION
sacctmgr show qos where name=YOUR_JOB_QOS format=Name%20,Priority,MaxWall,MaxTRESPJ%40
```

Suppose the fictional job's QoS has these limits:

```text
Name      Priority     MaxWall     MaxTRES
normal           0   01:00:00     cpu=4,mem=8G
```

Compare `TimeLimit=00:20:00` with the one-hour `MaxWall`: it fits. The request
for four CPUs and 8 GiB also fits the per-job resource limit. The requested
`MaxTRESPJ` field is displayed under the `MaxTRES` heading.
The request reaches those CPU and memory limits exactly; asking for eight
CPUs would exceed this QoS limit. Its priority value of zero is consistent
with the zero QoS contribution in the example's `sprio` row.

If a limit column is blank, this QoS does not set that particular limit;
partition, account, and other limits may still apply.

These checks establish that the request fits the displayed QoS limits, not
that it can start now. Partition limits, account access, and available
resources still matter. Use a QoS permitted for your account and workload,
as established in the first episode.

## Backfill Uses Gaps Safely

Imagine a high-priority job waiting for eight nodes. Six are free now; the
remaining two are expected to become free in 40 minutes. Starting an unrelated
two-hour job on the six free nodes could delay the high-priority job. Starting
a ten-minute job may not.

Backfill scheduling looks for lower-priority work that can fit available gaps
without delaying planned higher-priority jobs. The scheduler relies on the
submitted time limit to decide whether a job fits. This is why a realistic
`--time` can help a short job: it can fit into more gaps in the schedule.
The official [Scheduling Configuration Guide](https://slurm.schedmd.com/sched_config.html)
explains how backfill uses job time limits and requested resources.

It is not a guarantee. The requested CPU/memory/node combination, policy,
reservation changes, new submissions, and the accuracy of scheduling estimates
all influence the outcome.

If start-time prediction is enabled, try:

```bash
squeue --start -j "$PENDING_ID"
```

Treat the result as an estimate, not an appointment. It can change as the queue
and cluster state change. If no start time is available, record that fact;
it does not imply a failed job or a known waiting duration.

## Why Idle Resources May Not Run Your Job

Seeing idle CPUs does not prove that a pending job can use them. Possible
reasons include:

- the nodes with idle CPUs lack the requested memory, GPU, feature, or licence
- the nodes belong to another partition or reservation
- policy limits the user's or account's running work
- the scheduler is preserving resources for a planned higher-priority start
- the job requests an arrangement of nodes or CPUs that is not available
- node state changed after the summary was produced

Begin with the job's displayed pending reason and full request. Avoid diagnosing
from a cluster-wide utilisation percentage alone.

{{< challenge title="Which job might start first?" >}}
Job A has higher numeric priority and requests eight nodes for four hours. Job B
has lower priority and requests one node for ten minutes. One node is free now;
eight nodes are expected to be free in 30 minutes.

Can B start first, and what can you conclude about A's eventual start time?

{{< solution >}}
With backfill, B may start first if the scheduler predicts it will finish
without delaying A and all policy conditions are satisfied. This does not
reduce A's priority.

You cannot conclude an exact start time for A. Running jobs may end earlier or
later than predicted, nodes can change state, reservations and policy can
intervene, and newly eligible jobs can alter the plan.
{{< /solution >}}
{{< /challenge >}}

{{< challenge title="Explain a pending job from evidence" >}}
Use your selected pending job, or the fictional records above. Record its
reason, CPU and memory request, largest displayed priority contribution, and
whether it fits the displayed QoS limits. Then state what you know about its
wait and what you still cannot conclude. For your own job, mark unavailable
information explicitly instead of guessing.

{{< solution >}}
For the fictional records:

- The job is pending for `Resources` and requests one node with four CPUs and
  8 GiB for 20 minutes.
- Fair share contributes 6,000 priority points, more than age's 1,000; QoS
  contributes zero in this example.
- Its time, CPU, and memory requests fit the displayed QoS limits.
- When the scheduler last considered the job, the requested resource
  combination was unavailable. None of these records establishes an exact
  start time or identifies a particular idle node that can run it.

The next useful check is whether the eligible nodes can supply the requested
combination, using the partition information and site guidance. Changing the
job name or resubmitting the same request would not resolve that shortage.
{{< /solution >}}
{{< /challenge >}}

{{< instructor >}}
Avoid turning the episode into a reverse-engineering exercise for local
priority weights. The practical goal is to explain observable behaviour and
reinforce accurate requests. If the training cluster does not use
`priority/multifactor`, compare the documented local policy with the common
model rather than forcing `sprio` output. The fictional records allow the
whole interpretation exercise to run without a pending job or privileged
access. Keep the discussion tied to the displayed fields and the next useful
check for the learner's job.
{{< /instructor >}}
