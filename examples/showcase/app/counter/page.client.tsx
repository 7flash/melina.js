import { render } from 'melina/client';
import { createMachine, createActor, assign } from 'xstate';

// ─── State Machine ────────────────────────────────────────
const counterMachine = createMachine({
    id: 'counter',
    context: { count: 0 },
    on: {
        INC: { actions: assign({ count: ({ context }: any) => context.count + 1 }) },
        DEC: { actions: assign({ count: ({ context }: any) => Math.max(0, context.count - 1) }) },
        RESET: { actions: assign({ count: 0 }) },
        SET: { actions: assign({ count: (_: any, event: any) => event.value ?? 0 }) },
    }
});

// ─── Counter Component ────────────────────────────────────
function Counter({ count, send }: { count: number; send: any }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '4rem', fontWeight: '700', color: 'white', fontFamily: 'var(--font-mono)' }}>
                {count}
            </div>
            <div className="btn-group">
                <button className="btn" onClick={() => send({ type: 'DEC' })}>− 1</button>
                <button className="btn btn-accent" onClick={() => send({ type: 'INC' })}>+ 1</button>
                <button className="btn" onClick={() => send({ type: 'RESET' })}>Reset</button>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                State machine transitions: {count} → render() → VDOM diff → DOM patch
            </div>
        </div>
    );
}

// ─── Mount ────────────────────────────────────────────────
export default function mount() {
    const counterRoot = document.getElementById('counter-root');
    const lifecycleRoot = document.getElementById('lifecycle-root');

    // Counter
    if (counterRoot) {
        const actor = createActor(counterMachine);
        actor.subscribe((snapshot) => {
            render(<Counter count={snapshot.context.count} send={actor.send} />, counterRoot);
        });
        actor.start();
    }

    // Lifecycle demo
    const mountTime = new Date().toLocaleTimeString();
    if (lifecycleRoot) {
        render(
            <div>
                <div className="stat-row">
                    <span className="stat-label">mount() called</span>
                    <span className="stat-value" style={{ color: 'var(--color-success)' }}>{mountTime}</span>
                </div>
                <div className="stat-row">
                    <span className="stat-label">Status</span>
                    <span className="stat-value" style={{ color: 'var(--color-success)' }}>✓ Active</span>
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                    Navigate away and back to see a fresh mount time (cleanup runs on leave).
                </div>
            </div>,
            lifecycleRoot
        );
    }

    // Cleanup
    return () => {
        if (counterRoot) render(null, counterRoot);
        if (lifecycleRoot) render(null, lifecycleRoot);
        console.log('[Counter] cleanup — actor stopped');
    };
}
