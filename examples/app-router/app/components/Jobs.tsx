'use client';

import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { island } from '../../../../src/island';
import { Link, clientNavigate } from '../../../../src/Link';

/**
 * Simple Event Bus for cross-island communication
 */
const eventBus = {
    emit(event: string, data: any) {
        window.dispatchEvent(new CustomEvent(`melina:${event}`, { detail: data }));
        if (typeof localStorage !== 'undefined') {
            const key = `melina_bus_${event}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push({ ...data, timestamp: Date.now() });
            localStorage.setItem(key, JSON.stringify(existing));
        }
    },
    on(event: string, callback: (data: any) => void) {
        const handler = (e: CustomEvent) => callback(e.detail);
        window.addEventListener(`melina:${event}`, handler as EventListener);
        return () => window.removeEventListener(`melina:${event}`, handler as EventListener);
    },
    getAll(event: string): any[] {
        if (typeof localStorage === 'undefined') return [];
        return JSON.parse(localStorage.getItem(`melina_bus_${event}`) || '[]');
    },
    clear(event: string) {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(`melina_bus_${event}`);
        }
    }
};

// Export for use in other islands
if (typeof window !== 'undefined') {
    (window as any).__MELINA_BUS__ = eventBus;
}

export interface Job {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    timestamp: number;
}

/**
 * JobSubmit Implementation
 */
function JobSubmitImpl() {
    const [jobName, setJobName] = useState('');

    const submitJob = () => {
        if (!jobName.trim()) return;

        const job: Job = {
            id: Math.random().toString(36).substr(2, 9),
            name: jobName,
            status: 'pending',
            timestamp: Date.now()
        };

        eventBus.emit('job:created', job);
        setJobName('');

        // Simulate job progress
        setTimeout(() => {
            eventBus.emit('job:updated', { ...job, status: 'running' });
        }, 1000);

        setTimeout(() => {
            eventBus.emit('job:updated', { ...job, status: 'completed' });
        }, 3000);
    };

    return (
        <div style={{
            padding: '1rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px',
            color: 'white'
        }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>🚀 Submit a Job</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="Enter job name..."
                    onKeyDown={(e) => e.key === 'Enter' && submitJob()}
                    style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '14px'
                    }}
                />
                <button
                    onClick={submitJob}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'white',
                        color: '#667eea',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Submit
                </button>
            </div>
        </div>
    );
}

/**
 * JobTracker Implementation
 * 
 * This island AUTO-DETECTS its display mode based on the current URL:
 * - On any page: Compact floating widget in corner
 * - On /jobs page: Full page expanded view
 * 
 * The magic: When you navigate to /jobs, the SAME React root just
 * re-renders with a different layout. No remounting, state preserved!
 * View Transitions API morphs the widget into the expanded view.
 */
function JobTrackerImpl() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const [currentPath, setCurrentPath] = useState('/');

    // Track current path for navigation logic
    // Use flushSync for synchronous updates during View Transitions
    useEffect(() => {
        setCurrentPath(window.location.pathname);

        // Use flushSync for immediate synchronous state update
        // This is critical for View Transitions to work correctly
        const startHandler = (e: CustomEvent) => {
            flushSync(() => {
                setCurrentPath(e.detail.to);
            });
        };

        // Also listen to completed navigation (for back button, etc.)
        const endHandler = () => {
            flushSync(() => {
                setCurrentPath(window.location.pathname);
            });
        };

        window.addEventListener('melina:navigation-start', startHandler as EventListener);
        window.addEventListener('melina:navigated', endHandler);
        window.addEventListener('popstate', endHandler);

        return () => {
            window.removeEventListener('melina:navigation-start', startHandler as EventListener);
            window.removeEventListener('melina:navigated', endHandler);
            window.removeEventListener('popstate', endHandler);
        };
    }, []);

    useEffect(() => {
        // Load existing jobs on mount
        const existingJobs = eventBus.getAll('job:created');
        const updates = eventBus.getAll('job:updated');

        const jobMap = new Map<string, Job>();
        existingJobs.forEach(j => jobMap.set(j.id, j));
        updates.forEach(u => {
            if (jobMap.has(u.id)) {
                jobMap.set(u.id, { ...jobMap.get(u.id)!, ...u });
            }
        });

        setJobs(Array.from(jobMap.values()));

        const unsubCreate = eventBus.on('job:created', (job: Job) => {
            setJobs(prev => [...prev, job]);
        });

        const unsubUpdate = eventBus.on('job:updated', (update: Partial<Job> & { id: string }) => {
            setJobs(prev => prev.map(j =>
                j.id === update.id ? { ...j, ...update } : j
            ));
        });

        return () => {
            unsubCreate();
            unsubUpdate();
        };
    }, []);

    const clearCompleted = () => {
        setJobs(prev => prev.filter(j => j.status !== 'completed'));
        eventBus.clear('job:created');
        eventBus.clear('job:updated');
    };

    const navigateToJobs = () => {
        // Use the global navigate function if available
        const nav = (window as any).__melina_navigate__;
        if (nav) {
            nav('/jobs');
        } else {
            window.location.href = '/jobs';
        }
    };

    const navigateBack = () => {
        // Use client navigation instead of history.back()
        // This ensures proper View Transitions and works on fresh /jobs load
        clientNavigate('/');
    };

    const statusColors = {
        pending: '#f0ad4e',
        running: '#5bc0de',
        completed: '#5cb85c',
        failed: '#d9534f'
    };

    // When on /jobs, the layout's JobTracker hides completely
    // The jobs page will render its own expanded view
    if (currentPath === '/jobs') {
        return null;
    }

    // COMPACT MODE - Floating widget (on all pages except /jobs)
    if (jobs.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: isMinimized ? '60px' : '320px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            transition: 'width 0.3s ease',
            zIndex: 1000,
            // @ts-ignore - View Transitions API
            viewTransitionName: 'jobs-widget'
        }}>
            <div
                onClick={() => setIsMinimized(!isMinimized)}
                style={{
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    // @ts-ignore - View Transitions API
                    viewTransitionName: 'jobs-title'
                }}
            >
                <span>📋 Jobs ({jobs.length})</span>
                <span>{isMinimized ? '◀' : '▼'}</span>
            </div>

            {!isMinimized && (
                <div>
                    <div style={{ maxHeight: '150px', overflow: 'auto' }}>
                        {jobs.slice(-3).map(job => (
                            <div
                                key={job.id}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderBottom: '1px solid #eee',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span style={{ fontSize: '14px' }}>{job.name}</span>
                                <span style={{
                                    fontSize: '12px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: statusColors[job.status],
                                    color: 'white'
                                }}>
                                    {job.status}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* VIEW ALL JOBS BUTTON */}
                    <button
                        onClick={navigateToJobs}
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: 'none',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}
                    >
                        View All Jobs →
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * JobsPageView - Full page view for /jobs route
 * This is rendered directly by the jobs page, not the layout
 */
function JobsPageViewImpl() {
    const [jobs, setJobs] = useState<Job[]>([]);

    const statusColors = {
        pending: '#f0ad4e',
        running: '#5bc0de',
        completed: '#5cb85c',
        failed: '#d9534f'
    };

    const navigateBack = () => {
        clientNavigate('/');
    };

    const clearCompleted = () => {
        setJobs(prev => prev.filter(j => j.status !== 'completed'));
        eventBus.clear('job:created');
        eventBus.clear('job:updated');
    };

    useEffect(() => {
        // Load existing jobs on mount
        const existingJobs = eventBus.getAll('job:created');
        const updates = eventBus.getAll('job:updated');

        const jobMap = new Map<string, Job>();
        existingJobs.forEach(j => jobMap.set(j.id, j));
        updates.forEach(u => {
            if (jobMap.has(u.id)) {
                jobMap.set(u.id, { ...jobMap.get(u.id)!, ...u });
            }
        });

        setJobs(Array.from(jobMap.values()));

        const unsubCreate = eventBus.on('job:created', (job: Job) => {
            setJobs(prev => [...prev, job]);
        });

        const unsubUpdate = eventBus.on('job:updated', (update: Partial<Job> & { id: string }) => {
            setJobs(prev => prev.map(j =>
                j.id === update.id ? { ...j, ...update } : j
            ));
        });

        return () => {
            unsubCreate();
            unsubUpdate();
        };
    }, []);

    return (
        <div style={{
            padding: '1rem 0',
            maxWidth: '800px',
            margin: '0 auto'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem'
            }}>
                <h1 style={{
                    margin: 0,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontSize: '2rem',
                    // @ts-ignore - View Transitions API
                    viewTransitionName: 'jobs-title'
                }}>
                    📋 All Jobs ({jobs.length})
                </h1>
                <button
                    onClick={navigateBack}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        border: '2px solid #667eea',
                        background: 'transparent',
                        color: '#667eea',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    ← Back
                </button>
            </div>

            {jobs.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    color: '#6c757d'
                }}>
                    <p style={{ fontSize: '1.2rem' }}>No jobs yet!</p>
                    <p>Submit a job from the home page to see it here.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {jobs.map(job => (
                        <div
                            key={job.id}
                            style={{
                                padding: '1.5rem',
                                background: 'white',
                                borderRadius: '12px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderLeft: `4px solid ${statusColors[job.status]}`
                            }}
                        >
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem 0' }}>{job.name}</h3>
                                <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                                    Created: {new Date(job.timestamp).toLocaleString()}
                                </p>
                            </div>
                            <span style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '20px',
                                background: statusColors[job.status],
                                color: 'white',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                fontSize: '12px'
                            }}>
                                {job.status}
                            </span>
                        </div>
                    ))}

                    <button
                        onClick={clearCompleted}
                        style={{
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '2px dashed #dee2e6',
                            background: 'transparent',
                            color: '#6c757d',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        🗑️ Clear Completed Jobs
                    </button>
                </div>
            )}
        </div>
    );
}

/**
 * Island-wrapped exports
 */
export const JobSubmit = island(JobSubmitImpl, 'JobSubmit');
export const JobTracker = island(JobTrackerImpl, 'JobTracker');
export const JobsPageView = island(JobsPageViewImpl, 'JobsPageView');

// LayoutJobTracker is just an alias for the layout
export const LayoutJobTracker = JobTracker;