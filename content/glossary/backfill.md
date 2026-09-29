+++
title = "Backfill"
summary = "Starting a lower-priority job while resources are free, provided it will finish before a planned higher-priority job needs them."
weight = 20
+++

Slurm uses the job's requested resources and time limit to decide whether it
fits a gap in the schedule. A realistic time limit can help a short job fit,
but does not guarantee when it will start.
