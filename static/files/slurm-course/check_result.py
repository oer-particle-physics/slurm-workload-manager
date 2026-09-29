#!/usr/bin/env python3
"""Check that one course result belongs to the intended job and workload."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("result", type=Path)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--sample", required=True)
    parser.add_argument("--workers", required=True, type=int)
    parser.add_argument("--array-task-id", help="expected index, for an array result")
    args = parser.parse_args()
    if args.workers < 1:
        parser.error("--workers must be positive")

    expected = {
        "job_id": args.job_id,
        "sample": args.sample,
        "workers": args.workers,
        "array_task_id": args.array_task_id,
    }
    try:
        result = json.loads(args.result.read_text(encoding="utf-8"))
        if not isinstance(result, dict) or any(
            result.get(key) != value or key not in result
            for key, value in expected.items()
        ):
            raise ValueError(f"expected {expected}, got {result}")
    except (OSError, ValueError) as error:
        sys.exit(f"FAIL: {args.result}: {error}")

    print(
        f"OK: {args.result} (job {args.job_id}, "
        f"sample {args.sample}, workers {args.workers})"
    )


if __name__ == "__main__":
    main()
