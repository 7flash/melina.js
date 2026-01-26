'use client';

import React, { useState, useEffect } from 'react';
import { island } from '../../../../src/island';

const STORAGE_KEY = 'melina_search_query';

/**
 * SearchBar Implementation
 */
function SearchBarImpl() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setSearchQuery(saved);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        localStorage.setItem(STORAGE_KEY, value);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
                id="persistent-search"
                type="text"
                value={searchQuery}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search..."
                style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    border: isFocused ? '2px solid #fff' : '2px solid transparent',
                    width: '250px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border 0.2s'
                }}
            />
            {searchQuery && (
                <span style={{ fontSize: '12px', opacity: 0.9 }}>
                    🔍 "{searchQuery}"
                </span>
            )}
        </div>
    );
}

/**
 * SearchBar - Island-wrapped component
 * Can be imported directly in Server Components
 */
export const SearchBar = island(SearchBarImpl, 'SearchBar');
export default SearchBar;
