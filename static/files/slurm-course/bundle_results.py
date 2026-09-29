#!/usr/bin/env python3
"""Check a course bundle and optionally collect its results into a summary."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


def read_bundle_results(bundle_id: str) -> list[dict]:
    samples = Path("inputs.txt").read_text(encoding="utf-8").splitlines()
    if not samples or any(not sample for sample in samples):
        raise ValueError("inputs.txt is empty or contains an empty label")
    if len(samples) != len(set(samples)):
        raise ValueError("inputs.txt contains duplicate labels")

    records = []
    for sample in samples:
        path = Path("results") / f"bundle-{bundle_id}" / f"{sample}.json"
        try:
            result = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise ValueError(f"{path}: {error}") from error
        expected = {"sample": sample, "job_id": bundle_id, "workers": 1}
        if not isinstance(result, dict) or any(
            result.get(key) != value for key, value in expected.items()
        ):
            raise ValueError(f"{path}: expected {expected}, got {result}")
        records.append(result)
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle_job_id", help="job ID of the producer bundle")
    parser.add_argument(
        "--summary-job-id",
        help="also write results/summary-ID.json using this summary job ID",
    )
    args = parser.parse_args()

    try:
        records = read_bundle_results(args.bundle_job_id)
        if args.summary_job_id:
            summary = {
                "bundle_job_id": args.bundle_job_id,
                "summary_job_id": args.summary_job_id,
                "sample_count": len(records),
                "results": records,
            }
            output = Path("results") / f"summary-{args.summary_job_id}.json"
            output.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError) as error:
        sys.exit(f"FAIL: {error}")

    for record in records:
        print(f"OK: {record['sample']}")
    if args.summary_job_id:
        print(f"Wrote {output}: {len(records)} results from bundle {args.bundle_job_id}.")
    else:
        print(f"Checked all {len(records)} results for bundle {args.bundle_job_id}.")


if __name__ == "__main__":
    main()
