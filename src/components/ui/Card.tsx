import React, { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <div className={`card ${className}`} {...props}>
            {children}
        </div>
    )
}

export const CardHeader: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-header ${className}`} {...props}>
            {children}
        </div>
    )
}

export const CardBody: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-body ${className}`} {...props}>
            {children}
        </div>
    )
}

export const CardFooter: React.FC<CardProps> = ({ children, className = '', ...props }) => {
    return (
        <div className={`card-footer ${className}`} {...props}>
            {children}
        </div>
    )
}
