/**
 * Authentication Components
 * 
 * Login and Registration UI components
 */

import { useState, useCallback, useEffect } from 'react';
import { API_BASE } from '../../config/api';

interface AuthProps {
    onLoginSuccess?: (user: UserInfo) => void;
    onClose?: () => void;
}

export interface UserInfo {
    id: string;
    username: string;
    nickname: string;
    avatar?: string;
    createdAt: Date;
}

type AuthMode = 'login' | 'register';

export const AuthModal = ({ onLoginSuccess, onClose }: AuthProps) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // WeChat binding state
    const [showBindModal, setShowBindModal] = useState(false);
    const [weChatInfo, setWeChatInfo] = useState<{ openid: string; nickname: string; avatar: string } | null>(null);
    const [bindUsername, setBindUsername] = useState('');
    const [bindPassword, setBindPassword] = useState('');

    // Check for WeChat binding info from OAuth callback
    useEffect(() => {
        const bindInfo = sessionStorage.getItem('wechat_bind_info');
        if (bindInfo) {
            try {
                const info = JSON.parse(bindInfo);
                setWeChatInfo(info);
                setShowBindModal(true);
                sessionStorage.removeItem('wechat_bind_info');
            } catch (e) {
                console.error('Failed to parse WeChat bind info:', e);
            }
        }
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (mode === 'register') {
                // 验证密码
                if (password !== confirmPassword) {
                    setError('两次输入的密码不一致');
                    setIsLoading(false);
                    return;
                }
                if (password.length < 6) {
                    setError('密码至少需要6位');
                    setIsLoading(false);
                    return;
                }

                // 注册请求
                // 注册请求
                const response = await fetch(`${API_BASE}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        password,
                        nickname: nickname || username,
                    }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.detail || '注册失败');
                }

                // 注册成功后自动登录
                setMode('login');
                setError(null);
                alert('注册成功！请登录');
            } else {
                // 登录请求
                // 登录请求
                const response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.detail || '登录失败');
                }

                const data = await response.json();

                // 保存登录状态
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                onLoginSuccess?.(data.user);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '操作失败');
        } finally {
            setIsLoading(false);
        }
    }, [mode, username, password, confirmPassword, nickname, onLoginSuccess]);

    // WeChat login handler
    const handleWeChatLogin = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Get WeChat OAuth URL (backend will use its own callback URL)
            const response = await fetch(`${API_BASE}/auth/wechat/url`);

            if (!response.ok) {
                throw new Error('无法获取微信登录链接');
            }

            const data = await response.json();

            // Redirect to WeChat authorization page
            window.location.href = data.auth_url;
        } catch (err) {
            setError(err instanceof Error ? err.message : '微信登录失败');
            setIsLoading(false);
        }
    }, []);

    // Handle WeChat account binding
    const handleBindWeChat = useCallback(async () => {
        if (!weChatInfo) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/auth/wechat/bind`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: bindUsername,
                    password: bindPassword,
                    openid: weChatInfo.openid,
                    wechat_nickname: weChatInfo.nickname,
                    wechat_avatar: weChatInfo.avatar,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || '绑定失败');
            }

            const data = await response.json();

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            setShowBindModal(false);
            onLoginSuccess?.(data.user);
        } catch (err) {
            setError(err instanceof Error ? err.message : '绑定失败');
        } finally {
            setIsLoading(false);
        }
    }, [weChatInfo, bindUsername, bindPassword, onLoginSuccess]);

    // Create new account with WeChat
    const handleRegisterWithWeChat = useCallback(async () => {
        if (!weChatInfo) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${API_BASE}/auth/wechat/register-new?openid=${weChatInfo.openid}&nickname=${encodeURIComponent(weChatInfo.nickname)}&avatar=${encodeURIComponent(weChatInfo.avatar)}`,
                { method: 'POST' }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || '注册失败');
            }

            const data = await response.json();

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            setShowBindModal(false);
            onLoginSuccess?.(data.user);
        } catch (err) {
            setError(err instanceof Error ? err.message : '注册失败');
        } finally {
            setIsLoading(false);
        }
    }, [weChatInfo, onLoginSuccess]);

    // WeChat Binding Modal
    if (showBindModal && weChatInfo) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-green-500 to-green-600" />
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <img
                                src={weChatInfo.avatar || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%2307C160"/></svg>'}
                                alt="WeChat Avatar"
                                className="w-16 h-16 rounded-full mx-auto mb-3"
                            />
                            <h3 className="text-xl font-bold text-warm-800">欢迎，{weChatInfo.nickname}</h3>
                            <p className="text-warm-500 text-sm mt-1">请选择登录方式</p>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <button
                                onClick={handleRegisterWithWeChat}
                                disabled={isLoading}
                                className="w-full py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all disabled:opacity-50"
                            >
                                🆕 直接创建新账户
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-warm-200" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-warm-500">或绑定已有账户</span>
                                </div>
                            </div>

                            <input
                                type="text"
                                value={bindUsername}
                                onChange={(e) => setBindUsername(e.target.value)}
                                placeholder="已有账户用户名"
                                className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <input
                                type="password"
                                value={bindPassword}
                                onChange={(e) => setBindPassword(e.target.value)}
                                placeholder="密码"
                                className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <button
                                onClick={handleBindWeChat}
                                disabled={isLoading || !bindUsername || !bindPassword}
                                className="w-full py-3 bg-warm-100 text-warm-700 rounded-xl font-semibold hover:bg-warm-200 transition-all disabled:opacity-50"
                            >
                                🔗 绑定现有账户
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                setShowBindModal(false);
                                setWeChatInfo(null);
                            }}
                            className="w-full mt-4 text-warm-400 hover:text-warm-600 text-sm"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* 顶部装饰 */}
                <div className="h-2 bg-gradient-to-r from-primary-500 via-accent-500 to-calm-500" />

                <div className="p-8">
                    {/* Logo 和标题 */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl mx-auto flex items-center justify-center mb-4">
                            <span className="text-3xl">🧠</span>
                        </div>
                        <h2 className="text-2xl font-bold text-warm-800">
                            {mode === 'login' ? '欢迎回来' : '创建账户'}
                        </h2>
                        <p className="text-warm-500 text-sm mt-1">
                            {mode === 'login' ? '登录以保存你的评估记录' : '注册开始你的心理健康之旅'}
                        </p>
                    </div>

                    {/* 错误提示 */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* 微信登录按钮 */}
                    <button
                        onClick={handleWeChatLogin}
                        disabled={isLoading}
                        className="w-full py-3 mb-4 bg-[#07C160] text-white rounded-xl font-semibold hover:bg-[#06ae56] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.108.24-.243 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.406-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z" />
                        </svg>
                        <span>微信登录</span>
                    </button>

                    <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-warm-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-warm-400">或使用账号密码</span>
                        </div>
                    </div>

                    {/* 表单 */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-warm-700 mb-1">
                                用户名
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="请输入用户名"
                                required
                                className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>

                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-warm-700 mb-1">
                                    昵称（可选）
                                </label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="你希望被怎么称呼？"
                                    className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-warm-700 mb-1">
                                密码
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={mode === 'register' ? '至少6位密码' : '请输入密码'}
                                required
                                className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>

                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-warm-700 mb-1">
                                    确认密码
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="再次输入密码"
                                    required
                                    className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transition-all disabled:opacity-50"
                        >
                            {isLoading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
                        </button>
                    </form>

                    {/* 切换模式 */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                setMode(mode === 'login' ? 'register' : 'login');
                                setError(null);
                            }}
                            className="text-primary-600 hover:text-primary-700 text-sm"
                        >
                            {mode === 'login' ? '还没有账户？立即注册' : '已有账户？立即登录'}
                        </button>
                    </div>

                    {/* 关闭按钮 */}
                    <div className="mt-4 text-center">
                        <button
                            onClick={onClose}
                            className="text-warm-400 hover:text-warm-600 text-sm"
                        >
                            稍后再说
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 用户头像组件
export const UserAvatar = ({ user, onClick }: { user: UserInfo | null; onClick?: () => void }) => {
    if (!user) {
        return (
            <button
                onClick={onClick}
                className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full border border-warm-200 hover:bg-warm-50 transition-all"
            >
                <span className="text-lg">👤</span>
                <span className="text-sm font-medium text-warm-700">登录</span>
            </button>
        );
    }

    return (
        <div className="flex items-center space-x-3 px-4 py-2 bg-white/80 backdrop-blur rounded-full border border-warm-200">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user.nickname?.charAt(0) || user.username.charAt(0)}
            </div>
            <span className="text-sm font-medium text-warm-700">{user.nickname || user.username}</span>
        </div>
    );
};

export default AuthModal;
