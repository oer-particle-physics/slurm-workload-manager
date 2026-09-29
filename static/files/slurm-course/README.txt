Slurm course starter files
==========================

particle_demo.py  Dependency-free Python workload used in every core episode.
inputs.txt        Eight sample labels used by the job-array episode.
site-settings.sh Submission options to fill in during episode 1, or replace
                 with a tested copy from your instructor.

Optional files for the Efficient Campaigns extension
---------------------------------------------------

bundle-job.sh     Runs the eight inputs with at most four commands at once.
bundle_results.py Checks a bundle's results; optionally writes a summary report.
summary-job.sh    Calls bundle_results.py with the producer bundle's job ID.

The extension shows how to download these files when they are needed. Run all
scripts from the shared course directory containing particle_demo.py,
inputs.txt, site-settings.sh, logs/, and results/. Add any required Python
environment setup from your site note to the batch scripts before submission.

The core episodes show how to create or adapt the job scripts in the lesson.
Completed extension scripts are also provided as downloads; exercise solutions
are in expandable sections.
