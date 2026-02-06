/**
 * Messenger Page — Server Component
 * 
 * Renders the messenger UI structure. 
 * Client interactivity would be in messenger/page.client.tsx
 */
import React from 'react';

export default function MessengerPage() {
    return (
        <div className="messenger-container" style={{ padding: '2rem' }}>
            <h1>Messenger</h1>
            <p style={{ color: 'var(--text-muted)' }}>Coming soon — messaging will be implemented with a page.client.tsx mount script.</p>
        </div>
    );
}
