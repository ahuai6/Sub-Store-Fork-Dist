# Sub-Store public build artifacts

This repository publishes build artifacts so Surge can download them.
The source repository (`ahuai6/Sub-Store-Fork`) is private. Only the explicitly requested geo.js operator source and its notices are published here alongside artifacts.

| | |
| --- | --- |
| Version | `2.44.8` |
| Built from | `9105596c208bd4fa47f2fe204bb43bc7f4a5b733` |
| Upstream tree | `091e6f8d8c2dcec8c1d8e792ecee4304935d6e90` |
| Upstream project | https://github.com/sub-store-org/Sub-Store |

## Surge beta module

```
https://raw.githubusercontent.com/ahuai6/Sub-Store-Fork-Dist/main/Surge-Beta.sgmodule
```

The same file is also attached to each release:

```
https://github.com/ahuai6/Sub-Store-Fork-Dist/releases/latest/download/Surge-Beta.sgmodule
```

Script paths inside the module use `releases/latest/download` on **this** repo.
Compared with [upstream's beta module](https://raw.githubusercontent.com/sub-store-org/Sub-Store/master/config/Surge-Beta.sgmodule), those artifact URLs differ and the default `cors` list also includes `https://ahuai6.github.io`.

Scheduled Gist sync, produce and prefetch tasks default to off. Installation
requires no prefetch input: all parameters have defaults; unused prefetch target
lists stay `off`. Existing saved module settings may persist on update, so
check task names or reinstall to apply new defaults.

## Frontend

https://ahuai6.github.io/Sub-Store-Fork-Dist/

The `/` redirect targets that site. It is the upstream front end (GPL-3.0), built for this subpath. License and corresponding source are on the `gh-pages` branch.

## Geo check operator

[geo.js](./geo.js) is also published as readable JavaScript at:

https://raw.githubusercontent.com/ahuai6/Sub-Store-Fork-Dist/main/geo.js

Add that URL as a Sub-Store Script Operator. It is a modified xream/scripts
operator; see [GEO-NOTICE.md](./GEO-NOTICE.md) for attribution, upstream terms,
changes and optional arguments, and [GEO-LICENSE.txt](./GEO-LICENSE.txt) for the
upstream GPL-3.0 license. It is separate from the backend's AGPL license.

## License

Sub-Store is licensed under the GNU Affero General Public License v3.0. See [LICENSE](./LICENSE).

Corresponding source for this build is upstream commit `091e6f8d8c2dcec8c1d8e792ecee4304935d6e90` (https://github.com/sub-store-org/Sub-Store/tree/091e6f8d8c2dcec8c1d8e792ecee4304935d6e90) plus whatever else is in the private source repo at `9105596c208bd4fa47f2fe204bb43bc7f4a5b733`. The release build also pins the mihomo User-Agent the same way upstream's release workflow does. AGPL-3.0 requires modified versions that are distributed to make their corresponding source available.
