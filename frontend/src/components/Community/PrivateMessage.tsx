/**
 * PrivateMessage Component
 * 
 * Real-time private messaging feature connected to Supabase
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../../config/api';

interface Message {
    id: string;
    from: string; // 'me' or 'them' (computed on frontend)
    fromUser: string; // raw username
    fromAvatar: string;
    content: string;
    timestamp: Date;
    read: boolean;
}

interface ApiMessage {
    id: string;
    from_user: string;
    to_user: string;
    content: string;
    created_at: string;
    read: boolean;
}

interface Conversation {
    userId: string; // We use nickname as ID since auth is nickname-based
    nickname: string;
    avatar: string;
    lastMessage: string;
    lastTime: Date;
    unread: number;
}

interface PrivateMessageProps {
    onClose?: () => void;
    preSelectedUser?: string | null;
    currentUser: string;
}

export const PrivateMessage = ({ onClose, preSelectedUser, currentUser }: PrivateMessageProps) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [allMessages, setAllMessages] = useState<ApiMessage[]>([]); // Store raw API messages
    const [messages, setMessages] = useState<Message[]>([]); // Messages for current view
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Fetch messages from backend
    const loadMessages = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/community/messages/${currentUser}`);
            const data = await response.json();

            if (data.success && Array.isArray(data.messages)) {
                setAllMessages(data.messages);
                processConversations(data.messages);
            }
        } catch (err) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    // Process raw messages into conversation list
    const processConversations = (paramsMessages: ApiMessage[]) => {
        const groups = new Map<string, Conversation>();

        paramsMessages.forEach(msg => {
            const isMe = msg.from_user === currentUser;
            const otherUser = isMe ? msg.to_user : msg.from_user;

            if (!groups.has(otherUser)) {
                groups.set(otherUser, {
                    userId: otherUser,
                    nickname: otherUser,
                    avatar: '👤', // Default avatar
                    lastMessage: '',
                    lastTime: new Date(0),
                    unread: 0
                });
            }

            const conv = groups.get(otherUser)!;
            const msgTime = new Date(msg.created_at);

            // Update last message info
            if (msgTime > conv.lastTime) {
                conv.lastTime = msgTime;
                conv.lastMessage = msg.content;
            }

            // Count unread
            if (!msg.read && msg.to_user === currentUser) {
                conv.unread++;
            }
        });

        // Sort by time desc
        const sorted = Array.from(groups.values()).sort((a, b) => b.lastTime.getTime() - a.lastTime.getTime());
        setConversations(sorted);
    };

    // Initial load
    useEffect(() => {
        loadMessages();
        const interval = setInterval(loadMessages, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [loadMessages]);

    // Filter messages for selected conversation
    useEffect(() => {
        if (selectedConversation) {
            const filtered = allMessages
                .filter(m => m.from_user === selectedConversation.nickname || m.to_user === selectedConversation.nickname)
                .map(m => ({
                    id: m.id,
                    from: m.from_user === currentUser ? 'me' : 'them',
                    fromUser: m.from_user,
                    fromAvatar: m.from_user === currentUser ? '😊' : '👤',
                    content: m.content,
                    timestamp: new Date(m.created_at),
                    read: m.read
                }))
                .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

            setMessages(filtered);
        } else {
            setMessages([]);
        }
    }, [selectedConversation, allMessages, currentUser]);

    // Handle preSelectedUser (Targeting)
    useEffect(() => {
        if (preSelectedUser && !loading) {
            const existing = conversations.find(c => c.nickname === preSelectedUser);
            if (existing) {
                setSelectedConversation(existing);
            } else if (preSelectedUser !== currentUser) {
                // Create temporary conversation object
                const tempConv: Conversation = {
                    userId: preSelectedUser,
                    nickname: preSelectedUser,
                    avatar: '👤',
                    lastMessage: '开始新对话...',
                    lastTime: new Date(),
                    unread: 0
                };
                // Only add if not already in list (prevent dupe visuals)
                setConversations(prev => {
                    if (prev.find(p => p.nickname === preSelectedUser)) return prev;
                    return [tempConv, ...prev];
                });
                setSelectedConversation(tempConv);
            }
        }
    }, [preSelectedUser, loading, conversations.length]); // Dependencies carefully chosen

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedConversation) return;

        const content = newMessage.trim();
        const targetUser = selectedConversation.nickname;

        // Optimistic update
        const tempMsg: Message = {
            id: Date.now().toString(),
            from: 'me',
            fromUser: currentUser,
            fromAvatar: '😊',
            content: content,
            timestamp: new Date(),
            read: true
        };
        setMessages(prev => [...prev, tempMsg]);
        setNewMessage('');

        try {
            const res = await fetch(`${API_BASE}/community/message/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from_user: currentUser,
                    to_user: targetUser,
                    content: content
                })
            });

            const data = await res.json();
            if (data.success) {
                // Reload to get server ID and exact timestamp, and update conversation list order
                loadMessages();
            } else {
                alert('发送失败: ' + (data.message || '未知错误'));
            }
        } catch (err) {
            console.error('Send error:', err);
            alert('网络错误，消息发送失败');
        }
    };

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
        return `${Math.floor(diff / 86400000)} 天前`;
    };

    const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden h-[600px] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-rose-500 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">💌</span>
                    <div>
                        <h2 className="font-bold text-lg">私信 ({currentUser})</h2>
                        {totalUnread > 0 && (
                            <span className="text-xs text-white/80">{totalUnread} 条未读消息</span>
                        )}
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg">✕</button>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Conversation List */}
                <div className="w-1/3 border-r border-warm-200 dark:border-gray-700 overflow-y-auto">
                    {conversations.length === 0 && (
                        <div className="p-4 text-center text-gray-400 text-sm">暂无消息</div>
                    )}
                    {conversations.map((conv) => (
                        <div
                            key={conv.userId}
                            onClick={() => setSelectedConversation(conv)}
                            className={`p - 4 border - b border - warm - 100 dark: border - gray - 700 cursor - pointer hover: bg - warm - 50 dark: hover: bg - gray - 700 transition - colors ${selectedConversation?.userId === conv.userId ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                                } `}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full flex items-center justify-center text-xl relative">
                                    {conv.avatar}
                                    {conv.unread > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                            {conv.unread}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-medium text-warm-800 dark:text-white truncate">{conv.nickname}</h3>
                                        <span className="text-xs text-warm-400 dark:text-gray-500">{formatTime(conv.lastTime)}</span>
                                    </div>
                                    <p className="text-sm text-warm-500 dark:text-gray-400 truncate">{conv.lastMessage}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Message Area */}
                <div className="flex-1 flex flex-col">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-warm-200 dark:border-gray-700 flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-accent-100 rounded-full flex items-center justify-center text-xl">
                                    {selectedConversation.avatar}
                                </div>
                                <h3 className="font-semibold text-warm-800 dark:text-white">{selectedConversation.nickname}</h3>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg, idx) => (
                                    <div
                                        key={msg.id || idx}
                                        className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'} `}
                                    >
                                        <div className={`max - w - [70 %] ${msg.from === 'me' ? 'order-2' : 'order-1'} `}>
                                            <div
                                                className={`px - 4 py - 2 rounded - 2xl ${msg.from === 'me'
                                                    ? 'bg-primary-500 text-white rounded-br-md'
                                                    : 'bg-warm-100 dark:bg-gray-700 text-warm-800 dark:text-white rounded-bl-md'
                                                    } `}
                                            >
                                                {msg.content}
                                            </div>
                                            <div className={`text - xs text - warm - 400 mt - 1 ${msg.from === 'me' ? 'text-right' : ''} `}>
                                                {formatTime(msg.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Input */}
                            <div className="p-4 border-t border-warm-200 dark:border-gray-700">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="输入消息..."
                                        className="flex-1 px-4 py-2 rounded-full border border-warm-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim()}
                                        className="px-6 py-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors disabled:opacity-50"
                                    >
                                        发送
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-warm-400 dark:text-gray-500">
                            <div className="text-center">
                                <span className="text-6xl">💬</span>
                                <p className="mt-4">选择一个对话开始聊天</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PrivateMessage;
