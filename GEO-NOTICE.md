# geo.js attribution and changes

`geo.js` is a modified copy of
[xream/scripts geo.js](https://github.com/xream/scripts/blob/main/surge/modules/sub-store-scripts/check/geo.js).
The repository's `LICENSE` is GNU GPL version 3; a verbatim copy is provided as
[GEO-LICENSE.txt](./GEO-LICENSE.txt). The original file has no separate SPDX header.
Upstream repository revision checked on 2026-11-13:
`49248e431b1ebb3f55b6d384a25582f74cde8207`.

The upstream [README](https://github.com/xream/scripts/blob/49248e431b1ebb3f55b6d384a25582f74cde8207/README.md)
contains additional disclaimers, use restrictions and a 24-hour deletion request.
Those statements coexist with the GPL license; this notice records both and does
not claim that their legal interpretation has been resolved. Publication of this
modified file was explicitly requested by the fork owner on 2026-11-13.

Modified for ahuai6/Sub-Store-Fork on 2026-11-13: batched TTL-bound cache writes,
short keys, compiled regular expressions/templates, concurrent request sharing,
optional reachability checks, Surge concurrency and time-budget limits, and an
opt-in `keep_last` result. Existing script arguments and output templates are
preserved; new modes are opt-in.
The source is distributed as readable JavaScript with this attribution and the
upstream GPL license, separately from the backend's AGPL license.

Public URL: https://raw.githubusercontent.com/ahuai6/Sub-Store-Fork-Dist/main/geo.js
Use `geo.js` as a Sub-Store Script Operator, not as a standalone Surge HTTP script.
Its `cache` argument is optional. Cached check results expire with the global
`scriptCacheTtl`; disabling caching or clearing the cache forces new checks.
`two_phase=true` enables probes before geo; `dedup_target=true` is appropriate
only when the same server+port+type is known to share a forwarding policy.

`keep_last=true` is off by default. While off, output is unchanged. While on,
every node is still tested with the existing cache, `scriptCacheTtl`,
`two_phase`, `dedup_target`, and `time_budget` rules. A fresh success replaces
the stored result for that node. A failure, timeout, or node skipped because
the time budget ran out is rendered from that stored success when one exists,
with the same fields and format and with no reuse marker. If none exists, the
original failure behavior remains. Failures do not write or erase the stored
success. The node key is the script's existing `cacheId`, so different nodes
do not share a result. This store is separate from the TTL cache and is not
expired by `scriptCacheTtl`. Optional `keep_last_max_age` limits its age: a bare
number is milliseconds (same as `timeout` and `time_budget`); `3600s`, `24h`,
and `7d` are also accepted. Unset, empty, or `0` keeps it until a newer success
or until refresh. `/api/utils/refresh` and clear-cache delete it with the other
caches.

Example: `keep_last=true&keep_last_max_age=7d`.
