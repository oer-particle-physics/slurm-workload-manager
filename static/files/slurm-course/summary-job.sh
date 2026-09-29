#!/usr/bin/env bash
#SBATCH --job-name=particle-summary
#SBATCH --time=00:02:00
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=256M
#SBATCH --output=logs/%x-%j.out
#SBATCH --error=logs/%x-%j.err

set -euo pipefail
bundle_id=${1:?Pass the producer bundle job ID as the first argument}

python3 bundle_results.py "$bundle_id" --summary-job-id "$SLURM_JOB_ID"
