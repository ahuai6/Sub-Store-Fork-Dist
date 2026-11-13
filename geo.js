/**
 * Optimized copy of
 * https://github.com/xream/scripts/blob/main/surge/modules/sub-store-scripts/check/geo.js
 *
 * Modified for ahuai6/Sub-Store-Fork on 2026-11-13.
 * The upstream repository LICENSE is GPL-3.0; its README also contains
 * additional restrictions. See GEO-NOTICE.md and GEO-LICENSE.txt for the
 * upstream attribution, terms and changes. Published at the fork owner's
 * explicit request; this file is separate from the backend AGPL license.
 *
 * Arguments and output remain compatible. two_phase and dedup_target are
 * opt-in; time_budget is milliseconds (default safety ceiling: 880s). Changes:
 * - cache writes are flushed in batches and once at the end
 * - the cache key is geo: plus MD5 of the original key material
 * - the regex and the format template are compiled once
 * - concurrency above Surge's 20 $httpClient limit is capped at 20
 * - optional time_budget (milliseconds) is off by default. When set, no new
 *   node is started after the budget. Requests are capped to remaining time. Nodes
 *   that never started keep their original name and are not cached as failed.
 *
 * Cache entries expire with settings.scriptCacheTtl (seconds), otherwise
 * 48 hours, the same rule as script-resource-cache.js. A hash is only the
 * key. It is not a reason to keep a result after that TTL. The existing
 * clear-cache action (scriptResourceCache.revokeAll) deletes these entries.
 *
 * When scriptResourceCache.sharedCheckGet is present, a node with the same
 * connection identity (name ignored) and the same api/regex/internal/method
 * reuses that shared result inside scriptCacheTtl. Output for this proxy
 * still uses this proxy's name and format.
 *
 * 节点信息(适配 Surge/Loon 版 也可在任意平台上使用 HTTP API)
 *
 * 参数
 * - [retries] 重试次数 默认 1
 * - [retry_delay] 重试延时(单位: 毫秒) 默认 1000
 * - [concurrency] 并发数 默认 10, 超过 20 时按 20 执行
 * - [internal] 使用内部方法获取 IP 信息. 默认 false
 * - [timeout] 请求超时(单位: 毫秒) 默认 5000
 * - [method] 请求方法. 默认 get
 * - [api] 测落地的 API. 默认为 http://ip-api.com/json?lang=zh-CN
 *         当使用 internal 时, 默认为 http://checkip.amazonaws.com
 * - [format] 自定义格式, 默认为: {{api.country}} {{api.isp}} - {{proxy.name}}
 *            当使用 internal 时, 默认为 {{api.countryCode}} {{api.aso}} - {{proxy.name}}
 * - [regex] 使用正则表达式从落地 API 响应中取数据. 格式为 a:x;b:y
 * - [geo] 在节点上附加 _geo 字段, 默认不附加
 * - [include_unsupported_proxy] 默认不包含
 * - [incompatible] 在节点上附加 _incompatible 字段, 默认不附加
 * - [remove_incompatible] 默认不移除
 * - [remove_failed] 默认不移除
 * - [surge_http_api] 默认不使用
 * - [surge_http_api_protocol] 默认 http
 * - [surge_http_api_key] HTTP API 的密码
 * - [cache] 使用缓存. 默认不使用缓存
 * - [disable_failed_cache/ignore_failed_error] 不使用失败缓存. 失败结果仍会写入, 与原脚本一致
 * - [time_budget] 可选总时间预算(毫秒). 默认关闭
 */

