"""
Crawl4AI visual validator.

Crawls each scenario page, extracts data-gantt-* attributes, and validates
the rendered chart against expectations. Produces a JSON report.

Usage:
  BASE_URL=http://app:5199 python crawl4ai/validate.py

Output:
  crawl4ai/report.json — per-scenario results with pass/fail/details.
"""

import asyncio
import json
import os
import sys

BASE_URL = os.environ.get("BASE_URL", "http://localhost:5199")

SCENARIOS = [
    {"id": "basic", "min_bars": 2, "min_links": 2},
    {"id": "critical-path", "expect_critical": True},
    {"id": "baselines", "min_bars": 2},
    {"id": "split-tasks", "min_segments": 2},
    {"id": "category-colors", "min_bars": 7},
    {"id": "status-styling", "min_bars": 4},
    {"id": "holidays-weekends", "expect_holiday": True, "expect_weekend": True},
    {"id": "toolbar-hidden"},
    {"id": "empty-state", "min_bars": 0, "expect_empty": True},
    {"id": "drag-constraints", "min_bars": 2},
]


async def crawl_scenario(scenario: dict) -> dict:
    """Crawl one scenario page and extract data-gantt attributes."""
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

    browser_config = BrowserConfig(headless=True, browser_type="chromium")
    run_config = CrawlerRunConfig(
        js_code="""
        // Wait for the Gantt to render
        await new Promise(r => setTimeout(r, 2000));
        """,
        wait_until="networkidle",
    )

    url = f"{BASE_URL}/?scenario={scenario['id']}"
    result_data = {"id": scenario["id"], "url": url, "pass": True, "issues": []}

    try:
        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(url=url, config=run_config)

            html = result.html or ""

            # Count data-gantt elements
            import re

            bars = len(re.findall(r'data-gantt-role="task-bar"', html))
            milestones = len(re.findall(r'data-gantt-role="milestone"', html))
            links = len(re.findall(r'data-gantt-role="link"', html))
            segments = len(re.findall(r'data-gantt-role="segment"', html))
            critical = len(re.findall(r'data-gantt-critical="true"', html))
            weekends = len(re.findall(r'data-gantt-weekend="true"', html))
            holidays = len(re.findall(r'data-gantt-holiday="true"', html))

            result_data["counts"] = {
                "bars": bars,
                "milestones": milestones,
                "links": links,
                "segments": segments,
                "critical": critical,
                "weekends": weekends,
                "holidays": holidays,
            }

            # Validate
            min_bars = scenario.get("min_bars")
            if min_bars is not None and bars < min_bars:
                result_data["pass"] = False
                result_data["issues"].append(
                    f"Expected >= {min_bars} bars, found {bars}"
                )

            if scenario.get("min_links") and links < scenario["min_links"]:
                result_data["pass"] = False
                result_data["issues"].append(
                    f"Expected >= {scenario['min_links']} links, found {links}"
                )

            if scenario.get("expect_critical") and critical == 0:
                result_data["pass"] = False
                result_data["issues"].append("No critical elements found")

            if scenario.get("min_segments") and segments < scenario["min_segments"]:
                result_data["pass"] = False
                result_data["issues"].append(
                    f"Expected >= {scenario['min_segments']} segments, found {segments}"
                )

            if scenario.get("expect_weekend") and weekends == 0:
                result_data["pass"] = False
                result_data["issues"].append("No weekend cells found")

            if scenario.get("expect_holiday") and holidays == 0:
                result_data["pass"] = False
                result_data["issues"].append("No holiday cells found")

            if scenario.get("expect_empty"):
                if "No tasks to display" not in html:
                    result_data["pass"] = False
                    result_data["issues"].append("Empty state text not found")

    except Exception as e:
        result_data["pass"] = False
        result_data["issues"].append(f"Crawl error: {str(e)}")

    return result_data


async def main():
    print(f"Crawl4AI validator — {len(SCENARIOS)} scenarios against {BASE_URL}")
    results = []
    for scenario in SCENARIOS:
        print(f"  crawling {scenario['id']}...", end=" ", flush=True)
        r = await crawl_scenario(scenario)
        status = "✓" if r["pass"] else "✗"
        print(f"{status} {r.get('counts', {})}")
        if r["issues"]:
            for issue in r["issues"]:
                print(f"    ⚠ {issue}")
        results.append(r)

    report_path = os.path.join(os.path.dirname(__file__), "report.json")
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nReport written to {report_path}")

    passed = sum(1 for r in results if r["pass"])
    failed = len(results) - passed
    print(f"\n{'✓' if failed == 0 else '✗'} {passed}/{len(results)} passed")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
