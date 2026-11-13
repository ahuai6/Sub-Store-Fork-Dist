#!/usr/bin/env python3
"""Print the source SHA stored in the Dist README version table.

publish_public_dist.sh rewrites that table on every publish. The scheduled
publish compares it with private main and does not build when they match.
"""

import re
import sys

PATTERN = re.compile(r"^\| Built from \| `([0-9a-f]{40})` \|$", re.MULTILINE)


def published_source_sha(text: str) -> str:
    found = PATTERN.findall(text)
    if len(found) != 1:
        raise ValueError(f"expected one Built from SHA, found {len(found)}")
    return found[0]


def main() -> None:
    try:
        print(published_source_sha(sys.stdin.read()))
    except ValueError as exc:
        print(f"::error::{exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
