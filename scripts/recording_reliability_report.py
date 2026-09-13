#!/usr/bin/env python3
"""Echo recording reliability harness.

This is intentionally an external test harness. It does not add segmentation or
change Echo's recorder. Run it against a local/deployed URL and inspect the
generated JSON/Markdown report before making architectural changes.

Requires: pip install playwright && playwright install chromium
"""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import statistics
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from playwright.async_api import Browser, BrowserContext, Page, async_playwright


@dataclass
class Sample:
    elapsed_seconds: float
    heap_used_bytes: int | None
    heap_total_bytes: int | None
    js_heap_limit_bytes: int | None
    cpu_seconds: float | None
    audio_state: str | None
    recorder_text: str
    errors: list[str] = field(default_factory=list)


@dataclass
class ScenarioResult:
    name: str
    status: str
    duration_seconds: float
    users: int = 1
    samples: list[Sample] = field(default_factory=list)
    observations: list[str] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def browser_sample(page: Page, started: float) -> Sample:
    metrics: dict[str, Any] = {}
    try:
        metrics = await page.evaluate("""() => ({
          memory: performance.memory ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          } : null,
          recorderText: document.body.innerText.slice(0, 4000),
          audioStates: [...document.querySelectorAll('audio,video')].map(e => ({paused: e.paused, readyState: e.readyState}))
        })""")
    except Exception as exc:
        return Sample(time.monotonic() - started, None, None, None, None, None, "", [str(exc)])

    text = metrics.get("recorderText") or ""
    lower = text.lower()
    if "recording" in lower:
        state = "recording"
    elif "paused" in lower:
        state = "paused"
    elif "complete" in lower or "stopped" in lower:
        state = "stopped"
    else:
        state = "unknown"
    memory = metrics.get("memory") or {}
    return Sample(
        elapsed_seconds=time.monotonic() - started,
        heap_used_bytes=memory.get("used"),
        heap_total_bytes=memory.get("total"),
        js_heap_limit_bytes=memory.get("limit"),
        cpu_seconds=None,
        audio_state=state,
        recorder_text=text[-1000:],
    )


async def open_echo(context: BrowserContext, url: str) -> Page:
    page = await context.new_page()
    await page.goto(url, wait_until="domcontentloaded", timeout=60_000)
    await page.wait_for_timeout(2_000)
    return page


async def run_long_session(browser: Browser, args: argparse.Namespace) -> ScenarioResult:
    result = ScenarioResult("continuous_recording", "not_run", args.duration_seconds)
    print(f"\n[START] Continuous recording baseline | duration={args.duration_seconds:.0f}s | headed={args.headed}", flush=True)
    context = await browser.new_context(permissions=["microphone", "camera"])
    page = await open_echo(context, args.url)
    started = time.monotonic()
    try:
        # The harness does not guess app selectors. A selector may be supplied
        # for the deployed build, otherwise this remains a baseline observation.
        if args.start_selector:
            await page.locator(args.start_selector).click(timeout=10_000)
            print(f"[ACTION] Clicked recording start selector: {args.start_selector}", flush=True)
        else:
            result.limitations.append("No --start-selector supplied; this run measures page stability but does not start recording.")
            print("[INFO] No --start-selector supplied; recording will NOT start in this run.", flush=True)

        next_sample = 0.0
        while time.monotonic() - started < args.duration_seconds:
            elapsed = time.monotonic() - started
            if elapsed >= next_sample:
                sample = await browser_sample(page, started)
                result.samples.append(sample)
                print(f"[SAMPLE] continuous elapsed={elapsed:.0f}s state={sample.audio_state} heap={sample.heap_used_bytes or 'n/a'}", flush=True)
                next_sample += args.sample_interval
            await page.wait_for_timeout(250)

        if args.stop_selector:
            await page.locator(args.stop_selector).click(timeout=10_000)
            print(f"[ACTION] Clicked recording stop selector: {args.stop_selector}", flush=True)
        result.status = "passed" if not any(sample.errors for sample in result.samples) else "degraded"
    except Exception as exc:
        result.status = "failed"
        result.errors.append(str(exc))
    finally:
        await context.close()
    result.observations.extend(analyze_samples(result.samples))
    print(f"[{result.status.upper()}] Continuous recording baseline complete | samples={len(result.samples)}", flush=True)
    return result


