import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    fullWidth?: boolean
    icon?: ReactNode
    iconPosition?: 'left' | 'right'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        variant = 'primary',
        size = 'md',
        loading = false,
        fullWidth = false,
        icon,
        iconPosition = 'left',
        children,
        className = '',
        disabled,
        ...props
    }, ref) => {
        const baseClasses = 'btn'

        const variantClasses = {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
            ghost: 'btn-ghost',
            danger: 'btn-danger',
        }

        const sizeClasses = {
            sm: 'btn-sm',
            md: '',
            lg: 'btn-lg',
        }

        const classes = [
            baseClasses,
            variantClasses[variant],
            sizeClasses[size],
            fullWidth ? 'w-full' : '',
            className,
        ].filter(Boolean).join(' ')

        const LoadingSpinner = () => (
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
        )

        return (
            <button
                ref={ref}
                className={classes}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <>
                        <LoadingSpinner />
                        <span className="ml-2">{children}</span>
                    </>
                ) : (
                    <>
                        {icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
                        {children}
                        {icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
                    </>
                )}
            </button>
        )
    }
)

Button.displayName = 'Button'
