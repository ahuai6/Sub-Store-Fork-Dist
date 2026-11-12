# Sub-Store public build artifacts

This repository publishes build artifacts so Surge can download them.
The source repository (`ahuai6/Sub-Store-Fork`) is private. Do not put source here.

| | |
| --- | --- |
| Version | `2.44.8` |
| Built from | `03072cfe3b5130c8e056ec462b27e082fbbf42af` |
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
Compared with [upstream's beta module](https://raw.githubusercontent.com/sub-store-org/Sub-Store/master/config/Surge-Beta.sgmodule), only those artifact URLs differ.

## License

Sub-Store is licensed under the GNU Affero General Public License v3.0. See [LICENSE](./LICENSE).

Corresponding source for this build is upstream commit `091e6f8d8c2dcec8c1d8e792ecee4304935d6e90` (https://github.com/sub-store-org/Sub-Store/tree/091e6f8d8c2dcec8c1d8e792ecee4304935d6e90) plus whatever else is in the private source repo at `03072cfe3b5130c8e056ec462b27e082fbbf42af`. The release build also pins the mihomo User-Agent the same way upstream's release workflow does. AGPL-3.0 requires modified versions that are distributed to make their corresponding source available.
