#!/usr/bin/env python3
"""Match course array results and logs to successful accounting records."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


def check(args: argparse.Namespace) -> int:
    samples = Path("inputs.txt").read_text(encoding="utf-8").splitlines()
    if not samples or any(not sample.strip() for sample in samples):
        raise ValueError("inputs.txt is empty or contains an empty label")
    if len(samples) != len(set(samples)):
        raise ValueError("inputs.txt contains duplicate labels")
    if args.recovery_id and not 0 <= args.recovery_index < len(samples):
        raise ValueError("recovery index is outside inputs.txt")

    # Expected export: sacct --array -X --noheader --parsable2
    #                 --format=JobID%32,JobIDRaw%32,State%32,ExitCode
    records: dict[str, set[tuple[str, str, str]]] = {}
    for line in args.accounting.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        fields = [field.strip() for field in line.split("|")]
        if len(fields) != 4:
            raise ValueError("accounting export must contain four pipe-separated fields")
        job_id, raw_id, state, exit_code = fields
        records.setdefault(job_id, set()).add((raw_id, state, exit_code))

    for index, sample in enumerate(samples):
        array_id = (
            args.recovery_id
            if args.recovery_id and index == args.recovery_index
            else args.array_id
        )
        element = f"{array_id}_{index}"
        rows = records.get(element, set())
        if len(rows) != 1:
            raise ValueError(f"{element}: expected one accounting record, found {len(rows)}")
        raw_id, state, exit_code = next(iter(rows))
        if state != "COMPLETED" or exit_code != "0:0":
            raise ValueError(f"{element}: State={state}, ExitCode={exit_code}")

        path = Path("results") / f"{sample}.json"
        result = json.loads(path.read_text(encoding="utf-8"))
        expected = {
            "sample": sample,
            "job_id": raw_id,
            "array_task_id": str(index),
            "workers": 1,
        }
        if not isinstance(result, dict) or any(
            result.get(key) != value for key, value in expected.items()
        ):
            raise ValueError(f"{path}: expected {expected}, got {result}")

        for suffix in ("out", "err"):
            log = Path("logs") / f"particle-array-{element}.{suffix}"
            size = log.stat().st_size  # A missing log is a failed check, too.
            if suffix == "err" and size:
                raise ValueError(f"{log}: non-empty error log; read it before accepting the run")
        print(f"OK: index {index}, sample {sample}, job {element} (numeric ID {raw_id})")
    return len(samples)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("array_id", help="array used for all inputs except a recovered index")
    parser.add_argument("--accounting", required=True, type=Path)
    parser.add_argument("--recovery-id", help="new array ID used to recover one index")
    parser.add_argument("--recovery-index", type=int)
    args = parser.parse_args()
    if (args.recovery_id is None) != (args.recovery_index is None):
        parser.error("use --recovery-id and --recovery-index together")
    try:
        count = check(args)
    except (OSError, ValueError) as error:
        sys.exit(f"FAIL: {error}")
    print(f"Checked all {count} inputs: successful jobs, matching results, and empty error logs.")


if __name__ == "__main__":
    main()
