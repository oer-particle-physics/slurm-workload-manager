+++
title = "Resident Memory"
summary = "The portion of a process's memory currently held in physical RAM."
weight = 110
+++

`MaxRSS` is a commonly used peak resident-memory measurement for tuning job
requests. Measurements can miss brief peaks, so allow extra memory above the
observed value when planning the next request.
