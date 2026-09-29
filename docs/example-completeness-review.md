# Course example completeness review

Reviewed 29 September 2026: all eight remaining episodes, learner setup, reference,
instructor notes, and the downloadable starter files.

A runnable example should supply its programs and inputs, show how to submit
and track the intended job, and explain how to verify the result. An exercise
should have a complete worked solution in its expandable solution section.
Long programs can be downloads, with the relevant commands explained in the
lesson. Site settings still require the learner's confirmed local values.

Choose inline code for its teaching value in that section. A complete example
can combine focused, explained excerpts with a complete downloadable program
and execution instructions. Show the code that teaches the learning objective
in the main text; keep supporting implementation in the download when its
behaviour and inputs/outputs are enough to use it. Label excerpts and explain
when to execute commands. Exercise solutions should still provide the full
answer, through code or linked files and complete steps.

## Completed updates

- **Efficient Campaigns: dependencies.** Replaced the missing `summary-job.sh`
  example with a bundle-to-summary exercise and a complete expandable
  solution. It includes downloads, submission, dependency inspection, release,
  accounting, output validation, and cleanup if the exercise is interrupted.
  The producer is the bundle taught immediately beforehand, so its job-specific
  results can be checked without another array script or overwritten results.
- **Efficient Campaigns: downloads.** Added `bundle-job.sh`, `bundle_results.py`,
  and `summary-job.sh`. The helper used to check the bundle also validates its
  inputs before writing the dependent summary.
- **Efficient Campaigns: code placement.** The main text explains the CPU
  request, bundling loop, and dependency submission. Python validation and
  report-writing code stays in the downloadable helper; its interface and
  expected results are explained. Complete exercise steps remain in the
  expandable solution.
- **Starter-file README.** Corrected the claim that all completed scripts were
  already available in expandable solutions, and documented the new downloads.
- **Parallel hardware.** Removed the standalone orientation episode and its
  five launch examples with unavailable programs and inputs. The existing
  four-worker exercise teaches CPU use; brief notes on CPU meaning, campaign
  throughput, and further MPI/GPU reading now sit in the relevant lessons and
  reference page. The old episode URL redirects to the reference page.

## Remaining gaps and proposed fixes

| Location | Gap | Proposed fix |
|---|---|---|
| [Efficient Campaigns: Notifications and Time-Limit Signals](../content/episodes/efficient-campaigns/index.md#notifications-and-time-limit-signals) | The signal handler sets `checkpoint_requested`, but nothing reads it, saves progress, or resumes a job. The mail directives also do not say which existing script to edit or how to verify delivery. | Make notifications an explicit optional modification to a supplied job. For checkpointing, supply a small program that saves and resumes progress, a batch script, and checks for both attempts; alternatively replace the incomplete runnable snippet with a conceptual exercise and a full explanation in its solution. |
| [Resource Requests: Demonstrate an Over-Request](../content/episodes/05-resources-efficiency/index.md#demonstrate-an-over-request) | “Make a second copy” does not name the source script. There are no submission, ID capture, completion, log, result, or accounting-comparison commands for this job. | Explicitly copy `parallel-job.sh`; provide the completed comparison script and commands using a separate job ID. Check one application worker against four allocated CPUs and compare the two accounting records. |
| [Resource Requests: Storage](../content/episodes/05-resources-efficiency/index.md#storage-learn-the-site-before-staging-data) | The temporary-directory example only creates and deletes a directory. It never uses it, copies a result back, or verifies the retained result. | Supply a complete optional storage exercise using a confirmed local temporary-storage path, with a shared-storage result check and cleanup in the solution. |
| [First Batch Job: Submit a second sample](../content/episodes/02-first-jobs/index.md) | The solution shows only the replacement application command and a prose submission instruction. It does not demonstrate the requested job-ID recording or preservation checks. | Provide a complete second-sample script or exact copy-and-edit steps plus submission, completion, new-result identity, and old-log/result checks in the solution. |
| [Monitoring: Read Your Queue and Repair and verify the workload](../content/episodes/03-monitor-diagnose/index.md) | Resubmitting the first script does not explicitly update `JOB_ID`, so later inspection can target the previous job. The repair solution lists the expected evidence but gives no corrected script or commands to collect it. | Capture the new ID at the start. Supply the repaired script and commands using a distinct repair ID in the expandable solution, including a JSON job-ID check. |
| [Job Arrays: Why Not a Submission Loop?](../content/episodes/06-job-arrays/index.md#why-not-a-submission-loop) | The discouraged loop refers to the absent `job-for-one-sample.sh`. It is an anti-pattern, so it should not become another exercise to run. | Explain the submission loop in prose or explicit pseudocode; retain the complete array script as the runnable alternative. |
| [Job Arrays: Audit your finished campaign](../content/episodes/06-job-arrays/index.md) | The solution describes the evidence to assemble but supplies no complete commands or checker for joining the original and recovered attempts to the eight results. | Add a worked audit in the solution using `JobIDRaw`, result metadata, and the exact matching logs; cover both the recovery and no-recovery paths. |
| [Reference: Array Patterns](../content/reference.md#array-patterns) | The selected-index example submits `array-job.sh` with indices `8-12`, although the supplied course input list ends at index `7`. | Use an in-range selection and the course's submission settings, or clearly separate generic syntax from commands for the course script. |

## Examples that already have the required context

- Setup supplies the program and input list, a small execution command, and the
  expected result. Cluster settings are deliberately local; episode 1 explains
  how to find, enter, and check them.
- The first batch script and interactive session provide complete execution
  and verification paths. The specific exercise-solution gaps are listed above.
- The diagnosis and four-worker examples start from a supplied complete script
  and identify the required edits. Full downloadable variants could make these
  easier to follow, but there is no missing executable dependency.
- The main array and cancellation/recovery examples supply their job script,
  commands, and expected evidence. The final audit could still use a complete
  worked solution.
- Scheduler Mechanics primarily teaches interpretation of real cluster output.
  Its commands use the learner's own job and partition values, and conceptual
  challenges have worked answers. A prepared pending-job record would make the
  final challenge usable when the learner has no pending job to inspect.
- Standalone resource-option snippets and reference tables can remain concise
  when their purpose is syntax explanation and the complete runnable example
  is linked nearby. They should not invoke unnamed or unavailable programs.
