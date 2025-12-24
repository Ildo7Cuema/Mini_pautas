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
import { StudentRegistration } from './components/StudentRegistration'
import { GuardianRegistration } from './components/GuardianRegistration'
import { ProfessorDashboard } from './components/ProfessorDashboard'
import { ResetPasswordPage } from './components/ResetPasswordPage'
import { SuperAdminDashboard } from './components/SuperAdminDashboard'
import { EscolaManagement } from './components/EscolaManagement'
import { SuperAdminAuditLog } from './components/SuperAdminAuditLog'
import { LicenseManagement } from './components/LicenseManagement'
import { AlunoNotasPage } from './components/AlunoNotasPage'
import { EncarregadoNotasPage } from './components/EncarregadoNotasPage'
import { SubscriptionPage } from './components/SubscriptionPage'
import { PublicPaymentPage } from './components/PublicPaymentPage'
import { TuitionPaymentsPage } from './components/TuitionPaymentsPage'
import { SecretariesPage } from './components/SecretariesPage'
import { isSuperAdmin } from './utils/permissions'

function App() {
    const { user, loading, isProfessor, isAluno, isEncarregado, isSecretario, profile } = useAuth()
    const [currentPage, setCurrentPage] = useState('dashboard')
    const [navigationParams, setNavigationParams] = useState<{ turmaId?: string }>({})
    const [searchQuery, setSearchQuery] = useState('')

    const isSuperAdminUser = profile ? isSuperAdmin(profile) : false

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

    // Public routes - accessible without authentication
    if (window.location.pathname === '/pagamento-escola') {
        return <PublicPaymentPage />
    }

    if (window.location.pathname === '/register-professor') {
        return <ProfessorRegistration />
    }

    if (window.location.pathname === '/register-student') {
        return <StudentRegistration />
    }

    if (window.location.pathname === '/register-guardian') {
        return <GuardianRegistration />
    }

    if (window.location.pathname === '/register-secretary') {
        // Dynamic import handled by component
        const SecretaryRegistration = require('./components/SecretaryRegistration').SecretaryRegistration
        return <SecretaryRegistration />
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
        // SUPERADMIN routes
        if (isSuperAdminUser) {
            switch (currentPage) {
                case 'dashboard':
                case 'superadmin-dashboard':
                    return <SuperAdminDashboard />
                case 'superadmin-escolas':
                    return <EscolaManagement />
                case 'superadmin-licencas':
                    return <LicenseManagement />
                case 'superadmin-audit':
                    return <SuperAdminAuditLog />
                case 'settings':
                    return <SettingsPage />
                default:
                    return <SuperAdminDashboard />
            }
        }

        // ALUNO routes - read-only grade viewing
        if (isAluno) {
            switch (currentPage) {
                case 'aluno-notas':
                case 'dashboard':
                    return <AlunoNotasPage />
                default:
                    return <AlunoNotasPage />
            }
        }

        // ENCARREGADO routes - guardian grade viewing
        if (isEncarregado) {
            switch (currentPage) {
                case 'encarregado-notas':
                case 'dashboard':
                    return <EncarregadoNotasPage />
                default:
                    return <EncarregadoNotasPage />
            }
        }

        // SECRETARIO routes - limited to students and payments
        if (isSecretario) {
            switch (currentPage) {
                case 'dashboard':
                    return <Dashboard onNavigate={handleNavigate} searchQuery={searchQuery} />
                case 'students':
                    return <StudentsPage searchQuery={searchQuery} />
                case 'propinas':
                case 'tuition':
                    return <TuitionPaymentsPage searchQuery={searchQuery} />
                default:
                    return <Dashboard onNavigate={handleNavigate} searchQuery={searchQuery} />
            }
        }

        // Regular user routes
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
            case 'subscription':
            case 'escola-subscricao':
                return <SubscriptionPage />
            case 'propinas':
            case 'tuition':
                return <TuitionPaymentsPage searchQuery={searchQuery} />
            case 'secretaries':
                return <SecretariesPage searchQuery={searchQuery} />
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
