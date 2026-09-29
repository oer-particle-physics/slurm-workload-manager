#!/usr/bin/env bash
#SBATCH --job-name=particle-bundle
#SBATCH --time=00:05:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=512M
#SBATCH --output=logs/%x-%j.out
#SBATCH --error=logs/%x-%j.err

set -euo pipefail

export SLURM_JOB_ID
export COURSE_WORKERS=$SLURM_CPUS_PER_TASK

xargs -P "$COURSE_WORKERS" -n 1 bash -c '
  set -euo pipefail
  sample=$1
  python3 particle_demo.py \
    --sample "$sample" \
    --workers 1 \
    --seconds 4 \
    --memory-mib 32 \
    --output "results/bundle-${SLURM_JOB_ID}/${sample}.json" \
    > "logs/bundle-${SLURM_JOB_ID}-${sample}.out" \
    2> "logs/bundle-${SLURM_JOB_ID}-${sample}.err"
' _ < inputs.txt
