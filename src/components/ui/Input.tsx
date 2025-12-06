import { InputHTMLAttributes, forwardRef, ReactNode, useState } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helpText?: string
    icon?: ReactNode
    iconPosition?: 'left' | 'right'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helpText, icon, iconPosition = 'left', className = '', id, type, ...props }, ref) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
        const [showPassword, setShowPassword] = useState(false)
        const isPassword = type === 'password'
        const inputType = isPassword && showPassword ? 'text' : type

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="form-label">
                        {label}
                        {props.required && <span className="text-error ml-1">*</span>}
                    </label>
                )}
                <div className="relative">
                    {icon && iconPosition === 'left' && (
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        type={inputType}
                        className={`form-input ${error ? 'form-input-error' : ''} ${icon && iconPosition === 'left' ? 'pl-10' : ''
                            } ${isPassword ? 'pr-10' : icon && iconPosition === 'right' ? 'pr-10' : ''} ${className}`}
                        aria-invalid={error ? 'true' : 'false'}
                        aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    )}
                    {!isPassword && icon && iconPosition === 'right' && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                            {icon}
                        </div>
                    )}
                </div>
                {error && (
                    <p id={`${inputId}-error`} className="form-error" role="alert">
                        {error}
                    </p>
                )}
                {helpText && !error && (
                    <p id={`${inputId}-help`} className="form-help">
                        {helpText}
                    </p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'
