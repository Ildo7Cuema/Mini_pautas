import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type {
    AuthUser,
    UserProfile,
    EscolaProfile,
    ProfessorProfile,
    TurmaProfessor,
    Escola,
    Professor
} from '../types'

interface AuthContextType {
    user: AuthUser | null
    loading: boolean
    isEscola: boolean
    isProfessor: boolean
    escolaProfile: EscolaProfile | null
    professorProfile: ProfessorProfile | null
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [loading, setLoading] = useState(true)
    const [isEscola, setIsEscola] = useState(false)
    const [isProfessor, setIsProfessor] = useState(false)
    const [escolaProfile, setEscolaProfile] = useState<EscolaProfile | null>(null)
    const [professorProfile, setProfessorProfile] = useState<ProfessorProfile | null>(null)

    const loadUserProfile = async (authUser: User) => {
        console.log('🔍 AuthContext: Loading user profile for:', authUser.id)
        console.log('🔍 AuthContext: Current loading state:', loading)
        try {
            // Get user profile
            console.log('📡 AuthContext: Querying user_profiles table...')

            const { data: profileData, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', authUser.id)
                .eq('ativo', true)
                .maybeSingle()

            console.log('📊 AuthContext: Query result:', {
                data: profileData,
                error: profileError,
                errorDetails: profileError ? {
                    message: profileError.message,
                    details: profileError.details,
                    hint: profileError.hint,
                    code: profileError.code
                } : null
            })

            if (profileError) {
                console.error('❌ AuthContext: Error loading user profile:', profileError)
                setUser({
                    id: authUser.id,
                    email: authUser.email || '',
                    profile: null
                })
                setLoading(false)
                return
            }

            if (!profileData) {
                console.warn('⚠️ AuthContext: No user profile found for user:', authUser.id)
                console.log('🔍 AuthContext: Checking if user is a professor without user_profile...')

                // Try to find professor directly
                const { data: professorData, error: profError } = await supabase
                    .from('professores')
                    .select('*')
                    .eq('user_id', authUser.id)
                    .eq('ativo', true)
                    .maybeSingle()

                if (profError) {
                    console.error('❌ AuthContext: Error checking professor:', profError)
                }

                if (professorData) {
                    console.log('✅ AuthContext: Found professor record, creating minimal profile')
                    // User is a professor but doesn't have user_profile yet
                    setIsProfessor(true)
                    setIsEscola(false)

                    const professor = professorData as Professor
                    const professorProfile: ProfessorProfile = {
                        ...professor,
                        user_profile: null as any,
                        turmas_associadas: []
                    }

                    setProfessorProfile(professorProfile)
                    setUser({
                        id: authUser.id,
                        email: professor.email,
                        profile: null,
                        professor: professorProfile
                    })
                    setLoading(false)
                    return
                }

                // Try to find professor by email (in case user_id wasn't linked yet)
                console.log('🔍 AuthContext: Checking professor by email:', authUser.email)
                const { data: professorByEmail, error: profEmailError } = await supabase
                    .from('professores')
                    .select('*')
                    .eq('email', authUser.email)
                    .eq('ativo', true)
                    .maybeSingle()

                if (profEmailError) {
                    console.error('❌ AuthContext: Error checking professor by email:', profEmailError)
                }

                if (professorByEmail) {
                    console.log('✅ AuthContext: Found professor by email, linking user_id...')

                    // Update professor with user_id
                    const { error: updateError } = await supabase
                        .from('professores')
                        .update({ user_id: authUser.id })
                        .eq('id', professorByEmail.id)

                    if (updateError) {
                        console.error('❌ AuthContext: Error linking user_id to professor:', updateError)
                    } else {
                        console.log('✅ AuthContext: Successfully linked user_id to professor')
                    }

                    // Set professor profile
                    setIsProfessor(true)
                    setIsEscola(false)

                    const professor = { ...professorByEmail, user_id: authUser.id } as Professor
                    const professorProfile: ProfessorProfile = {
                        ...professor,
                        user_profile: null as any,
                        turmas_associadas: []
                    }

                    setProfessorProfile(professorProfile)
                    setUser({
                        id: authUser.id,
                        email: professor.email,
                        profile: null,
                        professor: professorProfile
                    })
                    setLoading(false)
                    return
                }

                // No profile found at all
                console.warn('⚠️ AuthContext: User has no profile in any table')
                console.log('🔄 AuthContext: Clearing invalid session...')

                // Clear the session since this user has no valid profile
                await supabase.auth.signOut()

                setUser(null)
                setLoading(false)
                return
            }

            console.log('✅ AuthContext: User profile loaded:', profileData)
            const profile = profileData as UserProfile

            // Set role flags
            setIsEscola(profile.tipo_perfil === 'ESCOLA')
            setIsProfessor(profile.tipo_perfil === 'PROFESSOR')

            // Load specific profile data based on role
            if (profile.tipo_perfil === 'ESCOLA') {
                console.log('🏫 AuthContext: Loading escola profile...')
                await loadEscolaProfile(authUser.id, profile)
            } else if (profile.tipo_perfil === 'PROFESSOR') {
                console.log('👨‍🏫 AuthContext: Loading professor profile...')
                await loadProfessorProfile(authUser.id, profile)
            }

            // CRITICAL: Always set loading to false, even if profile loading fails
            console.log('✅ AuthContext: Profile loading complete, setting loading=false')
            setLoading(false)

        } catch (error) {
            console.error('❌ AuthContext: Unexpected error in loadUserProfile:', error)
            setUser({
                id: authUser.id,
                email: authUser.email || '',
                profile: null
            })
            // CRITICAL: Always set loading to false
            setLoading(false)
        }
    }

    const loadEscolaProfile = async (userId: string, profile: UserProfile) => {
        try {
            console.log('🏫 AuthContext: Fetching escola data for escola_id:', profile.escola_id)
            // Get escola data
            const { data: escolaData, error: escolaError } = await supabase
                .from('escolas')
                .select('*')
                .eq('id', profile.escola_id)
                .maybeSingle()

            if (escolaError) {
                console.error('❌ AuthContext: Error loading escola:', escolaError)
                // Set minimal user data even if escola loading fails
                setUser({
                    id: userId,
                    email: profile.user_id || '',
                    profile
                })
                return
            }

            if (!escolaData) {
                console.warn('⚠️ AuthContext: No escola found for escola_id:', profile.escola_id)
                setUser({
                    id: userId,
                    email: profile.user_id || '',
                    profile
                })
                return
            }

            console.log('✅ AuthContext: Escola data loaded:', escolaData)
            const escola = escolaData as Escola
            const escolaProfile: EscolaProfile = {
                ...escola,
                user_profile: profile
            }

            setEscolaProfile(escolaProfile)
            setUser({
                id: userId,
                email: escola.email || '',
                profile,
                escola: escolaProfile
            })
            console.log('✅ AuthContext: Escola profile set successfully')

        } catch (error) {
            console.error('❌ AuthContext: Unexpected error in loadEscolaProfile:', error)
            // Set minimal user data even on unexpected error
            setUser({
                id: userId,
                email: profile.user_id || '',
                profile
            })
        }
    }

    const loadProfessorProfile = async (userId: string, profile: UserProfile) => {
        try {
            console.log('👨‍🏫 AuthContext: Fetching professor data for user_id:', userId)
            // Get professor data
            const { data: professorData, error: professorError } = await supabase
                .from('professores')
                .select('*')
                .eq('user_id', userId)
                .eq('ativo', true)
                .maybeSingle()

            if (professorError) {
                console.error('❌ AuthContext: Error loading professor:', professorError)
                // Set minimal user data even if professor loading fails
                setUser({
                    id: userId,
                    email: profile.user_id || '',
                    profile
                })
                return
            }

            if (!professorData) {
                console.warn('⚠️ AuthContext: No professor found for user_id:', userId)
                setUser({
                    id: userId,
                    email: profile.user_id || '',
                    profile
                })
                return
            }

            console.log('✅ AuthContext: Professor data loaded:', professorData)
            const professor = professorData as Professor

            // Get turmas associadas (may fail due to RLS, that's OK)
            console.log('📚 AuthContext: Fetching turmas associadas...')
            console.log('📚 AuthContext: Professor ID:', professor.id)

            const { data: turmasData, error: turmasError } = await supabase
                .from('turma_professores')
                .select(`
                    *,
                    turma:turmas(*),
                    disciplina:disciplinas(*)
                `)
                .eq('professor_id', professor.id)

            console.log('📊 AuthContext: Turmas query result:', {
                data: turmasData,
                error: turmasError,
                errorDetails: turmasError ? {
                    message: turmasError.message,
                    details: turmasError.details,
                    hint: turmasError.hint,
                    code: turmasError.code
                } : null
            })

            if (turmasError) {
                console.warn('⚠️ AuthContext: Error loading turmas associadas:', turmasError)
                console.warn('⚠️ AuthContext: This may be due to RLS policies or missing associations')
            }

            const turmasAssociadas = (turmasData || []) as TurmaProfessor[]
            console.log('✅ AuthContext: Loaded', turmasAssociadas.length, 'turmas associadas')

            if (turmasAssociadas.length === 0) {
                console.warn('⚠️ AuthContext: No turmas associadas found for professor')
                console.warn('⚠️ AuthContext: This professor may need to be associated with turmas via admin panel')
            }

            const professorProfile: ProfessorProfile = {
                ...professor,
                user_profile: profile,
                turmas_associadas: turmasAssociadas
            }

            setProfessorProfile(professorProfile)
            setUser({
                id: userId,
                email: professor.email,
                profile,
                professor: professorProfile
            })
            console.log('✅ AuthContext: Professor profile set successfully')

        } catch (error) {
            console.error('❌ AuthContext: Unexpected error in loadProfessorProfile:', error)
            // Set minimal user data even on unexpected error
            setUser({
                id: userId,
                email: profile.user_id || '',
                profile
            })
        }
    }

    const refreshProfile = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
            await loadUserProfile(authUser)
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setIsEscola(false)
        setIsProfessor(false)
        setEscolaProfile(null)
        setProfessorProfile(null)
    }

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                loadUserProfile(session.user)
            } else {
                setLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session?.user) {
                    await loadUserProfile(session.user)
                } else {
                    setUser(null)
                    setIsEscola(false)
                    setIsProfessor(false)
                    setEscolaProfile(null)
                    setProfessorProfile(null)
                    setLoading(false)
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const value: AuthContextType = {
        user,
        loading,
        isEscola,
        isProfessor,
        escolaProfile,
        professorProfile,
        signOut,
        refreshProfile
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
