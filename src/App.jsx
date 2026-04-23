import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import './App.css'

const API_URL = 'https://api.synthetic.new/v2/quotas'
const MODELS_URL = 'https://api.synthetic.new/openai/v1/models'
const OPENAI_BASE = 'https://api.synthetic.new/openai/v1'
const ANTHROPIC_BASE = 'https://api.synthetic.new/anthropic/v1'

function useQuotas(apiKey) {
  return useQuery({
    queryKey: ['quotas', apiKey],
    queryFn: async () => {
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) throw new Error(res.status)
      return res.json()
    },
    refetchInterval: 5000,
    enabled: !!apiKey,
  })
}

function useModels(apiKey) {
  return useQuery({
    queryKey: ['models', apiKey],
    queryFn: async () => {
      const res = await fetch(MODELS_URL, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) throw new Error(res.status)
      const json = await res.json()
      return json.data || []
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!apiKey,
  })
}

function formatDuration(ms) {
  if (ms <= 0) return 'now'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function useCountdown(isoDate) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!isoDate) return
    let raf
    function tick() {
      setRemaining(new Date(isoDate).getTime() - Date.now())
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [isoDate])
  return remaining
}

function colorForUsed(pct) {
  if (pct >= 90) return '#ef4444'
  if (pct >= 70) return '#f97316'
  if (pct >= 50) return '#eab308'
  return '#22c55e'
}

function badgeClassFor(pct) {
  if (pct >= 90) return 'badge-red'
  if (pct >= 70) return 'badge-orange'
  if (pct >= 50) return 'badge-yellow'
  return 'badge-green'
}

function FuelGauge({ pct, size = 180 }) {
  const cx = size / 2
  const cy = size / 2 + 10
  const r = size / 2 - 14
  const startAngle = -225
  const endAngle = 45
  const totalAngle = endAngle - startAngle

  const needleAngle = startAngle + (Math.min(pct, 100) / 100) * totalAngle
  const needleRad = (needleAngle * Math.PI) / 180
  const needleLen = r - 18

  const nx = cx + needleLen * Math.cos(needleRad)
  const ny = cy + needleLen * Math.sin(needleRad)

  const zones = useMemo(() => {
    const segs = []
    const steps = 50
    for (let i = 0; i < steps; i++) {
      const t = i / steps
      const a1 = startAngle + t * totalAngle
      const a2 = startAngle + ((i + 1) / steps) * totalAngle
      const rad1 = (a1 * Math.PI) / 180
      const rad2 = (a2 * Math.PI) / 180
      segs.push({ x1: cx + r * Math.cos(rad1), y1: cy + r * Math.sin(rad1), x2: cx + r * Math.cos(rad2), y2: cy + r * Math.sin(rad2), t })
    }
    return segs
  }, [cx, cy, r, startAngle, totalAngle])

  const ticks = useMemo(() => {
    const t = []
    for (let i = 0; i <= 10; i++) {
      const angle = startAngle + (i / 10) * totalAngle
      const rad = (angle * Math.PI) / 180
      const outer = r + 4
      const inner = r - (i % 5 === 0 ? 10 : 5)
      t.push({
        x1: cx + inner * Math.cos(rad), y1: cy + inner * Math.sin(rad),
        x2: cx + outer * Math.cos(rad), y2: cy + outer * Math.sin(rad),
        major: i % 5 === 0,
      })
    }
    return t
  }, [cx, cy, r, startAngle, totalAngle])

  function segColor(t) {
    const usedP = t * 100
    if (usedP < 50) return '#22c55e'
    if (usedP < 70) return '#eab308'
    if (usedP < 90) return '#f97316'
    return '#ef4444'
  }

  const usedColor = colorForUsed(pct)

  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`} className="fuel-gauge">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {zones.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={segColor(s.t)} strokeWidth="6" strokeLinecap="round" opacity={0.2} />
      ))}
      {zones.filter(s => s.t <= pct / 100).map((s, i) => (
        <line key={`a${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke={segColor(s.t)} strokeWidth="6" strokeLinecap="round" opacity={0.9} />
      ))}
      {ticks.map((t, i) => (
        <line key={`t${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
          stroke={t.major ? '#71717a' : '#3f3f50'} strokeWidth={t.major ? 2 : 1} strokeLinecap="round" />
      ))}
      <line x1={cx} y1={cy} x2={nx} y2={ny}
        stroke={usedColor} strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
      <circle cx={cx} cy={cy} r="5" fill={usedColor} />
      <circle cx={cx} cy={cy} r="2.5" fill="#0a0a0f" />
      <text x={cx - r + 8} y={cy + 16} fontSize="9" fill="#71717a" fontFamily="sans-serif" textAnchor="middle">0</text>
      <text x={cx + r - 8} y={cy + 16} fontSize="9" fill="#71717a" fontFamily="sans-serif" textAnchor="middle">100</text>
      <text x={cx} y={cy - 2} fontSize="22" fill={usedColor} fontFamily="sans-serif" fontWeight="700" textAnchor="middle">
        {pct.toFixed(0)}%
      </text>
    </svg>
  )
}

function Login({ onLogin }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit() {
    const trimmed = key.trim()
    if (!trimmed) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${trimmed}` },
      })
      if (!res.ok) throw new Error()
      onLogin(trimmed)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-box">
        <h1>Synthetic Dashboard</h1>
        <p>Enter your API key to view usage</p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="glhf_..."
          autoFocus
        />
        <button onClick={submit} disabled={loading}>
          {loading ? 'Connecting...' : 'Connect'}
        </button>
        {error && <div className="login-error">Invalid API key or connection failed</div>}
      </div>
    </div>
  )
}

