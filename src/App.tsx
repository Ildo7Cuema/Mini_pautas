import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import { LoginScreen } from './components/LoginScreen'
import { DashboardLayout } from './components/DashboardLayout'
import { Dashboard } from './components/Dashboard'
import { ClassesPage } from './components/ClassesPage'
import { ClassDetailsPage } from './components/ClassDetailsPage'
import { StudentsPage } from './components/StudentsPage'
import { GradesPage } from './components/GradesPage'
import { ReportsPage } from './components/ReportsPage'
import { SettingsPage } from './components/SettingsPage'
import { TeachersPage } from './components/TeachersPage'
import { ProfessorRegistration } from './components/ProfessorRegistration'
import { ProfessorDashboard } from './components/ProfessorDashboard'
import { ResetPasswordPage } from './components/ResetPasswordPage'

function App() {
    const { user, loading, isProfessor } = useAuth()
    const [currentPage, setCurrentPage] = useState('dashboard')
    const [navigationParams, setNavigationParams] = useState<{ turmaId?: string }>({})
    const [searchQuery, setSearchQuery] = useState('')

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

    if (window.location.pathname === '/register-professor') {
        return <ProfessorRegistration />
    }

    if (window.location.pathname === '/reset-password') {
        return <ResetPasswordPage />
    }

    if (!user) {
        return <LoginScreen />
    }

    const handleNavigate = (page: string, params?: { turmaId?: string }) => {
        setCurrentPage(page)
        setSearchQuery('') // Clear search when navigating
        if (params) {
            setNavigationParams(params)
        } else {
            setNavigationParams({})
        }
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return isProfessor ? <ProfessorDashboard /> : <Dashboard onNavigate={handleNavigate} searchQuery={searchQuery} />
            case 'classes':
                return <ClassesPage onNavigate={handleNavigate} searchQuery={searchQuery} />
            case 'class-details':
                return navigationParams.turmaId ? (
                    <ClassDetailsPage turmaId={navigationParams.turmaId} onNavigate={handleNavigate} />
                ) : (
                    <ClassesPage onNavigate={handleNavigate} searchQuery={searchQuery} />
                )
            case 'students':
                return <StudentsPage searchQuery={searchQuery} />
            case 'grades':
                return <GradesPage searchQuery={searchQuery} />
            case 'reports':
                return <ReportsPage searchQuery={searchQuery} />
            case 'settings':
                return <SettingsPage />
            case 'teachers':
                return <TeachersPage onNavigate={handleNavigate} searchQuery={searchQuery} />
            default:
                return <Dashboard onNavigate={handleNavigate} searchQuery={searchQuery} />
        }
    }

    const handleSearch = (query: string) => {
        setSearchQuery(query)
    }

    return (
        <DashboardLayout currentPage={currentPage} onNavigate={handleNavigate} onSearch={handleSearch}>
            {renderPage()}
        </DashboardLayout>
    )
}

export default App
