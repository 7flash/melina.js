'use client';

import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { island } from '../../../../src/island';
import { Link } from '../../../../src/Link';
import { audioStore } from './AudioState';

/**
 * Music Player Island
 * 
 * Renders ONE view based on current path.
 * Uses proper <Link> components for navigation (accessibility + SEO).
 * 
 * Critical: Uses flushSync on navigation-start to update SYNCHRONOUSLY
 * inside the View Transition callback for proper morphing.
 */
function MusicPlayerImpl() {
    const [pathname, setPathname] = useState('/');
    const [audioState, setAudioState] = useState(audioStore.getState());

    useEffect(() => {
        setPathname(window.location.pathname);

        const handleNavigationStart = (e: CustomEvent) => {
            flushSync(() => {
                setPathname(e.detail.to);
            });
        };

        const handlePopstate = () => {
            setPathname(window.location.pathname);
        };

        window.addEventListener('melina:navigation-start', handleNavigationStart as EventListener);
        window.addEventListener('popstate', handlePopstate);

        const unsub = audioStore.subscribe(setAudioState);

        return () => {
            window.removeEventListener('melina:navigation-start', handleNavigationStart as EventListener);
            window.removeEventListener('popstate', handlePopstate);
            unsub();
        };
    }, []);

    const isExpanded = pathname === '/player';

    // ========== FULL PLAYER VIEW ==========
    if (isExpanded) {
        return (
            <div style={{
                // @ts-ignore - view-transition-name for morphing
                viewTransitionName: 'music-player',
                maxWidth: '600px',
                margin: '0 auto',
                padding: '40px',
                background: '#1a1a1a',
                borderRadius: '24px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>
                <Link
                    href="/"
                    style={{
                        display: 'inline-block',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        marginBottom: '32px',
                        cursor: 'pointer',
                        textDecoration: 'none',
                    }}
                >
                    ↓ Minimize
                </Link>

                {/* Album Art */}
                <div style={{
                    // @ts-ignore
                    viewTransitionName: 'album-art',
                    width: '100%',
                    aspectRatio: '1/1',
                    borderRadius: '16px',
                    background: 'linear-gradient(45deg, #ff0055, #ff00aa)',
                    marginBottom: '32px',
                    boxShadow: '0 10px 40px rgba(255, 0, 85, 0.4)',
                }} />

                <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'white' }}>Midnight City</h1>
                <h2 style={{ fontSize: '20px', opacity: 0.7, marginBottom: '24px', color: 'white' }}>M83</h2>

                {/* Progress Bar */}
                <div style={{ marginBottom: '40px' }}>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: '#ff0055', width: `${audioState.progress}%`, transition: 'width 100ms linear' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.5, marginTop: '8px', color: 'white' }}>
                        <span>{Math.floor(audioState.progress / 100 * 240 / 60)}:{String(Math.floor(audioState.progress / 100 * 240 % 60)).padStart(2, '0')}</span>
                        <span>4:00</span>
                    </div>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '24px', color: 'white', cursor: 'pointer' }}>⏮</span>
                    <button
                        onClick={() => audioStore.togglePlay()}
                        style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'black',
                            fontSize: '24px',
                            cursor: 'pointer'
                        }}
                    >
                        {audioState.isPlaying ? '⏸' : '▶'}
                    </button>
                    <span style={{ fontSize: '24px', color: 'white', cursor: 'pointer' }}>⏭</span>
                </div>
            </div>
        );
    }

    // ========== MINI WIDGET VIEW ==========
    // Using Link as wrapper for the entire widget
    return (
        <Link
            href="/player"
            style={{
                // @ts-ignore
                viewTransitionName: 'music-player',
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: '300px',
                background: '#1a1a1a',
                color: 'white',
                borderRadius: '16px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                textDecoration: 'none',
            }}
        >
            {/* Album Art */}
            <div style={{
                // @ts-ignore
                viewTransitionName: 'album-art',
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: 'linear-gradient(45deg, #ff0055, #ff00aa)',
                flexShrink: 0,
            }} />

            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Midnight City</div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>M83</div>
                <div style={{ marginTop: '8px', height: '3px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#ff0055', width: `${audioState.progress}%` }} />
                </div>
            </div>

            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); audioStore.togglePlay(); }}
                style={{
                    background: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                }}
            >
                {audioState.isPlaying ? '⏸' : '▶'}
            </button>
        </Link>
    );
}

// Export the island-wrapped version
export const MusicPlayer = island(MusicPlayerImpl, 'MusicPlayer');
