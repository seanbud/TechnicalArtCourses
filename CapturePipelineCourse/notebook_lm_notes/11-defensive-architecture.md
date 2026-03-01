# Lesson 11: Defensive Pipeline Architecture — Zero-Downtime & Resilience

## The 10-Minute Rule

Stage time is the most expensive resource in EA's capture studio. Actors, directors, camera crew, lighting, costumes — all of that is burning money while the stage is live. If the pipeline breaks and the stage can't record or can't process data, every minute of downtime costs thousands of dollars.

The mandate from EA leadership is clear: build defensive resilience so that no pipeline failure ever costs more than 10 minutes of stage time. Ten minutes is the absolute maximum. And ideally, zero. The stage should never stop recording because of a software or infrastructure issue.

This lesson is about how you build a pipeline that delivers on that promise.

## Failure Taxonomy: Name What Can Break

Before you can defend against failures, you need to name them. This sounds obvious, but most pipelines fail because nobody sat down and listed every failure mode.

Here's the breakdown by severity:

**Critical — stage stops.** The NAS goes offline and you can't write capture data. A vendor SDK update crashes the solver. A network switch fails and all data transfer stops. These are all-hands emergencies. Without defense, recovery can take hours.

**High — processing stops.** Perforce server goes down and you can't publish assets. A processing node fills its disk and starts failing silently. Without defense, recovery is 30 minutes to an hour.

**Medium — one job fails.** A Python script throws an unhandled exception. One take fails validation. These are recoverable in minutes if you have good logging and alerting.

**Low — annoying but not blocking.** Wrong naming convention, stale config file. Catch it, re-export, move on.

The value of this taxonomy is that it tells you where to invest your defensive engineering time. You don't build circuit breakers for naming convention issues. You build them for NAS failures.

## Defense in Depth

A resilient pipeline doesn't rely on one defense. It uses layered defenses — if one fails, the next catches it.

**Layer 1: Prevention.** Stop problems before they happen. Validate all input data before processing. Monitor disk space and alert at 80 percent full, block operations at 90 percent. Validate config files before the pipeline runs. Pin all versions — Maya, Python, every library. No surprise upgrades.

**Layer 2: Detection.** Catch problems as soon as they happen. Run a health check daemon that pings every critical system every 30 seconds. Monitor the file watcher to make sure it's still alive. Track processing queue depth — if the backlog is growing, something is wrong. Track error rates — if more than 5 percent of takes are failing validation, alert immediately.

**Layer 3: Recovery.** Fix problems automatically where possible. Retry failed operations with exponential backoff — if a network copy fails, wait 2 seconds, try again, wait 4 seconds, try again. Use circuit breakers to stop hammering dead services. Failover to backup storage if the primary NAS dies. Queue data locally if the network is down and flush when it recovers.

**Layer 4: Human response.** When automation can't fix it, get humans on it fast. Slack alerts with severity classification. PagerDuty for critical failures. Runbooks — step-by-step recovery procedures that anyone on the team can follow. Escalation paths: TA first, then IT, then vendor.

## The Retry Decorator

The most common defense pattern. Any operation that touches the network — file copies, Perforce operations, API calls — should retry on failure. You implement this as a Python decorator with exponential backoff. The first retry waits 2 seconds, the second waits 4, the third waits 8. This prevents thundering herd problems where hundreds of retries hit a recovering service simultaneously.

The key is: retries are for transient failures. Network hiccup, temporary load spike, brief service restart. If the service is truly dead, retrying for 30 seconds each time wastes precious time.

## The Circuit Breaker

That's where the circuit breaker comes in. A circuit breaker has three states. Closed means normal operation — requests go through. If a request fails, the circuit counts the failure. After hitting a threshold — say 3 consecutive failures — the circuit "opens." In the open state, ALL requests fail immediately. No timeout waiting, no retry delay. Instant failure.

After a cooldown period — say 30 seconds — the circuit enters "half-open." It lets ONE request through as a test. If that request succeeds, the circuit closes and operations resume. If it fails, the circuit stays open for another cooldown period.

Why does this matter? Without a circuit breaker, when the NAS dies, your file watcher tries to copy a file, waits 30 seconds for timeout, fails, tries the next file, waits 30 seconds, fails. Your entire queue backs up and the stage stops. With a circuit breaker, after 3 failures everything fails instantly, an alert fires, and humans are responding within minutes. When the NAS comes back, the circuit auto-recovers.

## Graceful Degradation: The Stage Never Stops

The most important pattern for the 10-minute rule. When the NAS goes down, the pipeline doesn't stop. It degrades gracefully. Capture data writes to the local SSD on the stage machine. A background queue tracks these locally-stored files. When the NAS recovers, the queue flushes automatically — all the locally-stored files are copied to the NAS in the correct location.

From the perspective of the actors and directors on the stage floor, nothing happened. They kept recording. They didn't even know the NAS was down. That's zero-downtime resilience.

The same pattern applies to Perforce. If P4 is down, the delivery bot queues the submit operations. When P4 comes back, it flushes the queue and submits everything. No data is lost.

## Runbook Culture

Not everything can be automated. For failures that need a human, you need a runbook — a step-by-step recovery procedure. The key requirements:

The runbook lives in version control alongside the pipeline code. It's tested — you do fire drills at least once a quarter. It's accessible — anyone on the team can find it and follow it, not just the person who wrote it.

A good runbook has: a description of the symptoms you'll see, the immediate actions for the first 5 minutes, a fallback plan if the immediate fix doesn't work, and post-recovery verification steps.

The rule of thumb: if you can't write a runbook for a failure scenario, you don't understand the failure scenario well enough.

## Hot-Swap and Rollback

When you deploy a new version of the pipeline, you need instant rollback. The simplest pattern is symlink swapping. Your live pipeline path — let's say `/pipeline/current` — is a symlink pointing to `/pipeline/v2.3`. When you want to deploy v2.4, you deploy it to its own directory, run smoke tests, and then swap the symlink. If v2.4 breaks, you swap the symlink back to v2.3. One command, instant rollback, no files modified.

More sophisticated approaches include blue-green deployment — run both versions simultaneously and flip traffic between them — or canary deployment — route 10 percent of traffic through the new version and watch for errors before rolling out to 100 percent.

## What to Monitor

A production pipeline needs a monitoring dashboard. The critical metrics: queue depth (how many takes are waiting), processing time per take (is the solver getting slower), error rate (what percentage of takes fail validation), disk free on the NAS, circuit breaker states (is any service down), delivery latency (time from farm completion to artist availability), and sweeper heartbeat (is the file watcher process alive).

If you're not measuring it, you won't notice when it breaks. And by the time you notice, you've already blown past the 10-minute rule.

## Key Takeaways

*   Name your failures. Build a failure taxonomy. You can't defend against what you haven't identified.
*   Defense in depth: prevention, detection, recovery, human response. Four layers, each catching what the previous missed.
*   Retry for transient failures. Circuit breaker for total failures. They work together.
*   Graceful degradation means the stage never stops recording. Queue locally, flush when recovered.
*   Runbooks are version-controlled documentation. If you can't write one for a failure, you don't understand the failure.
*   Zero-downtime deployment via symlink swapping gives you instant rollback. Never deploy in-place to a live pipeline.
*   Monitor queue depth, error rate, disk space, heartbeats. If you're not measuring it, you can't manage it.