async def run_concurrency(browser: Browser, args: argparse.Namespace) -> ScenarioResult:
    result = ScenarioResult("concurrent_users", "not_run", args.concurrency_seconds, args.users)
    print(f"\n[START] Concurrency test | users={args.users} | duration={args.concurrency_seconds:.0f}s", flush=True)
    contexts: list[BrowserContext] = []
    pages: list[Page] = []
    started = time.monotonic()
    try:
        for _ in range(args.users):
            context = await browser.new_context(permissions=["microphone", "camera"])
            contexts.append(context)
            pages.append(await open_echo(context, args.url))
        await asyncio.sleep(args.concurrency_seconds)
        failures = 0
        for page in pages:
            if page.is_closed():
                failures += 1
        result.status = "passed" if failures == 0 else "failed"
        result.observations.append(f"Opened and held {len(pages)} independent browser contexts for {args.concurrency_seconds:.0f}s.")
        if failures:
            result.errors.append(f"{failures} browser contexts closed unexpectedly.")
    except Exception as exc:
        result.status = "failed"
        result.errors.append(str(exc))
    finally:
        for context in contexts:
            await context.close()
    print(f"[{result.status.upper()}] Concurrency test complete | contexts={len(pages)}", flush=True)
    return result


async def run_network_recovery(browser: Browser, args: argparse.Namespace) -> ScenarioResult:
    result = ScenarioResult("network_recovery", "not_run", args.recovery_seconds)
    print(f"\n[START] Network recovery test | outage={args.recovery_seconds:.0f}s", flush=True)
    context = await browser.new_context()
    page = await open_echo(context, args.url)
    try:
        await page.route("**/api/**", lambda route: route.abort())
        await page.wait_for_timeout(args.recovery_seconds * 1000)
        await page.unroute("**/api/**")
        response = await page.reload(wait_until="domcontentloaded", timeout=60_000)
        result.status = "passed" if response and response.ok else "degraded"
        result.observations.append("API requests were blocked temporarily, then restored and the page was reloaded.")
        result.limitations.append("This validates UI/API recovery only; it cannot prove microphone buffer recovery without an active recording.")
    except Exception as exc:
        result.status = "failed"
        result.errors.append(str(exc))
    finally:
        await context.close()
    print(f"[{result.status.upper()}] Network recovery test complete", flush=True)
    return result


def analyze_samples(samples: list[Sample]) -> list[str]:
    used = [s.heap_used_bytes for s in samples if s.heap_used_bytes is not None]
    if len(used) < 2:
        return ["Browser JS heap was not exposed; use Chromium with performance.memory support for memory analysis."]
    growth = used[-1] - used[0]
    peak = max(used)
    observations = [f"JS heap start={used[0]:,} bytes, end={used[-1]:,} bytes, peak={peak:,} bytes, delta={growth:+,} bytes."]
    if growth > max(50 * 1024 * 1024, used[0] * 0.5):
        observations.append("Potential uncontrolled heap growth detected; repeat with a longer run before changing architecture.")
    else:
        observations.append("No large heap increase detected during this run.")
    return observations


def recommendation(results: list[ScenarioResult]) -> str:
    failed = [r for r in results if r.status == "failed"]
    if failed:
        return "CONTINUOUS RECORDING WITH ADDITIONAL SAFEGUARDS"
    limited = any(r.limitations for r in results)
    if limited:
        return "CONTINUOUS RECORDING WITH ADDITIONAL SAFEGUARDS"
    return "CONTINUOUS RECORDING IS SUFFICIENT"


