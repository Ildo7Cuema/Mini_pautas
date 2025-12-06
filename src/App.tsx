import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { LoginScreen } from './components/LoginScreen'
import { DashboardLayout } from './components/DashboardLayout'
import { Dashboard } from './components/Dashboard'
import { ClassesPage } from './components/ClassesPage'
import { ClassDetailsPage } from './components/ClassDetailsPage'
import { StudentsPage } from './components/StudentsPage'
import { GradesPage } from './components/GradesPage'
import { ReportsPage } from './components/ReportsPage'
import { SettingsPage } from './components/SettingsPage'
import type { User } from '@supabase/supabase-js'

function App() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState('dashboard')
    const [navigationParams, setNavigationParams] = useState<{ turmaId?: string }>({})

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // Listen for changes on auth state (logged in, signed out, etc.)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-slate-600">Carregando...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return <LoginScreen />
    }

    const handleNavigate = (page: string, params?: { turmaId?: string }) => {
        setCurrentPage(page)
        if (params) {
            setNavigationParams(params)
        } else {
            setNavigationParams({})
        }
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard onNavigate={handleNavigate} />
            case 'classes':
                return <ClassesPage onNavigate={handleNavigate} />
            case 'class-details':
                return navigationParams.turmaId ? (
                    <ClassDetailsPage turmaId={navigationParams.turmaId} onNavigate={handleNavigate} />
                ) : (
                    <ClassesPage onNavigate={handleNavigate} />
                )
            case 'students':
                return <StudentsPage />
            case 'grades':
                return <GradesPage />
            case 'reports':
                return <ReportsPage />
            case 'settings':
                return <SettingsPage />
            default:
                return <Dashboard onNavigate={handleNavigate} />
        }
    }

    const handleSearch = (query: string) => {
        console.log('Searching for:', query)
        // TODO: Implement search functionality
    }

    return (
        <DashboardLayout currentPage={currentPage} onNavigate={handleNavigate} onSearch={handleSearch}>
            {renderPage()}
        </DashboardLayout>
    )
}

export default App
