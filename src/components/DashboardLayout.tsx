/*
component-meta:
  name: DashboardLayout
  description: Layout principal com bottom nav mobile e sidebar desktop
  tokens: [--color-primary, --spacing-4, min-h-touch]
  responsive: true
  tested-on: [360x800, 768x1024, 1440x900]
*/

import { ReactNode, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { NotificationPanel } from './NotificationPanel'
import { Notification, formatNotificationCount } from '../utils/notificationUtils'
import { fetchNotifications, markAsRead, markAllAsRead } from '../utils/notificationApi'

interface SidebarProps {
    children: ReactNode
    currentPage: string
    onNavigate: (page: string) => void
    onSearch?: (query: string) => void
}

interface NavItem {
    name: string
    icon: ReactNode
    path: string
    badge?: number
    showInMobile?: boolean
}

export const DashboardLayout: React.FC<SidebarProps> = ({ children, currentPage, onNavigate, onSearch }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const { user, isEscola, isProfessor, escolaProfile, professorProfile } = useAuth()

    // Notification state
    const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loadingNotifications, setLoadingNotifications] = useState(false)

    // Helper to get display name
    const getDisplayName = () => {
        if (isEscola && escolaProfile) {
            return escolaProfile.nome || 'Escola'
        } else if (isProfessor && professorProfile) {
            return professorProfile.nome_completo || 'Professor'
        }
        return user?.email?.split('@')[0] || 'Usuário'
    }

    // Helper to get initials
    const getInitials = () => {
        const name = getDisplayName()
        return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    }

    // Load notifications on mount and when user changes
    useEffect(() => {
        if (user) {
            loadNotifications()
        }
    }, [user])

    const loadNotifications = async () => {
        if (!user) return

        setLoadingNotifications(true)
        const { data } = await fetchNotifications(user.id)
        setNotifications(data)
        setLoadingNotifications(false)
    }

    const handleMarkAsRead = async (id: string) => {
        await markAsRead(id)
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, lida: true } : n)
        )
    }

    const handleMarkAllAsRead = async () => {
        if (!user) return

        await markAllAsRead(user.id)
        setNotifications(prev =>
            prev.map(n => ({ ...n, lida: true }))
        )
    }

    const handleNotificationClick = (notification: Notification) => {
        // Close panel
        setNotificationPanelOpen(false)

        // Navigate if link is provided
        if (notification.link) {
            onNavigate(notification.link)
        }
    }

    const unreadCount = notifications.filter(n => !n.lida).length

    // Helper to get role label
    const getRoleLabel = () => {
        if (isEscola) return 'Administrador'
        if (isProfessor) return 'Professor'
        return 'Usuário'
    }

    const navItems: NavItem[] = [
        {
            name: 'Dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            ),
            path: 'dashboard',
            showInMobile: true,
        },
        {
            name: 'Turmas',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            path: 'classes',
            showInMobile: true,
        },
        {
            name: 'Professores',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
            path: 'teachers',
            showInMobile: true,
        },
        {
            name: 'Alunos',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            path: 'students',
            showInMobile: true,
        },
        {
            name: 'Notas',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
            ),
            path: 'grades',
            showInMobile: true,
        },
        {
            name: 'Relatórios',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            path: 'reports',
            showInMobile: false,
        },
        {
            name: 'Configurações',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            path: 'settings',
            showInMobile: false,
        },
    ].filter(item => {
        if (item.path === 'teachers') return isEscola // Only show teachers menu for School Admins
        if (item.path === 'classes' || item.path === 'students') return isEscola // Hide classes and students for professors
        return true
    })

    // Items for mobile bottom nav (max 5)
    const mobileNavItems = navItems.filter(item => item.showInMobile)
    // Add "More" button for mobile
    const moreIcon = (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    )

    const getPageTitle = () => {
        const item = navItems.find(i => i.path === currentPage)
        return item?.name || 'Dashboard'
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (onSearch) {
            onSearch(searchQuery)
        }
    }

    const handleMobileNav = (path: string) => {
        if (path === 'more') {
            setMobileMenuOpen(true)
        } else {
            onNavigate(path)
            setMobileMenuOpen(false)
        }
    }

    return (
        <div className="flex flex-col md:flex-row h-screen bg-slate-50">
            {/* Desktop Sidebar - Hidden on mobile */}
            <aside
                className={`hidden md:flex ${sidebarOpen ? 'w-64' : 'w-20'
                    } bg-white border-r border-slate-200 transition-all duration-300 ease-in-out flex-col relative`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200">
                    {sidebarOpen ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="font-bold text-slate-900">EduGest Angola</span>
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => onNavigate(item.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 min-h-touch ${currentPage === item.path
                                ? 'bg-primary-50 text-primary-600'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                        >
                            {item.icon}
                            {sidebarOpen && (
                                <>
                                    <span className="flex-1 text-left text-sm font-medium">{item.name}</span>
                                    {item.badge && (
                                        <span className="bg-primary-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </button>
                    ))}
                </nav>

                {/* User Profile */}
                <div className="p-3 border-t border-slate-200">
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-touch ${!sidebarOpen && 'justify-center'}`}>
                        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {getInitials()}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                    {getDisplayName()}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{getRoleLabel()}</p>
                                {isProfessor && professorProfile?.escola && (
                                    <p className="text-xs text-slate-400 truncate mt-0.5">
                                        {professorProfile.escola.nome}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
                >
                    <svg
                        className={`w-4 h-4 transition-transform ${!sidebarOpen && 'rotate-180'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
                {/* Header - Responsive */}
                <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-3">
                        {/* Mobile Logo */}
                        <div className="md:hidden w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h1 className="text-lg md:text-xl font-bold text-slate-900">{getPageTitle()}</h1>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Search - Hidden on mobile, shown on desktop */}
                        <form onSubmit={handleSearch} className="relative hidden md:block">
                            <input
                                type="search"
                                placeholder="Buscar turmas, alunos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-64 pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </form>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
                                className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors min-h-touch min-w-touch flex items-center justify-center"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center px-1">
                                        {formatNotificationCount(unreadCount)}
                                    </span>
                                )}
                            </button>

                            <NotificationPanel
                                isOpen={notificationPanelOpen}
                                onClose={() => setNotificationPanelOpen(false)}
                                notifications={notifications}
                                onMarkAsRead={handleMarkAsRead}
                                onMarkAllAsRead={handleMarkAllAsRead}
                                onNotificationClick={handleNotificationClick}
                                loading={loadingNotifications}
                            />
                        </div>

                        {/* Logout - Hidden on mobile */}
                        <button
                            onClick={async () => {
                                const { supabase } = await import('../lib/supabaseClient')
                                await supabase.auth.signOut()
                            }}
                            className="hidden md:flex p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors min-h-touch min-w-touch items-center justify-center"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 safe-area-inset-bottom z-50">
                <div className="flex items-center justify-around">
                    {mobileNavItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => handleMobileNav(item.path)}
                            className={`flex flex-col items-center justify-center py-2 px-3 min-h-touch min-w-touch transition-colors ${currentPage === item.path
                                ? 'text-primary-600'
                                : 'text-slate-500'
                                }`}
                        >
                            {item.icon}
                            <span className="text-xs mt-1 font-medium">{item.name}</span>
                        </button>
                    ))}
                    {/* More Button */}
                    <button
                        onClick={() => handleMobileNav('more')}
                        className="flex flex-col items-center justify-center py-2 px-3 min-h-touch min-w-touch transition-colors text-slate-500"
                    >
                        {moreIcon}
                        <span className="text-xs mt-1 font-medium">Mais</span>
                    </button>
                </div>
            </nav>

            {/* Mobile More Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 animate-fade-in">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Menu Panel */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-8 animate-slide-up safe-area-inset-bottom">
                        <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-4" />

                        <div className="space-y-2">
                            {navItems.filter(item => !item.showInMobile).map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => handleMobileNav(item.path)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-touch ${currentPage === item.path
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    {item.icon}
                                    <span className="font-medium">{item.name}</span>
                                </button>
                            ))}

                            {/* Logout */}
                            <button
                                onClick={async () => {
                                    await supabase.auth.signOut()
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors min-h-touch"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span className="font-medium">Terminar Sessão</span>
                            </button>
                        </div>

                        {/* User Info */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <div className="flex items-center gap-3 px-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {getInitials()}
                                </div>
                                <div>
                                    <p className="font-medium text-slate-900">
                                        {getDisplayName()}
                                    </p>
                                    <p className="text-sm text-slate-500">{getRoleLabel()}</p>
                                    {isProfessor && professorProfile?.escola && (
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {professorProfile.escola.nome}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
