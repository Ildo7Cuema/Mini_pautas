import { useAuth } from '../contexts/AuthContext'
import {
    canCreateTeacher,
    canCreateStudent,
    canCreateTurma,
    canAssignTeacher,
    canGradeStudent,
    canViewMiniPauta,
    canExportMiniPauta,
    canEditTurma,
    canDeleteTurma,
    canEditStudent,
    canDeleteStudent,
    canManageComponents,
    canManageFormulas,
    canViewAllTurmas,
    canViewAllStudents,
    canAccessSchoolSettings,
    getAccessibleTurmaIds,
    getAccessibleDisciplinaIds,
    hasAnyAssignments
} from '../utils/permissions'

/**
 * Custom hook for permission checks
 */
export const usePermissions = () => {
    const { user, isEscola, isProfessor, professorProfile } = useAuth()

    const profile = user?.profile || null
    const associations = professorProfile?.turmas_associadas

    return {
        // Role checks
        isEscola,
        isProfessor,

        // Creation permissions
        canCreateTeacher: canCreateTeacher(profile),
        canCreateStudent: canCreateStudent(profile),
        canCreateTurma: canCreateTurma(profile),
        canAssignTeacher: canAssignTeacher(profile),

        // Grading permissions
        canGrade: (turmaId: string, disciplinaId: string) =>
            canGradeStudent(profile, turmaId, disciplinaId, associations),

        // Viewing permissions
        canViewMiniPauta: (turmaId: string, disciplinaId: string) =>
            canViewMiniPauta(profile, turmaId, disciplinaId, associations),
        canExportMiniPauta: (turmaId: string, disciplinaId: string) =>
            canExportMiniPauta(profile, turmaId, disciplinaId, associations),
        canViewAllTurmas: canViewAllTurmas(profile),
        canViewAllStudents: canViewAllStudents(profile),

        // Editing permissions
        canEditTurma: canEditTurma(profile),
        canDeleteTurma: canDeleteTurma(profile),
        canEditStudent: canEditStudent(profile),
        canDeleteStudent: canDeleteStudent(profile),

        // Component and formula management
        canManageComponents: (turmaId: string, disciplinaId: string) =>
            canManageComponents(profile, turmaId, disciplinaId, associations),
        canManageFormulas: (turmaId: string, disciplinaId: string) =>
            canManageFormulas(profile, turmaId, disciplinaId, associations),

        // Settings
        canAccessSchoolSettings: canAccessSchoolSettings(profile),

        // Helper functions
        getAccessibleTurmaIds: () => getAccessibleTurmaIds(associations),
        getAccessibleDisciplinaIds: (turmaId: string) =>
            getAccessibleDisciplinaIds(turmaId, associations),
        hasAnyAssignments: hasAnyAssignments(associations),

        // Profile data
        profile,
        associations
    }
}