def report_payload(args: argparse.Namespace, results: list[ScenarioResult]) -> dict[str, Any]:
    continuous = next((result for result in results if result.name == "continuous_recording"), None)
    concurrency = next((result for result in results if result.name == "concurrent_users"), None)
    recovery = next((result for result in results if result.name == "network_recovery"), None)
    return {
        "generatedAt": now_iso(),
        "url": args.url,
        "configuration": {"durationSeconds": args.duration_seconds, "users": args.users, "sampleInterval": args.sample_interval},
        "successCriteria": {
            "longSessionHours": 8,
            "concurrencyUsers": [1, 5, 10, 20],
            "principle": "Measure continuous recording before considering segmentation.",
        },
        "results": [asdict(result) for result in results],
        "executiveSummary": "This report measures the existing continuous recorder before any segmentation is added.",
        "currentArchitectureTested": "Continuous browser recording with background chunk transcription; no recording segmentation was introduced by this harness.",
        "longSessionResults": {"2h": "not measured unless --duration-seconds=7200", "4h": "not measured unless --duration-seconds=14400", "6h": "not measured unless --duration-seconds=21600", "8h": "not measured unless --duration-seconds=28800", "currentRun": asdict(continuous) if continuous else None},
        "concurrentUserResults": {"1": "not measured", "5": "run with --users=5", "10": "run with --users=10", "20": "run with --users=20", "currentRun": asdict(concurrency) if concurrency else None},
        "browserResourceResults": "Chromium JS heap samples are included when performance.memory is available. CPU and system RAM require OS-level measurement on the local laptop.",
        "recordingReliability": "Requires a real microphone run with --start-selector; synthetic page stability alone cannot prove audio capture.",
        "networkRecovery": asdict(recovery) if recovery else None,
        "browserFailureRecovery": "Not safely simulated; requires browser crash/restart test on a real device.",
        "microphoneFailureRecovery": "Not safely simulated; requires unplug/replug and permission revocation on a real device.",
        "pauseResume": "Not exercised automatically because selectors are app-specific; provide selectors and add a scenario before relying on this result.",
        "transcriptionBacklog": "Not measured by this browser harness; correlate with Echo telemetry exports after instrumentation is active.",
        "askEchoDuringProcessing": "Not measured by this harness; run with an active recording and verify Ask Echo remains responsive.",
        "meetingIsolation": "Independent browser contexts are used for concurrency; backend identity isolation still requires production tests.",
        "clickUpFinalization": "Not automated; requires an authenticated end-to-end test and should be verified separately.",
        "identifiedBottlenecks": [],
        "failureModes": [item for result in results for item in result.errors],
        "maximumPotentialAudioLoss": "Not established by simulation. Measure the recorder's last persisted buffer and network recovery behavior on a real device.",
        "segmentationAnalysis": {
            "tested": False,
            "reason": "This harness measures the existing continuous architecture and does not add segmentation for testing.",
            "comparisonFields": ["memory", "CPU", "network", "browser stability", "failure recovery", "maximum audio loss", "upload reliability", "transcription integration", "complexity", "failure points"],
        },
        "finalDecision": recommendation(results),
        "recommendations": [
            {"priority": "MUST FIX", "item": "Investigate any failed scenario and reproduce it with a focused test."},
            {"priority": "SHOULD FIX", "item": "Run the same harness on a real laptop with microphone and camera permissions."},
            {"priority": "DO NOT CHANGE YET", "item": "Do not add recording segmentation unless continuous recording fails the defined thresholds."},
        ],
        "realWorldTestsStillRequired": [
            "8-hour recording with a real microphone and real browser tab.",
            "Laptop sleep/wake, browser crash/restart, microphone unplug/replug, and permission revocation.",
            "Actual network drop while recording and verification of recovered audio boundaries.",
            "20 simultaneous real users and final ClickUp archival under production credentials.",
        ],
    }


def markdown_report(payload: dict[str, Any]) -> str:
    lines = [f"# Echo recording reliability report", f"Generated: {payload['generatedAt']}", f"URL: {payload['url']}", "", f"## Final decision", f"**{payload['finalDecision']}**", "", "## Scenario results"]
    for result in payload["results"]:
        lines += [f"### {result['name']}", f"- Status: {result['status']}", f"- Duration: {result['duration_seconds']}s", f"- Users: {result['users']}"]
        lines += [f"- Observation: {item}" for item in result.get("observations", [])]
        lines += [f"- Limitation: {item}" for item in result.get("limitations", [])]
        lines += [f"- Error: {item}" for item in result.get("errors", [])]
    lines += ["", "## Segmentation analysis", "Segmentation was not added or tested. The harness measures continuous recording first.", "", "## Recommendations"]
    lines += [f"- **{item['priority']}** — {item['item']}" for item in payload["recommendations"]]
    lines += ["", "## Real-world tests still required"]
    lines += [f"- {item}" for item in payload["realWorldTestsStillRequired"]]
    return "\n".join(lines) + "\n"


