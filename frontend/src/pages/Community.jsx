import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Users, TrendingUp, TrendingDown, Send, Trophy, Zap, ChevronDown, ImagePlus, X } from 'lucide-react'
import PostCard from '../components/PostCard'
import PredictionCard from '../components/PredictionCard'
import { api } from '../api/client'
import useStore from '../store/useStore'

const TIER_COLORS  = { beginner: null, intermediate: 'var(--accent)', commercial: '#f59e0b' }
const TIMEFRAMES   = [{ label: '1 Day', value: 1 }, { label: '7 Days', value: 7 }, { label: '30 Days', value: 30 }]
const CONFIDENCES  = [{ label: 'Low', value: 'low' }, { label: 'Medium', value: 'medium' }, { label: 'High', value: 'high' }]
const TABS         = ['Feed', 'Predictions']

export default function Community() {
  const { user } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Feed')

  // Feed state
  const [posts, setPosts]           = useState([])
  const [postsTotal, setPostsTotal] = useState(0)
  const [postsLoading, setPostsLoading] = useState(true)
  const [postOffset, setPostOffset] = useState(0)

  // Compose state
  const [content, setContent]   = useState('')
  const [postTicker, setPostTicker] = useState('')
  const [posting, setPosting]   = useState(false)
  const [postError, setPostError] = useState('')

  // Predictions state
  const [preds, setPreds]               = useState([])
  const [predsTotal, setPredsTotal]     = useState(0)
  const [predsLoading, setPredsLoading] = useState(false)
  const [predOffset, setPredOffset]     = useState(0)
  const [leaderboard, setLeaderboard]   = useState([])

  // Prediction form
  const [predTicker,    setPredTicker]    = useState('')
  const [predDir,       setPredDir]       = useState('up')
  const [predDays,      setPredDays]      = useState(7)
  const [predConfidence, setPredConfidence] = useState('medium')
  const [predNote,      setPredNote]      = useState('')
  const [predImageFile, setPredImageFile] = useState(null)
  const [predImagePreview, setPredImagePreview] = useState(null)
  const [predSubmitting, setPredSubmitting] = useState(false)
  const [predError,     setPredError]     = useState('')
  const imageInputRef = useRef(null)

  // Confidence filter (commercial only)
  const [confFilter, setConfFilter] = useState(null)

  const PAGE = 20

  useEffect(() => { loadPosts(0) }, [])
  useEffect(() => { if (tab === 'Predictions') { loadPreds(0); loadLeaderboard() } }, [tab])

  async function loadPosts(offset) {
    setPostsLoading(true)
    try {
      const { data } = await api.getPosts({ limit: PAGE, offset })
      if (offset === 0) setPosts(data.posts)
      else setPosts(p => [...p, ...data.posts])
      setPostsTotal(data.total)
      setPostOffset(offset)
    } catch {}
    finally { setPostsLoading(false) }
  }

  async function loadPreds(offset, confidence = confFilter) {
    setPredsLoading(true)
    try {
      const params = { limit: PAGE, offset }
      if (confidence) params.confidence = confidence
      const { data } = await api.getPredictions(params)
      if (offset === 0) setPreds(data.predictions)
      else setPreds(p => [...p, ...data.predictions])
      setPredsTotal(data.total)
      setPredOffset(offset)
    } catch {}
    finally { setPredsLoading(false) }
  }

  function handleConfFilter(val) {
    const next = confFilter === val ? null : val
    setConfFilter(next)
    loadPreds(0, next)
  }

  async function loadLeaderboard() {
    try {
      const { data } = await api.getLeaderboard()
      setLeaderboard(data)
    } catch {}
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    setPostError('')
    setPosting(true)
    try {
      const { data } = await api.createPost({ content: content.trim(), ticker: postTicker.trim() || null })
      setPosts(p => [data, ...p])
      setContent('')
      setPostTicker('')
    } catch (err) {
      setPostError(err.response?.data?.detail || 'Could not post.')
    } finally {
      setPosting(false)
    }
  }

  function handleImageSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    setPredImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPredImagePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  function clearImage() {
    setPredImageFile(null)
    setPredImagePreview(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function handlePredict(e) {
    e.preventDefault()
    if (!user) { navigate('/login'); return }
    setPredError('')
    setPredSubmitting(true)
    try {
      let imageUrl = null
      if (predImageFile) {
        const fd = new FormData()
        fd.append('file', predImageFile)
        const { data: up } = await api.uploadImage(fd)
        imageUrl = up.url
      }
      const { data } = await api.createPrediction({
        ticker: predTicker.trim().toUpperCase(),
        direction: predDir,
        timeframe_days: predDays,
        confidence: predConfidence,
        note: predNote.trim() || null,
        image_url: imageUrl,
      })
      setPreds(p => [data, ...p])
      setPredTicker('')
      setPredNote('')
      clearImage()
    } catch (err) {
      setPredError(err.response?.data?.detail || 'Could not submit prediction.')
    } finally {
      setPredSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text-1)', fontSize: '0.88rem',
  }

  return (
    <div className="page fade-up">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
        <Users size={22} style={{ color: 'var(--accent)' }} />
        <h1 style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.04em' }}>Community</h1>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: tab === t ? 700 : 400, fontSize: '0.88rem',
            color: tab === t ? 'var(--text-1)' : 'var(--text-2)',
            borderBottom: `2px solid ${tab === t ? 'var(--green)' : 'transparent'}`,
            marginBottom: -1, transition: 'all 0.15s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── FEED TAB ────────────────────────────────────── */}
      {tab === 'Feed' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', maxWidth: 680, margin: '0 auto' }}>

          {/* Compose box */}
          <div className="glass-card" style={{ padding: '1.25rem' }}>
            <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={user ? "What's on your mind? Share a trade idea, analysis, or market take…" : "Sign in to post…"}
                disabled={!user}
                maxLength={500}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical', minHeight: 80, fontFamily: 'inherit' }}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  value={postTicker}
                  onChange={e => setPostTicker(e.target.value.toUpperCase())}
                  placeholder="Ticker (optional)"
                  maxLength={10}
                  disabled={!user}
                  style={{ ...inputStyle, width: 130 }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginLeft: 'auto' }}>
                  {content.length}/500
                </span>
                <button
                  type="submit"
                  disabled={!user || posting || !content.trim()}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', opacity: (!user || posting || !content.trim()) ? 0.5 : 1 }}
                >
                  <Send size={13} /> {posting ? 'Posting…' : 'Post'}
                </button>
              </div>
              {postError && (
                <div style={{ fontSize: '0.8rem', color: 'var(--red)', background: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.25)', borderRadius: 7, padding: '7px 10px' }}>
                  {postError}
                </div>
              )}
              {!user && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center' }}>
                  <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link> to join the conversation.
                </p>
              )}
            </form>
          </div>

          {/* Posts */}
          {postsLoading && posts.length === 0
            ? [0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 14 }} />)
            : posts.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem' }}>No posts yet. Be the first!</div>
              : posts.map(p => (
                  <PostCard key={p.id} post={p} onDelete={id => setPosts(ps => ps.filter(x => x.id !== id))} />
                ))
          }

          {posts.length < postsTotal && (
            <button
              onClick={() => loadPosts(postOffset + PAGE)}
              className="btn-ghost"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <ChevronDown size={14} /> Load more
            </button>
          )}
        </div>
      )}

      {/* ── PREDICTIONS TAB ─────────────────────────────── */}
      {tab === 'Predictions' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Left: form + feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* New prediction form */}
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)', marginBottom: '1rem' }}>
                Make a Prediction
              </h3>
              <form onSubmit={handlePredict} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    value={predTicker}
                    onChange={e => setPredTicker(e.target.value.toUpperCase())}
                    placeholder="Ticker (e.g. AAPL)"
                    maxLength={10}
                    required
                    disabled={!user}
                    style={{ ...inputStyle, flex: 1, minWidth: 100 }}
                  />

                  {/* Direction toggle */}
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {['up','down'].map(d => (
                      <button key={d} type="button" onClick={() => setPredDir(d)} style={{
                        padding: '8px 16px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                        display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                        background: predDir === d ? (d === 'up' ? 'rgba(0,200,5,0.15)' : 'rgba(255,64,64,0.15)') : 'var(--surface)',
                        color: predDir === d ? (d === 'up' ? 'var(--green)' : 'var(--red)') : 'var(--text-3)',
                      }}>
                        {d === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {d === 'up' ? 'Up' : 'Down'}
                      </button>
                    ))}
                  </div>

                  {/* Timeframe */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {TIMEFRAMES.map(tf => (
                      <button key={tf.value} type="button" onClick={() => setPredDays(tf.value)} style={{
                        padding: '8px 12px', borderRadius: 8, border: `1px solid ${predDays === tf.value ? 'rgba(99,102,241,0.5)' : 'var(--border)'}`,
                        background: predDays === tf.value ? 'rgba(99,102,241,0.12)' : 'var(--surface)',
                        color: predDays === tf.value ? 'var(--accent)' : 'var(--text-2)',
                        fontWeight: predDays === tf.value ? 700 : 400, fontSize: '0.78rem', cursor: 'pointer',
                      }}>
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confidence selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', flexShrink: 0 }}>Confidence:</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {CONFIDENCES.map(c => {
                      const active = predConfidence === c.value
                      const colors = { low: 'rgba(255,255,255,0.15)', medium: '#f59e0b', high: 'var(--green)' }
                      return (
                        <button key={c.value} type="button" onClick={() => setPredConfidence(c.value)} style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: '0.78rem', cursor: 'pointer',
                          fontWeight: active ? 700 : 400,
                          border: `1px solid ${active ? colors[c.value] : 'var(--border)'}`,
                          background: active ? `${colors[c.value]}22` : 'var(--surface)',
                          color: active ? colors[c.value] : 'var(--text-2)',
                        }}>
                          {c.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Optional note */}
                <textarea
                  value={predNote}
                  onChange={e => setPredNote(e.target.value)}
                  placeholder="Add your analysis or reasoning… (optional)"
                  disabled={!user}
                  maxLength={1000}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }}
                />

                {/* Image upload */}
                <div>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleImageSelect}
                  />
                  {!predImagePreview ? (
                    <button
                      type="button"
                      onClick={() => user && imageInputRef.current?.click()}
                      disabled={!user}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        background: 'var(--surface)', border: '1px dashed var(--border)',
                        borderRadius: 8, padding: '8px 14px', cursor: user ? 'pointer' : 'default',
                        color: 'var(--text-3)', fontSize: '0.8rem', transition: 'border-color 0.2s, color 0.2s',
                      }}
                      onMouseEnter={e => { if (user) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}
                    >
                      <ImagePlus size={14} /> Attach chart screenshot (optional)
                    </button>
                  ) : (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={predImagePreview}
                        alt="preview"
                        style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)', display: 'block' }}
                      />
                      <button
                        type="button"
                        onClick={clearImage}
                        style={{
                          position: 'absolute', top: 6, right: 6,
                          background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#fff',
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {predError && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--red)', background: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.25)', borderRadius: 7, padding: '7px 10px' }}>
                    {predError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!user || predSubmitting || !predTicker.trim()}
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, opacity: (!user || predSubmitting || !predTicker.trim()) ? 0.5 : 1 }}
                >
                  {predSubmitting ? 'Submitting…' : `Predict ${predTicker || 'ticker'} goes ${predDir} in ${predDays}d`}
                </button>

                {!user && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                    <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link> to submit predictions.
                  </p>
                )}
              </form>
            </div>

            {/* Confidence filter — commercial users only */}
            {user?.subscription_tier === 'commercial' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', flexShrink: 0 }}>Filter by confidence:</span>
                {[{ label: 'All', value: null }, ...CONFIDENCES].map(c => {
                  const active = confFilter === c.value
                  const colors = { null: 'var(--accent)', low: 'rgba(200,200,200,0.8)', medium: '#f59e0b', high: 'var(--green)' }
                  const col = colors[c.value] ?? 'var(--accent)'
                  return (
                    <button key={String(c.value)} type="button" onClick={() => handleConfFilter(c.value)} style={{
                      padding: '5px 14px', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer',
                      fontWeight: active ? 700 : 400,
                      border: `1px solid ${active ? col : 'var(--border)'}`,
                      background: active ? `${col}22` : 'var(--surface)',
                      color: active ? col : 'var(--text-2)',
                      transition: 'all 0.15s',
                    }}>
                      {c.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Predictions feed */}
            {predsLoading && preds.length === 0
              ? [0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 14 }} />)
              : preds.length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem' }}>No predictions yet.</div>
                : preds.map(p => <PredictionCard key={p.id} pred={p} />)
            }

            {preds.length < predsTotal && (
              <button
                onClick={() => loadPreds(predOffset + PAGE)}
                className="btn-ghost"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <ChevronDown size={14} /> Load more
              </button>
            )}
          </div>

          {/* Right: Leaderboard */}
          <div className="glass-card" style={{ padding: '1.25rem', position: 'sticky', top: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <Trophy size={16} style={{ color: '#f59e0b' }} />
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)' }}>
                Top Predictors
              </h3>
            </div>

            {leaderboard.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', textAlign: 'center', padding: '1rem 0' }}>
                Min. 3 resolved predictions to rank.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leaderboard.map((entry, i) => (
                  <div key={entry.username} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: i === 0 ? '#f59e0b' : i === 1 ? 'rgba(255,255,255,0.2)' : i === 2 ? '#cd7f32' : 'var(--surface)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 800, color: i < 3 ? '#000' : 'var(--text-3)',
                    }}>
                      {i + 1}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.username}
                        </span>
                        {TIER_COLORS[entry.subscription_tier] && (
                          <Zap size={10} style={{ color: TIER_COLORS[entry.subscription_tier], flexShrink: 0 }} />
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                        {entry.correct}/{entry.total} correct
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.82rem', fontWeight: 800,
                      color: entry.accuracy >= 60 ? 'var(--green)' : entry.accuracy >= 40 ? 'var(--text-2)' : 'var(--red)',
                    }}>
                      {entry.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
