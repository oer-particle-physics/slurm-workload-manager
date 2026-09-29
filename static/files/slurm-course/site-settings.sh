#!/usr/bin/env bash

# Fill this in during episode 1, "How Slurm and Your Cluster Work", using
# your site's documentation or the tested settings supplied by your instructor.
# Replace the partition placeholder. Uncomment another option only when you
# need to select it, and replace its placeholder with a confirmed value.
# Leave optional lines commented out when the site's defaults are sufficient.
# Save, then load into your current Bash shell: source site-settings.sh
SLURM_SITE_ARGS=(
  --partition="replace-with-a-short-partition"
  # --account="replace-with-your-account"
  # --qos="replace-with-an-allowed-qos"
  # --reservation="replace-with-a-course-reservation"
)
