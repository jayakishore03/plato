import { useState, useEffect } from 'react'
import { MessageSquare, Heart, Trophy, User as UserIcon, LogIn, Send, X, CornerDownRight, Trash2, Eye, EyeOff } from 'lucide-react'

const BASE_URL = 'http://127.0.0.1:8000/api'

// --- API Helpers ---
const fetcher = async (url, options = {}) => {
  const res = await fetch(`${BASE_URL}${url}`, options)
  if (!res.ok) throw new Error('API Error')
  if (res.status === 204) return null
  return res.json()
}

// --- Components ---

function Button({ children, onClick, variant = 'primary', className = '', ...props }) {
  const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 active:scale-95"
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-500 text-white hover:bg-red-600"
  }
  return <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`} {...props}>{children}</button>
}

function CommentNode({ comment, depth = 0, onReply, onLike, currentUser }) {
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [likes, setLikes] = useState(comment.likes_count)
  const [isLiked, setIsLiked] = useState(comment.is_liked)

  const handleLike = async () => {
    // Optimistic update
    const prevLikes = likes
    const prevLiked = isLiked
    setLikes(prevLiked ? prevLikes - 1 : prevLikes + 1)
    setIsLiked(!prevLiked)

    try {
      if (!currentUser) throw new Error("Login required")
      const headers = { 'Authorization': currentUser.authHeader }
      await fetcher(`/comments/${comment.id}/like/`, { method: 'POST', headers })
    } catch (e) {
      setLikes(prevLikes)
      setIsLiked(prevLiked)
      alert("Action failed or login required")
    }
  }

  const handleSubmitReply = () => {
    onReply(comment.id, replyContent)
    setIsReplying(false)
    setReplyContent('')
  }

  return (
    <div className={`flex flex-col gap-2 ${depth > 0 ? 'ml-4 pl-4 border-l-2 border-slate-100' : ''}`}>
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm text-slate-700">{comment.author.username}</span>
          <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>
        </div>
        <p className="text-slate-700 text-sm">{comment.content}</p>

        <div className="flex items-center gap-4 mt-2">
          <button onClick={handleLike} className={`flex items-center gap-1 text-xs font-medium transition-colors ${isLiked ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500'}`}>
            <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
            {likes}
          </button>
          <button onClick={() => setIsReplying(!isReplying)} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600">
            <MessageSquare size={14} />
            Reply
          </button>
        </div>
      </div>

      {isReplying && (
        <div className="flex gap-2 items-start mt-1">
          <input
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <Button variant="primary" onClick={handleSubmitReply} className="px-3 py-1 text-xs">Send</Button>
        </div>
      )}

      {comment.replies && comment.replies.map(reply => (
        <CommentNode key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} onLike={onLike} currentUser={currentUser} onAuthAction={onAuthAction} />
      ))}
    </div>
  )
}