function TimerValue({ isoDate }) {
  const remaining = useCountdown(isoDate)
  return <span className="timer-value">{formatDuration(remaining)}</span>
}

function GaugeCard({ title, used, limit, renewsAt, badgeOverride }) {
  const pct = limit > 0 ? (used / limit) * 100 : 0
  const rem = limit - used
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{title}</span>
        <span className={`card-badge ${badgeOverride?.class || badgeClassFor(pct)}`}>
          {badgeOverride?.label || `${pct.toFixed(1)}%`}
        </span>
      </div>
      <FuelGauge pct={pct} />
      <div className="gauge-stats">
        <div className="gauge-stat">
          <span className="gauge-stat-label">Used</span>
          <span className="gauge-stat-value">{used}</span>
        </div>
        <div className="gauge-stat">
          <span className="gauge-stat-label">Limit</span>
          <span className="gauge-stat-value">{limit}</span>
        </div>
        <div className="gauge-stat">
          <span className="gauge-stat-label">Remaining</span>
          <span className="gauge-stat-value remaining">{rem}</span>
        </div>
      </div>
      {renewsAt && (
        <div className="timer-row">
          <span className="timer-icon">&#9202;</span>
          Renews in <TimerValue isoDate={renewsAt} />
        </div>
      )}
    </div>
  )
}

function WeeklyCard({ data }) {
  const { percentRemaining, maxCredits, remainingCredits, nextRegenCredits, nextRegenAt } = data
  const usedPct = 100 - percentRemaining
  return (
    <div className="card wide">
      <div className="card-header">
        <span className="card-title">Weekly Token Limit</span>
        <span className={`card-badge ${badgeClassFor(usedPct)}`}>
          {usedPct.toFixed(1)}% used
        </span>
      </div>
      <div className="weekly-layout">
        <FuelGauge pct={usedPct} size={200} />
        <div className="credits-grid">
          <div className="credit-item">
            <div className="credit-label">Max Credits</div>
            <div className="credit-value">{maxCredits}</div>
          </div>
          <div className="credit-item">
            <div className="credit-label">Remaining</div>
            <div className="credit-value">{remainingCredits}</div>
          </div>
          <div className="credit-item">
            <div className="credit-label">Next Regen</div>
            <div className="credit-value">{nextRegenCredits}</div>
          </div>
          <div className="credit-item">
            <div className="credit-label">Regen In</div>
            <div className="credit-value timer-value">
              <TimerValue isoDate={nextRegenAt} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button className="copy-btn" onClick={copy} title="Copy">
      {copied ? '✓' : '⧉'}
    </button>
  )
}

