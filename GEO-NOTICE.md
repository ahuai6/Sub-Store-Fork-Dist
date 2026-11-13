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
optional reachability checks, Surge concurrency and time-budget limits. Existing
script arguments and output templates are preserved; new modes are opt-in.
The source is distributed as readable JavaScript with this attribution and the
upstream GPL license, separately from the backend's AGPL license.

Public URL: https://raw.githubusercontent.com/ahuai6/Sub-Store-Fork-Dist/main/geo.js
Use `geo.js` as a Sub-Store Script Operator, not as a standalone Surge HTTP script.
Its `cache` argument is optional. Cached check results expire with the global
`scriptCacheTtl`; disabling caching or clearing the cache forces new checks.
`two_phase=true` enables probes before geo; `dedup_target=true` is appropriate
only when the same server+port+type is known to share a forwarding policy.
