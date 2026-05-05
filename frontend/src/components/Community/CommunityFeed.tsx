/**
 * Enhanced Community Feed Component
 * 
 * Full interactive community with posts, replies, likes, and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../../i18n';
import { API_BASE } from '../../config/api';

interface Reply {
    id: string;
    content: string;
    createdAt?: string;
    created_at?: string;
}

interface CommunityPost {
    id: string;
    content: string;
    likes: number;
    createdAt?: string;
    created_at?: string;
    author?: string;  // Author name for private messaging
    category: 'gratitude' | 'encouragement' | 'achievement';
    replies: Reply[];
}

interface CommunityFeedProps {
    maxPosts?: number;
    fullPage?: boolean;
    onStartMessage?: (userName: string) => void;  // Pass user name for targeting
    currentUser?: string;
}

const CATEGORY_INFO = {
    all: { label: '全部', icon: '🌟', color: 'gray' },
    gratitude: { label: '感恩', icon: '🙏', color: 'pink' },
    encouragement: { label: '鼓励', icon: '💪', color: 'blue' },
    achievement: { label: '成就', icon: '🎉', color: 'amber' },
};

// Format time ago
const timeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
    return date.toLocaleDateString('zh-CN');
};

export const CommunityFeed = ({ maxPosts = 10, fullPage = false, onStartMessage, currentUser }: CommunityFeedProps) => {
    const { t } = useI18n();
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompose, setShowCompose] = useState(false);
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState<'gratitude' | 'encouragement' | 'achievement'>('encouragement');
    const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState('all');
    const [expandedPost, setExpandedPost] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Load posts from API
    const loadPosts = useCallback(async () => {
        console.log('[CommunityFeed] Loading posts...');
        setLoading(true);
        try {
            const url = filter === 'all'
                ? `${API_BASE}/community/posts?limit=${maxPosts}`
                : `${API_BASE}/community/posts?limit=${maxPosts}&category=${filter}`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                console.log('[CommunityFeed] Posts loaded:', data.posts?.length, 'posts');
                console.log('[CommunityFeed] First post replies:', data.posts?.[0]?.replies);
                setPosts(data.posts || []);
            } else {
                console.error('[CommunityFeed] Failed to load posts, status:', response.status);
            }
        } catch (err) {
            console.error('[CommunityFeed] Failed to load posts:', err);
        } finally {
            setLoading(false);
        }
    }, [maxPosts, filter]);

    useEffect(() => {
        loadPosts();

        // Load liked posts from localStorage
        const savedLikes = localStorage.getItem('community_likes');
        if (savedLikes) {
            setLikedPosts(new Set(JSON.parse(savedLikes)));
        }
    }, [loadPosts]);

    const handleLike = useCallback(async (postId: string) => {
        if (likedPosts.has(postId)) return;

        try {
            const response = await fetch(`${API_BASE}/community/like/${postId}`, {
                method: 'POST',
            });
            if (response.ok) {
                const data = await response.json();
                setPosts(prev => prev.map(post =>
                    post.id === postId ? { ...post, likes: data.likes } : post
                ));
                const newLiked = new Set(likedPosts).add(postId);
                setLikedPosts(newLiked);
                localStorage.setItem('community_likes', JSON.stringify([...newLiked]));
            }
        } catch (err) {
            console.error('Like failed:', err);
        }
    }, [likedPosts]);

    const handleSubmitPost = useCallback(async () => {
        if (!newContent.trim() || submitting) return;

        setSubmitting(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/community/post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newContent.trim(),
                    category: newCategory,
                    author: currentUser || t('community.anonymous')
                }),
            });

            const data = await response.json();

            if (data.success) {
                setNewContent('');
                setShowCompose(false);
                loadPosts(); // Refresh posts
            } else {
                setError(data.message || '发布失败');
            }
        } catch (err) {
            setError('网络错误，请重试');
        } finally {
            setSubmitting(false);
        }
    }, [newContent, newCategory, submitting, loadPosts, currentUser, t]);

    const handleSubmitReply = useCallback(async (postId: string) => {
        const content = replyContent[postId];
        if (!content?.trim()) return;

        try {
            console.log('[CommunityFeed] Submitting reply to post:', postId);
            const response = await fetch(`${API_BASE}/community/reply/${postId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content.trim() }),
            });

            const data = await response.json();
            console.log('[CommunityFeed] Reply response:', data);

            if (data.success) {
                setReplyContent(prev => ({ ...prev, [postId]: '' }));
                console.log('[CommunityFeed] Reply successful, refreshing posts...');
                await loadPosts(); // Ensure posts are refreshed
                console.log('[CommunityFeed] Posts refreshed');
            } else {
                console.error('[CommunityFeed] Reply failed:', data.message);
                alert(data.message || '回复失败');
            }
        } catch (err) {
            console.error('[CommunityFeed] Reply error:', err);
            alert('网络错误，请重试');
        }
    }, [replyContent, loadPosts]);

    const containerClass = fullPage
        ? "max-w-2xl mx-auto"
        : "bg-white rounded-2xl shadow-lg border border-warm-100 overflow-hidden";

    return (
        <div className={containerClass}>
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-5 text-white">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <span className="text-3xl">💜</span>
                        <div>
                            <h3 className="font-bold text-xl">{t('community.title')}</h3>
                            <p className="text-white/80 text-sm">{t('community.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCompose(!showCompose)}
                        className="px-4 py-2 bg-white text-purple-600 rounded-xl font-medium hover:bg-white/90 transition-colors"
                    >
                        {t('community.publishBtn')}
                    </button>
                </div>

                {/* Category Filter */}
                <div className="flex space-x-2 overflow-x-auto pb-1">
                    {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${filter === key
                                ? 'bg-white text-purple-600'
                                : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            {info.icon} {info.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Compose Area */}
            {showCompose && (
                <div className="p-4 border-b border-warm-100 bg-gradient-to-r from-purple-50 to-pink-50">
                    <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder={t('community.placeholder')}
                        className="w-full p-4 border border-warm-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                        rows={3}
                        maxLength={500}
                    />
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex space-x-2">
                            {(['gratitude', 'encouragement', 'achievement'] as const).map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setNewCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${newCategory === cat
                                        ? 'bg-purple-500 text-white shadow-md'
                                        : 'bg-white text-warm-600 border border-warm-200 hover:border-purple-300'
                                        }`}
                                >
                                    {CATEGORY_INFO[cat].icon} {CATEGORY_INFO[cat].label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-xs text-warm-400">{newContent.length}/500</span>
                            <button
                                onClick={handleSubmitPost}
                                disabled={!newContent.trim() || submitting}
                                className="px-5 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50 hover:shadow-lg transition-all"
                            >
                                {submitting ? t('community.publishing') : t('community.publish')}
                            </button>
                        </div>
                    </div>
                    {error && (
                        <p className="text-red-500 text-sm mt-2">{error}</p>
                    )}
                </div>
            )}

            {/* Posts List */}
            <div className="divide-y divide-warm-100">
                {loading ? (
                    <div className="p-8 text-center text-warm-400">
                        <span className="animate-spin inline-block">⏳</span> {t('community.loading')}
                    </div>
                ) : posts.length === 0 ? (
                    <div className="p-8 text-center text-warm-400">
                        <span className="text-4xl mb-2 block">🌱</span>
                        {t('community.empty')}
                    </div>
                ) : (
                    posts.map(post => {
                        const catInfo = CATEGORY_INFO[post.category] || CATEGORY_INFO.encouragement;
                        const isLiked = likedPosts.has(post.id);
                        const isExpanded = expandedPost === post.id;

                        return (
                            <div key={post.id} className="p-4 hover:bg-warm-50/50 transition-colors">
                                {/* Post Header */}
                                <div className="flex items-start space-x-3">
                                    <div className={`w-10 h-10 bg-gradient-to-br from-${catInfo.color}-100 to-${catInfo.color}-200 rounded-full flex items-center justify-center text-lg`}>
                                        {catInfo.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="font-medium text-warm-900 text-sm">
                                                {post.author || t('community.anonymous')}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full bg-${catInfo.color}-100 text-${catInfo.color}-600`}>
                                                {catInfo.label}
                                            </span>
                                            <span className="text-xs text-warm-400">{timeAgo(post.created_at || post.createdAt || new Date().toISOString())}</span>
                                        </div>
                                        <p className="text-warm-700 whitespace-pre-wrap break-words">{post.content}</p>

                                        {/* Actions */}
                                        <div className="flex items-center space-x-6 mt-3">
                                            <button
                                                onClick={() => handleLike(post.id)}
                                                disabled={isLiked}
                                                className={`flex items-center space-x-1 text-sm transition-all ${isLiked ? 'text-pink-500' : 'text-warm-400 hover:text-pink-500'
                                                    }`}
                                            >
                                                <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
                                                <span>{post.likes}</span>
                                            </button>
                                            <button
                                                onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                                                className="flex items-center space-x-1 text-sm text-warm-400 hover:text-purple-500 transition-colors"
                                            >
                                                <span>💬</span>
                                                <span>{post.replies?.length || 0} {t('community.replies')}</span>
                                            </button>
                                            <button
                                                className="flex items-center space-x-1 text-sm text-warm-400 hover:text-blue-500 transition-colors"
                                                title={t('community.message')}
                                                onClick={() => onStartMessage?.(post.author || '匿名用户')}
                                            >
                                                <span>✉️</span>
                                                <span>{t('community.message')}</span>
                                            </button>
                                        </div>


                                        {/* Replies Section */}
                                        {isExpanded && (
                                            <div className="mt-4 pl-4 border-l-2 border-purple-100">
                                                {/* Existing Replies */}
                                                {post.replies && post.replies.length > 0 && (
                                                    <div className="space-y-3 mb-4">
                                                        {post.replies.map(reply => (
                                                            <div key={reply.id} className="bg-warm-50 rounded-xl p-3">
                                                                <p className="text-warm-700 text-sm">{reply.content}</p>
                                                                <span className="text-xs text-warm-400">{timeAgo(reply.created_at || reply.createdAt || new Date().toISOString())}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reply Input */}
                                                <div className="flex space-x-2">
                                                    <input
                                                        type="text"
                                                        value={replyContent[post.id] || ''}
                                                        onChange={(e) => setReplyContent(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                        placeholder={t('community.replyPlaceholder')}
                                                        className="flex-1 p-2 border border-warm-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                        maxLength={200}
                                                    />
                                                    <button
                                                        onClick={() => handleSubmitReply(post.id)}
                                                        disabled={!replyContent[post.id]?.trim()}
                                                        className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                                                    >
                                                        {t('community.replyBtn')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 text-center">
                <p className="text-sm text-warm-500">
                    {t('community.footer')}
                </p>
            </div>
        </div>
    );
};

export default CommunityFeed;
