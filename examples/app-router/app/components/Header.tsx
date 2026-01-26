import React from 'react';
import { Link } from '../../../../src/Link';

export function Header() {
    return (
        <header style={{
            borderBottom: '1px solid #eee',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '1.5rem', marginRight: '1rem' }}>🦊</span>
                <nav style={{ display: 'flex', gap: '1rem' }}>
                    <Link href="/">Home</Link>
                    <Link href="/about">About</Link>
                </nav>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    id="persistent-search"
                    type="text"
                    placeholder="Search (persists)..."
                    style={{
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        viewTransitionName: 'search-box'
                    }}
                />
            </div>
        </header>
    );
}
