# Sub-Store Front End

This branch is the Sub-Store front end, built so GitHub Pages can serve it at <https://ahuai6.github.io/Sub-Store-Fork-Dist/>.

- Project: [sub-store-org/Sub-Store-Front-End](https://github.com/sub-store-org/Sub-Store-Front-End)
- License: GNU General Public License v3.0 only. See [LICENSE](./LICENSE).
- Corresponding source: https://github.com/sub-store-org/Sub-Store-Front-End/tree/6d13e7e257b52485d6835d1bbdbd1fc3f8270dd2
- Package version: `2.34.2`
- Built from the latest release `2.34.2`, which is `master`.

The front end is GPL-3.0. Backend artifacts on the `main` branch of this repository are a separate Sub-Store build and stay under AGPL-3.0. This branch does not replace that license.

The corresponding source of the upstream project is the commit above. This build also applies the patches in `.github/scripts/prepare_frontend_pages.py` from ahuai6/Sub-Store-Fork (patch stamp `subpath-routes-1`).

1. Vite `base` / `VITE_PUBLIC_PATH` = `/Sub-Store-Fork-Dist/`
2. `VITE_API_URL` = `https://sub.store` (upstream `.env.production` already uses this URL)
3. VitePWA manifest `id`, `start_url`, and `scope` = `/Sub-Store-Fork-Dist/`
4. Workbox `navigateFallback` = `index.html`, resolved inside the service-worker scope rather than the domain root
5. `createWebHistory(import.meta.env.BASE_URL)`, because Vue Router 4.0.16 does not read Vite's base unless a `<base>` tag is present
6. Root-absolute `href` values in `index.html`, and `id` / `start_url` / `scope` in `public/manifests.json`, rewritten to `/Sub-Store-Fork-Dist/`
7. `404.html` is a copy of `index.html`, so GitHub Pages can boot the single-page app on client-side routes
8. `.nojekyll` is present so Pages publishes every file
9. `canFetchFlowsForCurrentPage` strips `import.meta.env.BASE_URL` from `window.location.pathname` before comparing it with `/subs`, so subscription traffic and expiry still load under the Pages subpath
10. The load-failed `href="/aboutUs"` links are `router-link` targets, so Vue Router resolves them inside the history base
11. The copied API link is `new URL(import.meta.env.BASE_URL, window.location.origin)`, so it opens this Pages site instead of the domain root

Source commit: https://github.com/sub-store-org/Sub-Store-Front-End/tree/6d13e7e257b52485d6835d1bbdbd1fc3f8270dd2
