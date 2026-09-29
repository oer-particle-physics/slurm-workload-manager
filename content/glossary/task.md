+++
title = "Task"
summary = "One process launched by Slurm as part of a job step."
weight = 120
+++

`--ntasks` specifies how many tasks Slurm should be able to launch. Threads
created inside one process are not separate Slurm tasks; request CPUs for them
with `--cpus-per-task`.
