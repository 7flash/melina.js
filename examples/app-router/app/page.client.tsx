import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import HomePage from './page';

// 1. Get the data the server sent us
const data = (window as any).__MELINA_DATA__ || { props: {}, params: {} };

console.log('[Client] Hydrating HomePage...', data);

// 2. Hydrate the existing HTML with the React component
hydrateRoot(
    document.getElementById('root')!,
    <React.StrictMode>
        <HomePage {...data.props} params={data.params} />
    </React.StrictMode>
);

// Add visual indicator that hydration happened
const div = document.createElement('div');
div.style.position = 'fixed';
div.style.bottom = '10px';
div.style.right = '10px';
div.style.background = '#00ff00';
div.style.padding = '5px';
div.id = 'client-hydration-indicator';
div.textContent = `Hydrated at ${new Date().toLocaleTimeString()}`;
document.body.appendChild(div);