function Sidebar({ apiKey, open, onToggle }) {
  const { data: models, isLoading, error } = useModels(apiKey)

  const grouped = useMemo(() => {
    if (!models) return {}
    const groups = {}
    models.forEach((m) => {
      const id = m.id || ''
      const owner = id.startsWith('hf:') ? id.split('/')[0].replace('hf:', '') : 'other'
      if (!groups[owner]) groups[owner] = []
      groups[owner].push(id)
    })
    Object.values(groups).forEach((arr) => arr.sort())
    return groups
  }, [models])

  const sortedOwners = useMemo(() => Object.keys(grouped).sort(), [grouped])

  return (
    <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
      <button className="sidebar-toggle" onClick={onToggle} title={open ? 'Close sidebar' : 'Open sidebar'}>
        <span className="toggle-icon">{open ? '◀' : '▶'}</span>
      </button>
      {open && (
        <div className="sidebar-content">
          <div className="sidebar-section">
            <h2 className="sidebar-heading">API Endpoints</h2>
            <div className="endpoint-group">
              <div className="endpoint-label">OpenAI Compatible</div>
              <div className="endpoint-row">
                <code className="endpoint-url">{OPENAI_BASE}</code>
                <CopyButton text={OPENAI_BASE} />
              </div>
            </div>
            <div className="endpoint-group">
              <div className="endpoint-label">Anthropic Compatible</div>
              <div className="endpoint-row">
                <code className="endpoint-url">{ANTHROPIC_BASE}</code>
                <CopyButton text={ANTHROPIC_BASE} />
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h2 className="sidebar-heading">
              Available Models
              {models && <span className="model-count">{models.length}</span>}
            </h2>
            {isLoading && <div className="sidebar-loading">Loading models...</div>}
            {error && <div className="sidebar-error">Failed to load models</div>}
            {sortedOwners.map((owner) => (
              <div key={owner} className="model-group">
                <div className="model-group-owner">{owner}</div>
                {grouped[owner].map((id) => (
                  <div key={id} className="model-item">
                    <code className="model-id">{id}</code>
                    <CopyButton text={id} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

function Dashboard({ apiKey, onLogout }) {
  const { data, isFetching } = useQuotas(apiKey)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="dashboard-layout">
      <Sidebar apiKey={apiKey} open={sidebarOpen} onToggle={() => setSidebarOpen(v => !v)} />
      <div className="dashboard-main">
        <header>
          <h1>Synthetic Usage</h1>
          <div className="header-actions">
            <span className="refresh-indicator">
              {isFetching && <span className="pulse-dot" />}
              {isFetching ? 'Refreshing...' : 'Auto-refresh every 5s'}
            </span>
            <button className="btn-ghost" onClick={onLogout}>Logout</button>
          </div>
        </header>
        <main>
          <div className="grid">
          {data && (
            <GaugeCard
              title="Subscription Requests"
              used={data.subscription.requests}
              limit={data.subscription.limit}
              renewsAt={data.subscription.renewsAt}
            />
          )}
          {data && (
            <GaugeCard
              title="Search (Hourly)"
              used={data.search.hourly.requests}
              limit={data.search.hourly.limit}
              renewsAt={data.search.hourly.renewsAt}
              badgeOverride={{ class: 'card-badge badge-cyan', label: `${((data.search.hourly.requests / data.search.hourly.limit) * 100).toFixed(1)}%` }}
            />
          )}
          {data && (
            <GaugeCard
              title="Free Tool Calls"
              used={data.freeToolCalls.requests}
              limit={data.freeToolCalls.limit}
              renewsAt={data.freeToolCalls.renewsAt}
              badgeOverride={data.freeToolCalls.limit === 0 ? { class: 'card-badge badge-green', label: 'N/A' } : undefined}
            />
          )}
          {data && (
            <GaugeCard
              title="5-Hour Rolling Limit"
              used={Math.floor(data.rollingFiveHourLimit.max - data.rollingFiveHourLimit.remaining)}
              limit={data.rollingFiveHourLimit.max}
              renewsAt={data.rollingFiveHourLimit.nextTickAt}
              badgeOverride={{ class: `card-badge ${data.rollingFiveHourLimit.limited ? 'badge-red' : 'badge-green'}`, label: data.rollingFiveHourLimit.limited ? 'LIMITED' : 'OK' }}
            />
          )}
          {data && <WeeklyCard data={data.weeklyTokenLimit} />}
        </div>
      </main>
      </div>
    </div>
  )
}

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('synthetic_api_key') || '')

  function handleLogin(key) {
    localStorage.setItem('synthetic_api_key', key)
    setApiKey(key)
  }

  function handleLogout() {
    localStorage.removeItem('synthetic_api_key')
    setApiKey('')
  }

  if (!apiKey) return <Login onLogin={handleLogin} />
  return <Dashboard apiKey={apiKey} onLogout={handleLogout} />
}

export default App
