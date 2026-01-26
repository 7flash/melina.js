'use client';

/**
 * Global Audio State Store
 * 
 * CRITICAL: This store is attached to `window` so ALL island bundles share
 * the same instance. Without this, each bundle would have its own copy
 * and state wouldn't sync across islands.
 */

type AudioState = {
    isPlaying: boolean;
    progress: number; // 0 to 100
};

type Listener = (state: AudioState) => void;

interface AudioStore {
    getState: () => AudioState;
    subscribe: (listener: Listener) => () => void;
    togglePlay: () => void;
    setProgress: (p: number) => void;
}

// Attach to window for true global singleton across all bundles
declare global {
    interface Window {
        __AUDIO_STORE__?: AudioStore;
        __AUDIO_INTERVAL__?: boolean;
    }
}

function createAudioStore(): AudioStore {
    let currentState: AudioState = {
        isPlaying: true,
        progress: 30
    };

    const listeners = new Set<Listener>();

    function notify() {
        listeners.forEach(fn => fn(currentState));
    }

    return {
        getState: () => currentState,
        subscribe: (listener: Listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        togglePlay: () => {
            currentState = { ...currentState, isPlaying: !currentState.isPlaying };
            notify();
        },
        setProgress: (p: number) => {
            currentState = { ...currentState, progress: p };
            notify();
        }
    };
}

// Get or create the global store
function getGlobalAudioStore(): AudioStore {
    if (typeof window === 'undefined') {
        // SSR: return a dummy store
        return createAudioStore();
    }

    if (!window.__AUDIO_STORE__) {
        window.__AUDIO_STORE__ = createAudioStore();
        console.log('[AudioState] Created global audio store');
    }

    return window.__AUDIO_STORE__;
}

// Start the simulation interval (only once globally)
function startSimulation() {
    if (typeof window === 'undefined') return;
    if (window.__AUDIO_INTERVAL__) return;

    window.__AUDIO_INTERVAL__ = true;
    console.log('[AudioState] Starting simulation interval');

    const store = getGlobalAudioStore();

    setInterval(() => {
        const state = store.getState();
        if (state.isPlaying) {
            store.setProgress((state.progress + 0.2) % 100);
        }
    }, 100);
}

// Export the global store
export const audioStore = getGlobalAudioStore();

// Start simulation on import (client-side only)
if (typeof window !== 'undefined') {
    startSimulation();
}
