import React from 'react';

export interface LinkProps {
    href: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Link Component
 * 
 * Client-side navigation with View Transitions support.
 * Uses window.melinaNavigate for SPA-style page transitions.
 */
export function Link({ href, children, className, style }: LinkProps) {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Allow default behavior for special clicks or external links
        if (
            e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 ||
            !href.startsWith('/') ||
            e.currentTarget.hasAttribute('download')
        ) {
            return;
        }

        e.preventDefault();

        if (typeof (window as any).melinaNavigate === 'function') {
            (window as any).melinaNavigate(href);
        } else {
            window.location.href = href;
        }
    };

    return (
        <a href={href} onClick={handleClick} className={className} style={style}>
            {children}
        </a>
    );
}

// Hook for programmatic navigation
export function useNavigate() {
    return (href: string) => {
        if (typeof (window as any).melinaNavigate === 'function') {
            (window as any).melinaNavigate(href);
        } else {
            window.location.href = href;
        }
    };
}

// Direct navigation function
export const clientNavigate = (href: string) => {
    if (typeof (window as any).melinaNavigate === 'function') {
        (window as any).melinaNavigate(href);
    } else {
        window.location.href = href;
    }
};