async function operator(proxies = [], targetPlatform, context) {
  const $ = $substore
  const { isLoon, isSurge, isNode, isEgern } = $.env
  const internal = $arguments.internal
  const regex = $arguments.regex
  let format = $arguments.format || '{{api.country}} {{api.isp}} - {{proxy.name}}'
  let url = $arguments.api || 'http://ip-api.com/json?lang=zh-CN'
  if (internal) {
    if (typeof $utils === 'undefined' || typeof $utils.geoip === 'undefined' || typeof $utils.ipaso === 'undefined') {
      $.error(`目前仅支持 Surge/Loon(build >= 692) 等有 $utils.ipaso 和 $utils.geoip API 的 App`)
      throw new Error('不支持使用内部方法获取 IP 信息, 请查看日志')
    }
    format = $arguments.format || `{{api.countryCode}} {{api.aso}} - {{proxy.name}}`
    url = $arguments.api || 'http://checkip.amazonaws.com'
  }
  const surge_http_api = $arguments.surge_http_api
  const surge_http_api_protocol = $arguments.surge_http_api_protocol || 'http'
  const surge_http_api_key = $arguments.surge_http_api_key
  const surge_http_api_enabled = surge_http_api
  if (!surge_http_api_enabled && !isLoon && !isSurge && !isEgern)
    throw new Error('请使用 Loon、Surge、Egern 或配置 Surge HTTP API')

  const disableFailedCache = $arguments.disable_failed_cache || $arguments.ignore_failed_error
  const remove_failed = $arguments.remove_failed
  const remove_incompatible = $arguments.remove_incompatible
  const incompatibleEnabled = $arguments.incompatible
  const includeUnsupportedProxy = $arguments.include_unsupported_proxy
  const geoEnabled = $arguments.geo
  const cacheEnabled = $arguments.cache && scriptTtlMs() > 0
  const twoPhase = enabled($arguments.two_phase)
  const targetDedup = enabled($arguments.dedup_target)
  const requests = new Map() // pending promises only, scoped to this invocation
  const reachabilityUrl = $arguments.reachability_url || 'http://www.gstatic.com/generate_204'
  const reachabilityTimeout = Math.min(5000, positive($arguments.reachability_timeout, 1500))
  const cache = scriptResourceCache
  const method = $arguments.method || 'get'
  const target = isLoon ? 'Loon' : isEgern ? 'Egern' : isSurge ? 'Surge' : undefined
  let concurrency = parseInt($arguments.concurrency || 10)
  concurrency = Math.min(20, Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 10)
  const rawBudget = $arguments.time_budget
  let timeBudget = 0
  if (
    rawBudget != null &&
    rawBudget !== '' &&
    rawBudget !== false &&
    rawBudget !== 0 &&
    rawBudget !== '0'
  ) {
    const parsedBudget = Number(rawBudget)
    if (Number.isFinite(parsedBudget) && parsedBudget > 0) timeBudget = parsedBudget
  }
  const deadline = Date.now() + Math.min(timeBudget || 880000, 880000)
  const compiledRegex = compileRegex(regex)
  let compiledFormat = null
  try {
    compiledFormat = compileFormat(format)
  } catch (e) {
    compiledFormat = null
  }

  const CACHE_BATCH = 25
  const pending = []

  try {
    await executeAsyncTasks(
      proxies.map(proxy => () => check(proxy)),
      { concurrency }
    )

    if (remove_incompatible || remove_failed) {
      proxies = proxies.filter(p => {
        if (remove_incompatible && p._incompatible) {
          return false
        } else if (remove_failed && !p._geo) {
          return !remove_incompatible && p._incompatible
        }
        return true
      })
    }

    if (!geoEnabled || !incompatibleEnabled) {
      proxies = proxies.map(p => {
        if (!geoEnabled) {
          delete p._geo
        }
        if (!incompatibleEnabled) {
          delete p._incompatible
        }
        return p
      })
    }

    return proxies
  } finally {
    flushPending()
  }

  function sharedIdentity(proxy) {
    return {
      node: proxy,
      script: 'sub-store-fork/scripts/check/geo.js',
      args: {
        url,
        regex: regex || '',
        internal: internal ? 1 : 0,
        method,
        ...(twoPhase ? { twoPhase, reachabilityUrl, reachabilityTimeout } : {}),
        ...(targetDedup ? { targetDedup } : {}),
      },
    }
  }

  async function check(proxy) {
    const id = cacheEnabled ? cacheId(proxy) : undefined
    let finishShared = null
    try {
      let node
      if (isEgern && !surge_http_api_enabled) {
        node = JSON.stringify(
          ProxyUtils.produce([proxy], target, 'internal', {
            'include-unsupported-proxy': includeUnsupportedProxy,
          })[0]
        )
      } else {
        node = ProxyUtils.produce([proxy], surge_http_api_enabled ? 'Surge' : target, undefined, {
          'include-unsupported-proxy': includeUnsupportedProxy,
        })
      }
      if (node) {
        let cached = cache.get(id)
        if (cacheEnabled && !cached && typeof cache.sharedCheckGet === 'function') {
          try {
            cached = cache.sharedCheckGet(sharedIdentity(proxy))
          } catch (e) {
            cached = null
          }
        }
        const cacheUsable = cached && (cached.api || !disableFailedCache)
        if (
          cacheEnabled &&
          !cacheUsable &&
          typeof cache.sharedCheckClaim === 'function'
        ) {
          const claim = cache.sharedCheckClaim(sharedIdentity(proxy))
          if (claim.cached && (claim.cached.api || !disableFailedCache)) {
            cached = claim.cached
          } else if (claim.pending) {
            try {
              const shared = await claim.pending
              if (shared && (shared.api || !disableFailedCache)) cached = shared
            } catch (e) {}
          } else if (typeof claim.finish === 'function') {
            finishShared = claim.finish
          }
        }
        if (cacheEnabled && cached) {
          if (cached.api) {
            $.info(`[${proxy.name}] 使用成功缓存`)
            $.log(`[${proxy.name}] api: ${JSON.stringify(cached.api, null, 2)}`)
            proxy.name = formatNode({ proxy, api: cached.api })
            proxy._geo = cached.api
            return
          } else if (disableFailedCache) {
            $.info(`[${proxy.name}] 不使用失败缓存`)
          } else {
            $.info(`[${proxy.name}] 使用失败缓存`)
            return
          }
        }
        const startedAt = Date.now()
        if (twoPhase) {
          const reachable = await request(proxy, {
            method: 'get', url: reachabilityUrl, timeout: reachabilityTimeout, retries: 0,
            'policy-descriptor': node, node,
          }, 'reachability')
          const status = Number(reachable.status || reachable.statusCode || 200)
          if (status < 200 || status >= 400) throw new Error(`Reachability status: ${status}`)
        }
        if (Date.now() >= deadline) throw budgetError()
        const res = await request(proxy, {
          method,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
          },
          url,
          'policy-descriptor': node,
          node,
        }, 'geo')
        let api = String(lodash_get(res, 'body'))
        const status = parseInt(res.status || res.statusCode || 200)
        const latency = `${Date.now() - startedAt}`
        $.info(`[${proxy.name}] status: ${status}, latency: ${latency}`)
        if (internal) {
          const ip = api.trim()
          api = {
            countryCode: $utils.geoip(ip) || '',
            aso: $utils.ipaso(ip) || '',
            asn: $utils.ipasn(ip) || '',
          }
        } else {
          try {
            api = JSON.parse(api)
          } catch (e) {}
        }

        $.log(`[${proxy.name}] api: ${JSON.stringify(api, null, 2)}`)
        if (status == 200) {
          proxy.name = formatNode({ proxy, api })
          proxy._geo = api
          if (cacheEnabled) {
            $.info(`[${proxy.name}] 设置成功缓存`)
            remember(id, { api }, proxy, finishShared)
            finishShared = null
          }
        } else if (cacheEnabled) {
          $.info(`[${proxy.name}] 设置失败缓存`)
          remember(id, {}, proxy, finishShared)
          finishShared = null
        }
      } else {
        proxy._incompatible = true
      }
    } catch (e) {
      $.error(`[${proxy.name}] ${e.message ?? e}`)
      if (e.budgetExceeded) {
        if (finishShared) finishShared(null)
        return
      }
      if (cacheEnabled) {
        $.info(`[${proxy.name}] 设置失败缓存`)
        remember(id, {}, proxy, finishShared)
        finishShared = null
      } else if (finishShared) {
        try {
          finishShared(null, e)
        } catch (err) {}
        finishShared = null
      }
    }
  }

  function cacheId(proxy) {
    const filtered = Object.fromEntries(
      Object.entries(proxy).filter(([key]) => !/^(collectionName|subName|id|_.*)$/i.test(key))
    )
    const mode = twoPhase || targetDedup || method !== 'get'
      ? `:${twoPhase}:${targetDedup}:${reachabilityUrl}:${reachabilityTimeout}:${method}` : ''
    const canonical = `geo:${url}:${format}:${regex}:${internal}:${JSON.stringify(filtered)}${mode}`
    let digest = canonical
    try {
      if (typeof ProxyUtils.hex_md5 === 'function') digest = ProxyUtils.hex_md5(canonical)
    } catch (e) {}
    return `geo:${digest}`
  }

  function remember(id, data, proxy, finishShared) {
    if (cacheEnabled && proxy && typeof cache.sharedCheckSet === 'function') {
      try {
        cache.sharedCheckSet(sharedIdentity(proxy), data)
      } catch (e) {}
    }
    if (typeof finishShared === 'function') {
      try {
        finishShared(data)
      } catch (e) {}
    }
    if (!cacheEnabled || !id) return
    pending.push([id, data])
    if (pending.length >= CACHE_BATCH) flushPending()
  }

  function flushPending() {
    if (!pending.length) return
    const items = pending.splice(0, pending.length)
    if (typeof cache.flush === 'function' && typeof cache.set === 'function') {
      for (const [id, data] of items) cache.set(id, data)
      cache.flush()
      return
    }
    const expiry = Date.now() + scriptTtlMs()
    if (cache && cache.resourceCache && typeof cache._persist === 'function') {
      for (const [id, data] of items) {
        cache.resourceCache[id] = { time: expiry, data }
      }
      cache._persist()
      return
    }
    for (const [id, data] of items) cache.set(id, data)
  }

  function scriptTtlMs() {
    const fallback = 48 * 3600 * 1000
    try {
      const settings = $.read('settings') || {}
      const ttl = Number(settings.scriptCacheTtl)
      if (Object.prototype.hasOwnProperty.call(settings, 'scriptCacheTtl')) {
        return Number.isFinite(ttl) && ttl > 0 ? ttl * 1000 : 0
      }
    } catch (e) {}
    return fallback
  }

  function enabled(value) {
    return value === true || value === 1 || /^(true|1|yes|on)$/i.test(String(value))
  }

  function positive(value, fallback) {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }

  function budgetError() {
    const error = new Error('Check time budget exhausted')
    error.budgetExceeded = true
    return error
  }

  function request(proxy, options, phase) {
    // Default: identical routing identity, excluding display metadata. Wider
    // server+port sharing is explicitly opt-in: credentials can select exits.
    const identity = Object.fromEntries(Object.entries(proxy)
      .filter(([key]) => !/^(name|collectionName|subName|id|_.*)$/i.test(key))
      .sort(([a], [b]) => a.localeCompare(b)))
    const target = targetDedup ? { server: proxy.server, port: proxy.port, type: proxy.type } : identity
    const key = JSON.stringify([phase, target])
    if (requests.has(key)) return requests.get(key)
    const pending = http(options).finally(() => requests.delete(key))
    requests.set(key, pending)
    return pending
  }

  async function http(opt = {}) {
    const METHOD = opt.method || 'get'
    const TIMEOUT = positive(opt.timeout || $arguments.timeout, 5000)
    const RETRIES = parseFloat(opt.retries ?? $arguments.retries ?? 1)
    const RETRY_DELAY = parseFloat(opt.retry_delay ?? $arguments.retry_delay ?? 1000)

    let count = 0
    const fn = async () => {
      try {
        if (Date.now() >= deadline) throw budgetError()
        const attemptTimeout = Math.max(1, Math.min(TIMEOUT, deadline - Date.now()))
        if (surge_http_api_enabled) {
          const res = await $.http.post({
            url: `${surge_http_api_protocol}://${surge_http_api}/v1/scripting/evaluate`,
            timeout: attemptTimeout,
            headers: { 'x-key': surge_http_api_key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              script_text: `$httpClient.get(${JSON.stringify({
                ...opt,
                timeout: attemptTimeout / 1000,
              })}, (error, response, data) => {  $done({ error, response, data }) }) `,
              mock_type: 'cron',
              timeout: attemptTimeout / 1000,
            }),
          })
          let body = String(lodash_get(res, 'body'))
          try {
            body = JSON.parse(body)
          } catch (e) {}
          const error = lodash_get(body, 'result.error')
          if (error) throw new Error(error)
          const data = String(lodash_get(body, 'result.data'))
          const response = lodash_get(body, 'result.response') || {}
          return { ...response, body: data }
        } else {
          return await $.http[METHOD]({ ...opt, timeout: attemptTimeout })
        }
      } catch (e) {
        if (e.budgetExceeded || Date.now() >= deadline) throw budgetError()
        if (count < RETRIES) {
          count++
          const delay = RETRY_DELAY * count
          if (Date.now() + delay >= deadline) throw budgetError()
          await $.wait(delay)
          return await fn()
        } else {
          throw e
        }
      }
    }
    return await fn()
  }

  function lodash_get(source, path, defaultValue = undefined) {
    const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.')
    let result = source
    for (const p of paths) {
      result = Object(result)[p]
      if (result === undefined) {
        return defaultValue
      }
    }
    return result
  }

  function compileRegex(source) {
    if (!source) return []
    const compiled = []
    for (const pair of String(source).split(/\s*;\s*/g).filter(Boolean)) {
      const [key, pattern] = pair.split(/\s*:\s*/g).map(s => s.trim())
      if (!key || !pattern) continue
      try {
        compiled.push({ key, re: new RegExp(pattern) })
      } catch (e) {
        $.error(`正则表达式解析错误: ${e.message}`)
      }
    }
    return compiled
  }

  function compileFormat(template) {
    const body = String(template).replace(/\{\{(.*?)\}\}/g, '${$1}')
    return new Function('proxy', 'api', 'format', 'regex', `return \`${body}\``)
  }

  function formatNode({ proxy = {}, api = {} }) {
    let data = api
    if (compiledRegex.length) {
      const source = typeof api === 'string' ? api : JSON.stringify(api)
      const extracted = {}
      for (const item of compiledRegex) {
        item.re.lastIndex = 0
        extracted[item.key] = source.match(item.re)?.[1]?.trim()
      }
      data = { ...api, ...extracted }
    }
    if (compiledFormat) return compiledFormat(proxy, data, format, regex)
    let f = format.replace(/\{\{(.*?)\}\}/g, '${$1}')
    return eval(`\`${f}\``)
  }

  function executeAsyncTasks(tasks, { wrap, result, concurrency = 1 } = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        let running = 0
        const results = []
        let index = 0

        function executeNextTask() {
          while (index < tasks.length && running < concurrency) {
            if (deadline && Date.now() >= deadline) {
              index = tasks.length
              break
            }
            const taskIndex = index++
            const currentTask = tasks[taskIndex]
            running++

            currentTask()
              .then(data => {
                if (result) {
                  results[taskIndex] = wrap ? { data } : data
                }
              })
              .catch(error => {
                if (result) {
                  results[taskIndex] = wrap ? { error } : error
                }
              })
              .finally(() => {
                running--
                executeNextTask()
              })
          }

          if (running === 0) {
            return resolve(result ? results : undefined)
          }
        }

        await executeNextTask()
      } catch (e) {
        reject(e)
      }
    })
  }
}
