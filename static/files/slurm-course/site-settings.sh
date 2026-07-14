#!/usr/bin/env bash

# Edit this list after reading your cluster's documentation. Keep only the
# options that your site requires for a small, short CPU job.
SLURM_SITE_ARGS=(
  --partition="replace-with-a-short-partition"
  # --account="replace-with-your-account"
  # --qos="replace-with-an-allowed-qos"
  # --reservation="replace-with-a-course-reservation"
)
