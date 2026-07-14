+++
title = "Task"
summary = "One process launched by Slurm as part of a job step."
weight = 120
+++

`--ntasks` requests capacity for tasks. Threads created inside one process are
not separate Slurm tasks and normally use `--cpus-per-task`.
