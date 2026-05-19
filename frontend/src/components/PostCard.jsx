import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Trash2, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { api } from '../api/client'
import useStore from '../store/useStore'

const TIER_COLORS = {
  intermediate: 'var(--accent)',
  commercial: '#f59e0b',
}

export default function PostCard({ post, onDelete }) {
  const { user } = useStore()
  const [likes, setLikes] = useState(post.likes_count)
  const [liked, setLiked] = useState(post.liked_by_me)
  const [liking, setLiking] = useState(false)

  const handleLike = async (e) => {
    e.preventDefault()
    if (!user || liking) return
    setLiking(true)
    try {
      const { data } = await api.likePost(post.id)
      setLikes(data.likes_count)
      setLiked(data.liked)
    } catch {}
    finally { setLiking(false) }
  }

  const handleDelete = async (e) => {
    e.preventDefault()
    if (!confirm('Delete this post?')) return
    try {
      await api.deletePost(post.id)
      onDelete?.(post.id)
    } catch {}
  }

  const tierColor = TIER_COLORS[post.author.subscription_tier]
  const timeAgo = (() => {
    try { return formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) }
    catch { return '' }
  })()

  return (
    <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #6366f1, #4f52d9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 700, color: '#fff',
        }}>
          {post.author.username[0].toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-1)' }}>
              {post.author.username}
            </span>
            {tierColor && (
              <Zap size={11} style={{ color: tierColor, flexShrink: 0 }} />
            )}
            {post.ticker && (
              <Link
                to={`/stock/${post.ticker}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  fontSize: '0.7rem', fontWeight: 700,
                  background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                  padding: '1px 7px', borderRadius: 5, textDecoration: 'none',
                }}
              >
                {post.ticker}
              </Link>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{timeAgo}</div>
        </div>
      </div>

      {/* Content */}
      <p style={{ fontSize: '0.9rem', color: 'var(--text-1)', lineHeight: 1.55, marginBottom: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {post.content}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={handleLike}
          disabled={!user || liking}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: user ? 'pointer' : 'default',
            color: liked ? 'var(--red)' : 'var(--text-3)',
            fontSize: '0.8rem', padding: '2px 0', fontWeight: liked ? 600 : 400,
            transition: 'color 0.15s',
          }}
        >
          <Heart size={14} fill={liked ? 'var(--red)' : 'none'} />
          {likes > 0 ? likes : ''}
        </button>

        {user?.id === post.author.id && (
          <button
            onClick={handleDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-3)', fontSize: '0.75rem', padding: '2px 0',
              marginLeft: 'auto', transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <Trash2 size={12} /> Delete
          </button>
        )}
      </div>
    </div>
  )
}
