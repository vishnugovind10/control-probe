from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP_DIRS = {
    ".git",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "reports",
    "test-results",
    ".vercel",
}
TEXT_SUFFIXES = {
    ".cff",
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".yaml",
    ".yml",
}


def term(*codes: int) -> str:
    return "".join(chr(code) for code in codes)


BLOCKED_PATTERNS = [
    re.compile(term(98, 105, 103) + r"\s*-?\s*" + term(52), re.IGNORECASE),
    re.compile(
        r"\b" + term(100, 101, 108, 111, 105, 116, 116, 101) + r"\b", re.IGNORECASE
    ),
    re.compile(r"\b" + term(112, 119, 99) + r"\b", re.IGNORECASE),
    re.compile(r"\b" + term(107, 112, 109, 103) + r"\b", re.IGNORECASE),
    re.compile(r"\b" + term(101, 114, 110, 115, 116) + r"\b", re.IGNORECASE),
    re.compile(r"\b" + term(121, 111, 117, 110, 103) + r"\b", re.IGNORECASE),
]


def should_scan(path: Path) -> bool:
    if any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts):
        return False
    if path.name == "package-lock.json":
        return False
    return path.suffix.lower() in TEXT_SUFFIXES


def main() -> int:
    findings: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or not should_scan(path):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for line_number, line in enumerate(text.splitlines(), start=1):
            if any(pattern.search(line) for pattern in BLOCKED_PATTERNS):
                findings.append(f"{path.relative_to(ROOT)}:{line_number}")

    if findings:
        print("Blocked public-language references found:")
        print("\n".join(findings))
        return 1

    print("public language scan passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
