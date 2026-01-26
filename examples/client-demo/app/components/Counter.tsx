/**
 * Example Counter Component using melina/client
 * 
 * This demonstrates the new React-free architecture.
 * The component uses Melina's own hooks and JSX runtime.
 */
'use client';

import { useState, type VNode } from 'melina/client';

interface CounterProps {
    initial?: number;
    label?: string;
}

export default function Counter({ initial = 0, label = 'Count' }: CounterProps): VNode {
    const [count, setCount] = useState(initial);

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
                {label}: {count}
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
