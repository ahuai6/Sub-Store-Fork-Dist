# Sub-Store public build artifacts

This repository publishes build artifacts so Surge can download them.
The source repository (`ahuai6/Sub-Store-Fork`) is private. Do not put source here.

| | |
| --- | --- |
| Version | `2.44.8` |
| Built from | `b76bd60827871ce751c82c592073864214b62158` |
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

## Frontend

https://ahuai6.github.io/Sub-Store-Fork-Dist/

The `/` redirect targets that site. It is the upstream front end (GPL-3.0), built for this subpath. License and corresponding source are on the `gh-pages` branch.

## License

Sub-Store is licensed under the GNU Affero General Public License v3.0. See [LICENSE](./LICENSE).

Corresponding source for this build is upstream commit `091e6f8d8c2dcec8c1d8e792ecee4304935d6e90` (https://github.com/sub-store-org/Sub-Store/tree/091e6f8d8c2dcec8c1d8e792ecee4304935d6e90) plus whatever else is in the private source repo at `b76bd60827871ce751c82c592073864214b62158`. The release build also pins the mihomo User-Agent the same way upstream's release workflow does. AGPL-3.0 requires modified versions that are distributed to make their corresponding source available.
