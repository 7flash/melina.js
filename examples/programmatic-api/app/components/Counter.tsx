/**
 * Counter Component — Clean 'use client' syntax
 * 
 * Testing auto-wrapping plugin with args debugging
 */
'use client';

import { useState } from 'react';

export default function Counter({ initialCount = 0 }) {
    const [count, setCount] = useState(initialCount);

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
                onClick={() => setCount(c => c - 1)}
                style={{
                    padding: '0.5rem 1rem',
                    fontSize: '1.25rem',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    background: '#fff',
                    cursor: 'pointer'
                }}
            >
                −
            </button>

            <span style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                minWidth: '3rem',
                textAlign: 'center'
            }}>
                {count}
            </span>

            <button
                onClick={() => setCount(c => c + 1)}
                style={{
                    padding: '0.5rem 1rem',
                    fontSize: '1.25rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#f97316',
                    color: 'white',
                    cursor: 'pointer'
                }}
            >
                +
            </button>
        </div>
    );
}