async def main(args: argparse.Namespace) -> None:
    print("=" * 72, flush=True)
    print("ECHO RECORDING RELIABILITY HARNESS", flush=True)
    print("Continuous recording baseline — segmentation is not being added.", flush=True)
    print(f"Target: {args.url}", flush=True)
    print("=" * 72, flush=True)
    async with async_playwright() as playwright:
        launch_args = []
        if args.fake_media:
            launch_args += ["--use-fake-ui-for-media-stream", f"--use-file-for-fake-audio-capture={args.fake_media}"]
        browser = await playwright.chromium.launch(headless=not args.headed, args=launch_args)
        try:
            results: list[ScenarioResult] = []
            if args.overnight:
                print("[SUITE] Overnight suite enabled. This may run for 20+ hours.", flush=True)
                for label, duration in (("2h", 7200), ("4h", 14400), ("6h", 21600), ("8h", 28800)):
                    print(f"[SUITE] Starting long-session checkpoint {label}", flush=True)
                    checkpoint_args = argparse.Namespace(**vars(args))
                    checkpoint_args.duration_seconds = duration
                    result = await run_long_session(browser, checkpoint_args)
                    result.name = f"continuous_recording_{label}"
                    results.append(result)
                for users in (1, 5, 10, 20):
                    print(f"[SUITE] Starting concurrency checkpoint users={users}", flush=True)
                    checkpoint_args = argparse.Namespace(**vars(args))
                    checkpoint_args.users = users
                    result = await run_concurrency(browser, checkpoint_args)
                    result.name = f"concurrent_users_{users}"
                    results.append(result)
                results.append(await run_network_recovery(browser, args))
            else:
                results = [await run_long_session(browser, args)]
                results.append(await run_concurrency(browser, args))
                results.append(await run_network_recovery(browser, args))
            payload = report_payload(args, results)
        finally:
            await browser.close()

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    if args.format == "json":
        output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    else:
        output.write_text(markdown_report(payload), encoding="utf-8")
    print(f"Wrote {args.format.upper()} report to {output.resolve()}")
    print(f"Final decision: {payload['finalDecision']}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Measure Echo continuous recording before considering segmentation.")
    parser.add_argument("--url", default=os.environ.get("ECHO_URL", "http://localhost:3000"))
    parser.add_argument("--duration-seconds", type=float, default=120, help="Long-session baseline duration; use 7200/14400/21600/28800 for 2/4/6/8h runs.")
    parser.add_argument("--sample-interval", type=float, default=10)
    parser.add_argument("--users", type=int, default=5)
    parser.add_argument("--concurrency-seconds", type=float, default=30)
    parser.add_argument("--recovery-seconds", type=float, default=10)
    parser.add_argument("--overnight", action="store_true", help="Run unattended 2h/4h/6h/8h and 1/5/10/20-user checkpoints.")
    parser.add_argument("--start-selector", help="Optional selector for the Echo start-recording button.")
    parser.add_argument("--stop-selector", help="Optional selector for the Echo stop-recording button.")
    parser.add_argument("--fake-media", help="Optional WAV path for Chromium fake microphone input.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--headed", action="store_true", help="Show the Chromium window.")
    mode.add_argument("--headless", action="store_true", help="Run without a visible browser window.")
    parser.add_argument("--format", choices=["json", "md"], default="json")
    parser.add_argument("--output", default="artifacts/recording-reliability.json")
    args = parser.parse_args()
    if not args.headed and not args.headless:
        answer = input("Run with a visible browser window? [Y/n]: ").strip().lower()
        args.headed = answer in ("", "y", "yes")
    return args


if __name__ == "__main__":
    asyncio.run(main(parse_args()))
