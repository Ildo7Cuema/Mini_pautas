import React, { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    variant?: 'default' | 'interactive' | 'gradient' | 'glass'
}

export const Card: React.FC<CardProps> = ({ children, variant = 'default', className = '', ...props }) => {
    const variantClasses = {
        default: 'card',
        interactive: 'card-interactive',
        gradient: 'card-gradient',
        glass: 'card-glass',
    }

    return (
        <div className={`${variantClasses[variant]} ${className}`} {...props}>
            {children}
        </div>
    )
}

export const CardHeader: React.FC<Omit<CardProps, 'variant'>> = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-header ${className}`} {...props}>
            {children}
        </div>
    )
}

export const CardBody: React.FC<Omit<CardProps, 'variant'>> = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-body ${className}`} {...props}>
            {children}
        </div>
    )
}

export const CardFooter: React.FC<Omit<CardProps, 'variant'>> = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-footer ${className}`} {...props}>
            {children}
        </div>
    )
}