function PostDetail({ post: initialPost, onClose, currentUser, onAuthAction }) {
  const [post, setPost] = useState(initialPost)
  const [comments, setComments] = useState([]) // Root comments
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    loadData()
  }, [initialPost.id])

  const loadData = async () => {
    setLoading(true)
    try {
      // The detail endpoint returns the post WITH 'comments' (the tree)
      const headers = currentUser ? { 'Authorization': currentUser.authHeader } : {}
      const data = await fetcher(`/posts/${initialPost.id}/`, { headers })
      setPost(data)
      setComments(data.comments || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handlePostLike = async () => {
    // Wrapper checking auth
    if (!currentUser) {
      onAuthAction(() => handlePostLikeAction())
      return
    }
    handlePostLikeAction()
  }

  const handlePostLikeAction = async () => {
    const prevLikes = post.likes_count
    const prevLiked = post.is_liked
    setPost(p => ({ ...p, likes_count: prevLiked ? prevLikes - 1 : prevLikes + 1, is_liked: !prevLiked }))

    try {
      if (!currentUser) throw new Error("Login required")
      await fetcher(`/posts/${post.id}/like/`, {
        method: 'POST',
        headers: { 'Authorization': currentUser.authHeader }
      })
    } catch (e) {
      alert("Like failed")
      loadData() // Revert
    }
  }

  const handleReplyRequest = (parentId, content) => {
    if (!currentUser) {
      onAuthAction(() => handleReplyAction(parentId, content))
      return
    }
    handleReplyAction(parentId, content)
  }

  const handleReplyAction = async (parentId, content) => {
    try {
      await fetcher(`/posts/${post.id}/comments/`, {
        method: 'POST',
        headers: {
          'Authorization': currentUser.authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, parent: parentId })
      })
      loadData() // Refresh tree
    } catch (e) {
      alert("Failed to comment")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <h2 className="font-bold text-lg text-slate-800">Thread</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-4 space-y-6 flex-1">
          {/* Main Post Context */}
          <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                  {post.author.username[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{post.author.username}</h3>
                  <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
            <p className="text-slate-800 text-lg leading-relaxed mb-4">{post.content}</p>
            <div className="flex gap-4">
              <button onClick={handlePostLike} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${post.is_liked ? 'bg-pink-100 text-pink-600' : 'bg-white border text-slate-600 hover:border-pink-200 hover:text-pink-500'}`}>
                <Heart size={16} fill={post.is_liked ? "currentColor" : "none"} />
                {post.likes_count}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <MessageSquare size={18} /> Comments
            </h3>

            {/* New Comment Input - ALWAYS SHOW NOW, BUT TRIGGER AUTH ON CLICK */}
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Add to the discussion..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none h-20"
                />
              </div>
              <Button onClick={() => { handleReplyRequest(null, newComment); setNewComment('') }} className="h-10">Post</Button>
            </div>

            {loading ? <div className="text-center py-10 text-slate-400">Loading discussion...</div> : (
              <div className="space-y-4">
                {comments.length === 0 && <p className="text-slate-400 text-center text-sm">No comments yet. Be the first!</p>}
                {comments.map(c => (
                  <CommentNode key={c.id} comment={c} onReply={handleReplyRequest} currentUser={currentUser} onAuthAction={onAuthAction} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FeedItem({ post, onOpen, currentUser, onDelete }) {
  const [likes, setLikes] = useState(post.likes_count)
  const [isLiked, setIsLiked] = useState(post.is_liked)

  const handleLike = async (e) => {
    e.stopPropagation()
    const prevLikes = likes
    const prevLiked = isLiked
    setLikes(prevLiked ? prevLikes - 1 : prevLikes + 1)
    setIsLiked(!prevLiked)

    try {
      if (!currentUser) throw new Error("Login required")
      const headers = { 'Authorization': currentUser.authHeader }
      await fetcher(`/posts/${post.id}/like/`, { method: 'POST', headers })
    } catch (e) {
      setLikes(prevLikes)
      setIsLiked(prevLiked)
      alert("Login required")
    }
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this post?")) return
    onDelete(post.id)
  }

  const canDelete = currentUser && (currentUser.username === post.author.username || currentUser.is_staff)

  return (
    <div onClick={onOpen} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            {post.author.username[0].toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{post.author.username}</h3>
            <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        {canDelete && (
          <button onClick={handleDelete} className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <p className="text-slate-700 leading-relaxed mb-4">{post.content}</p>
      <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
        <button onClick={handleLike} className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? 'text-pink-500' : 'text-slate-500 hover:text-pink-500'}`}>
          <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
          {likes}
        </button>
        <button className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
          <MessageSquare size={18} />
          Comment
        </button>
      </div>
    </div>
  )
}

function Leaderboard({ }) {
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetcher('/leaderboard/').then(setUsers).catch(console.error)
  }, [])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <h3 className="font-bold flex items-center gap-2"><Trophy size={18} /> Daily Top 5</h3>
        <p className="text-xs text-indigo-100 mt-1">Karma earned in last 24h</p>
      </div>
      <div className="divide-y divide-slate-50">
        {users.length === 0 ? <div className="p-4 text-sm text-slate-400">No activity yet.</div> :
          users.map((u, i) => (
            <div key={u.username} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                  {i + 1}
                </span>
                <span className="font-medium text-slate-700">{u.username}</span>
              </div>
              <span className="font-bold text-indigo-600 text-sm">{u.karma} pts</span>
            </div>
          ))}
      </div>
    </div>
  )
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null) // { username, password, authHeader }
  const [posts, setPosts] = useState([])
  const [activePost, setActivePost] = useState(null)

  // Login Inputs
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // New Post
  const [newPostContent, setNewPostContent] = useState('')

  // Auth Modal for guest login
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // { type: 'like'|'comment', data: ... }
  const [guestUsername, setGuestUsername] = useState('')

  useEffect(() => {
    // Basic auth restore logic could go here but we'll keep it simple
    loadPosts()
  }, [currentUser]) // Refresh posts when user changes to update like status

  const loadPosts = async () => {
    const headers = currentUser ? { 'Authorization': currentUser.authHeader } : {}
    try {
      const data = await fetcher('/posts/', { headers })
      setPosts(data)
    } catch (e) {
      console.error("Failed to load posts", e)
    }
  }

  const handleAuthAction = (action) => {
    if (currentUser) {
      action()
    } else {
      setPendingAction(() => action) // Store function reference
      setShowAuthModal(true)
    }
  }

  const handleGuestLogin = async (e) => {
    e.preventDefault()
    if (!guestUsername.trim()) return

    try {
      const res = await fetcher('/guest-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: guestUsername })
      })

      if (!res.ok) throw new Error('Auth failed')

      const data = await res.json()
      setCurrentUser({
        username: data.username,
        is_staff: data.is_staff,
        authHeader: data.auth_token
      })
      setShowAuthModal(false)

      // Execute pending Action
      if (pendingAction) {
        // Tiny delay to ensure state updates propagate if needed, though pendingAction is a closure typically.
        // Actually, if pendingAction relies on 'currentUser' from closure, it might be stale.
        // But our Like/Reply handlers in FeedItem/CommentNode need to re-check user or take tokens.
        // Simplest way: The pendingAction should probably be a logical instructions.
        // BUT, simpler: Just having the user logged in allows them to click again.
        // Automation:
        setTimeout(() => {
          pendingAction()
          setPendingAction(null)
        }, 100)
      }
    } catch (e) {
      alert("Please choose a different name (or this one is protected).")
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const authHeader = 'Basic ' + btoa(username + ':' + password)

    try {
      // Verify creds and get user info
      const headers = { 'Authorization': authHeader }
      const userDetails = await fetcher('/me/', { headers })

      setCurrentUser({
        username: userDetails.username,
        is_staff: userDetails.is_staff,
        authHeader
      })
      setShowLogin(false)
    } catch (e) {
      alert("Invalid Credentials")
    }
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return
    try {
      const headers = {
        'Authorization': currentUser.authHeader,
        'Content-Type': 'application/json'
      }
      await fetcher('/posts/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: newPostContent })
      })
      setNewPostContent('')
      loadPosts()
    } catch (e) {
      alert("Failed to post")
    }
  }

  const handleDeletePost = async (postId) => {
    try {
      const headers = { 'Authorization': currentUser.authHeader }
      await fetcher(`/posts/${postId}/`, { method: 'DELETE', headers })
      setPosts(posts.filter(p => p.id !== postId))
    } catch (e) {
      alert("Failed to delete post")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">P</div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Playto<span className="text-indigo-600">Community</span></span>
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Hi, {currentUser.username} {currentUser.is_staff && '(Admin)'}</span>
                <Button variant="secondary" onClick={() => setCurrentUser(null)} className="py-1 px-3 text-xs">Logout</Button>
              </div>
            ) : (
              <Button onClick={() => setShowLogin(true)} className="py-1.5 text-sm">Log In</Button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Feed Column */}
        <div className="md:col-span-2 space-y-6">
          {currentUser && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold">
                {currentUser.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <textarea
                  rows={2}
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-transparent text-slate-700 placeholder:text-slate-400 focus:outline-none resize-none"
                />
                <div className="flex justify-end mt-2 pt-2 border-t border-slate-50">
                  <Button onClick={() => handleAuthAction(handleCreatePost)} disabled={!newPostContent} className="py-1.5 px-4 text-xs">Post Update</Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {posts.map(post => (
              <FeedItem
                key={post.id}
                post={post}
                onOpen={() => setActivePost(post)}
                currentUser={currentUser}
                onDelete={handleDeletePost}
                onAuthAction={handleAuthAction}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Leaderboard />

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h4 className="font-bold text-slate-800 mb-2">About</h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Welcome to the prototype. Like posts to give 5 Karma, comments for 1 Karma. The leaderboard updates in real-time based on activity in the last 24 hours.
            </p>
          </div>
        </div>

      </main>

      {/* Auth Modal (Guest) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in-95 relative">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserIcon size={24} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Wait, who are you?</h2>
              <p className="text-slate-500 text-sm mt-1">Enter a name to join the conversation.</p>
            </div>

            <form onSubmit={handleGuestLogin} className="space-y-4">
              <div>
                <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-center font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="e.g. Maverick"
                  value={guestUsername}
                  onChange={e => setGuestUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <Button className="w-full justify-center py-3 text-base">Continue</Button>
              <div className="text-center">
                <button type="button" onClick={() => { setShowAuthModal(false); setShowLogin(true); }} className="text-xs text-indigo-600 hover:underline font-medium">
                  I have a password login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in-95">
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Admin Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Username</label>
                <input className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" value={username} onChange={e => setUsername(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button className="w-full justify-center py-2.5 mt-2">Sign In</Button>
              <button type="button" onClick={() => setShowLogin(false)} className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-4">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {activePost && (
        <PostDetail post={activePost} onClose={() => { setActivePost(null); loadPosts() }} currentUser={currentUser} onAuthAction={handleAuthAction} />
      )}
    </div>
  )
}

