import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode
    /** Override the background color with an inline style (e.g. for list-type colors) */
    bgColor?: string
}

export function PrimaryButton({ children, bgColor, className = '', style, ...props }: PrimaryButtonProps) {
    return (
        <button
            className={`w-full p-2.5 rounded-lg bg-sky-400 dark:bg-sky-600 text-neutral-50 dark:text-neutral-200 font-medium flex items-center justify-center gap-2 transition-opacity active:opacity-80 disabled:opacity-40 ${className}`}
            style={bgColor ? { backgroundColor: bgColor, color: '#fff', ...style } : style}
            {...props}
        >
            {children}
        </button>
    )
}
