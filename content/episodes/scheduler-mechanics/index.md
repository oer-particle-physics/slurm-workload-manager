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
  "Scheduling combines eligibility, policy, priority, and currently available resources; it is not generally FIFO.",
  "Multifactor priority weights are configured locally, so the factors visible in `sprio` do not have universal importance.",
  "Backfill can start lower-priority work when it does not delay planned higher-priority work.",
  "Accurate time and resource requests improve placement options but never guarantee an immediate start.",
  "Fair share compares entitled and consumed usage according to site policy; it is not a portable fixed score."
]
+++

Two jobs submitted in order do not necessarily start in that order. Before a
job can run, it must be eligible under account, QoS, reservation, dependency,
and partition rules; it must be considered under scheduler policy; and a
suitable combination of CPUs, memory, nodes, GPUs, licences, and time must be
available.

This episode explains common mechanisms. Your cluster's documentation and
configuration remain the authority.

## Priority Is One Part of Scheduling

Many clusters use Slurm's multifactor priority plugin. It can combine weighted
factors including:

- **age**: how long an eligible job has waited
- **association**: a configured factor for the user/account association
- **fair share**: entitled share compared with historical usage
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

If it reports `priority/multifactor`, inspect your pending jobs:

```bash
sprio -l
sprio -j YOUR_JOB_ID
```

`sprio` explains a priority value; it does not promise a start time. Partition
tiers, reservations, preemption, eligibility, and resource fit can affect which
job the scheduler evaluates or starts.

## Fair Share Is Historical Context

Fair-share policy balances usage over time among users, accounts, or projects.
A project that has recently consumed more than its configured share may receive
a lower fair-share contribution than one that has consumed less. The history
can decay, and the hierarchy and weights are local choices.

Where enabled and visible, inspect share information with:

```bash
sshare -l
```

Some sites restrict the output or present fair-share data through a portal.
Treat it as an explanation of policy, not as a score to game. Splitting a job,
changing its name, or repeatedly resubmitting does not create additional
entitlement and can create extra load.

## QoS and Partitions Express Policy

A **quality of service (QoS)** can define priority, limits, preemption, or usage
rules. A partition can have its own priority tier and limits. Both are
configured locally.

If users may query them, these commands provide clues:

```bash
scontrol show partition YOUR_PARTITION
sacctmgr show qos format=Name%20,Priority,MaxWall,MaxTRES%40
```

Do not request a QoS merely because it has a promising name or higher displayed
priority. Use only values assigned to your account and appropriate for the
workload.

## Backfill Uses Gaps Safely

Imagine a high-priority job waiting for eight nodes. Six are free now; the
remaining two are expected to become free in 40 minutes. Starting an unrelated
two-hour job on the six free nodes could delay the high-priority job. Starting
a ten-minute job may not.

Backfill scheduling looks for lower-priority work that can fit available gaps
without delaying planned higher-priority jobs. The scheduler relies on the
submitted time limit to decide whether a job fits. This is why a realistic
`--time` can help a short job: it creates more safe placement possibilities.

It is not a guarantee. The requested CPU/memory/node combination, policy,
reservation changes, new submissions, and the accuracy of scheduling estimates
all influence the outcome.

If start-time prediction is enabled, try:

```bash
squeue --start -j YOUR_JOB_ID
```

Treat the result as an estimate, not an appointment. It can change as the queue
and cluster state change.

## Why Idle Resources May Not Run Your Job

Seeing idle CPUs does not prove that a pending job can use them. Possible
reasons include:

- idle CPUs lack the requested memory, GPU, feature, or licence
- the nodes belong to another partition or reservation
- policy limits the user's or account's running work
- the scheduler is preserving resources for a planned higher-priority start
- the request cannot fit the available topology or contiguous node set
- node state changed after the summary was produced

Begin with the job's displayed pending reason and full request. Avoid diagnosing
from a cluster-wide utilisation percentage alone.

{{< callout type="note" title="PSI Merlin case study" >}}
The Merlin best-practices slides describe duration-tiered partitions,
multifactor priority, fair share, and backfill. They illustrate the general
principle that accurate requests improve packing and cluster utilisation. The
specific partition tiers, priority weights, stakeholder rules, and off-hours
behaviour are Merlin policy and must not be projected onto other clusters.
{{< /callout >}}

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
Choose one pending job of your own. Record its `squeue` reason, relevant fields
from `scontrol show job`, and (if available) its `sprio` factors. Write one
sentence stating what the evidence establishes and one stating what it does
not establish.

{{< solution >}}
A good response distinguishes evidence from prediction. For example:
“The job is currently pending for `Resources` and requests four CPUs and 8 GiB
in the short partition. This does not establish a guaranteed start time or
prove that every idle node can satisfy the request.”
{{< /solution >}}
{{< /challenge >}}

{{< instructor >}}
Avoid turning the episode into a reverse-engineering exercise for local
priority weights. The practical goal is to explain observable behaviour and
reinforce accurate requests. If the training cluster does not use
`priority/multifactor`, compare the documented local policy with the common
model rather than forcing `sprio` output.
{{< /instructor >}}
