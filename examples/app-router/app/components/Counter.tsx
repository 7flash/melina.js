'use client';

import React, { useState } from 'react';
import { island } from '../../../../src/island';

/**
 * Counter Implementation
 */
function CounterImpl({ initialCount = 10 }: { initialCount?: number }) {
    const [count, setCount] = useState(initialCount);

    return (
        <div style={{
            padding: '1rem',
            border: '2px dashed #667eea',
            borderRadius: '8px',
            marginTop: '1rem',
            background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)'
        }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>🏝️ Interactive Island</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0.5rem 0' }}>
                Count: {count}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={() => setCount(c => c - 1)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: '1px solid #667eea',
                        background: 'white',
                        cursor: 'pointer'
                    }}
                >
                    - Decrement
                </button>
                <button
                    onClick={() => setCount(c => c + 1)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        background: '#667eea',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    + Increment
                </button>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '0.5rem' }}>
                This is a Client Component (island) with full React interactivity.
            </p>
        </div>
    );
}

/**
 * Counter - Island-wrapped component
 */
export const Counter = island(CounterImpl, 'Counter');
export default Counter;
