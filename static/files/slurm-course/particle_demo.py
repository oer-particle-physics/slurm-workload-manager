#!/usr/bin/env python3
"""Small, dependency-free workload used throughout the Slurm course."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import socket
import time


def positive_int(value: str) -> int:
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("value must be at least 1")
    return number


def positive_float(value: str) -> float:
    number = float(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("value must be greater than 0")
    return number


def burn_cpu(worker: int, sample: str, seconds: float) -> tuple[int, int]:
    """Perform deterministic CPU work for approximately ``seconds``."""
    deadline = time.monotonic() + seconds
    digest = f"{sample}:{worker}".encode("utf-8")
    rounds = 0

    while time.monotonic() < deadline:
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            digest,
            b"slurm-course",
            50_000,
        )
        rounds += 1

    return rounds, int.from_bytes(digest[:4], "big")


def default_workers() -> int:
    return int(os.environ.get("SLURM_CPUS_PER_TASK", "1"))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a small particle-analysis-style demonstration workload."
    )
    parser.add_argument("--sample", required=True, help="label for the input sample")
    parser.add_argument("--output", required=True, type=Path, help="JSON output path")
    parser.add_argument(
        "--workers",
        type=positive_int,
        default=default_workers(),
        help="parallel workers (default: SLURM_CPUS_PER_TASK or 1)",
    )
    parser.add_argument(
        "--seconds",
        type=positive_float,
        default=8.0,
        help="approximate CPU-work duration per worker",
    )
    parser.add_argument(
        "--memory-mib",
        type=positive_int,
        default=64,
        help="memory to allocate and touch in MiB",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    started = time.monotonic()

    # Touch one byte per page so the allocation is reflected in resident memory.
    memory = bytearray(args.memory_mib * 1024 * 1024)
    for offset in range(0, len(memory), 4096):
        memory[offset] = 1

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        measurements = list(
            pool.map(
                lambda worker: burn_cpu(worker, args.sample, args.seconds),
                range(args.workers),
            )
        )

    elapsed = time.monotonic() - started
    total_rounds = sum(rounds for rounds, _ in measurements)
    checksum = sum(value for _, value in measurements) % 1_000_000

    result = {
        "sample": args.sample,
        "hostname": socket.gethostname(),
        "job_id": os.environ.get("SLURM_JOB_ID", "not-running-under-slurm"),
        "array_task_id": os.environ.get("SLURM_ARRAY_TASK_ID"),
        "workers": args.workers,
        "memory_mib": args.memory_mib,
        "elapsed_seconds": round(elapsed, 3),
        "work_rounds": total_rounds,
        "selected_events": checksum,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    print(
        f"sample={args.sample} workers={args.workers} "
        f"elapsed={elapsed:.2f}s selected_events={checksum}"
    )


if __name__ == "__main__":
    main()
