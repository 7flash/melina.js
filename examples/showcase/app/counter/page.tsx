export default function CounterPage() {
    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <h1 className="page-title">Client Interactivity</h1>
                    <span className="badge badge-client">Client Mount</span>
                </div>
                <p className="page-description">
                    XState state machines drive <code className="code-inline">render()</code> calls.
                    The counter below is entirely client-side — the server only provides the container.
                </p>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">🔢 XState Counter</h3>
                <p className="demo-card-description">
                    A state machine manages count. On each transition, <code className="code-inline">render()</code> diffs
                    the VDOM and patches only changed DOM nodes.
                </p>
                <div id="counter-root" className="result-box" style={{ textAlign: 'center', padding: '32px' }}>
                    <span style={{ color: 'var(--color-muted)' }}>Loading client script...</span>
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">⏱️ Lifecycle</h3>
                <p className="demo-card-description">
                    Mount scripts export a default function that returns a cleanup function.
                </p>
                <div id="lifecycle-root" className="result-box">
                    <span style={{ color: 'var(--color-muted)' }}>Waiting for mount...</span>
                </div>
            </div>

            <div className="demo-card">
                <h3 className="demo-card-title">📝 How It Works</h3>
                <div className="code-block">{`// page.client.tsx
import { render } from 'melina/client';
import { createMachine, createActor, assign } from 'xstate';

const machine = createMachine({
    context: { count: 0 },
    on: {
        INC: { actions: assign({ count: ({ context }) => context.count + 1 }) },
        DEC: { actions: assign({ count: ({ context }) => context.count - 1 }) },
        RESET: { actions: assign({ count: 0 }) },
    }
});

export default function mount() {
    const actor = createActor(machine);
    actor.subscribe(snap => {
        render(<Counter count={snap.context.count} send={actor.send} />, root);
    });
    actor.start();
    return () => actor.stop();  // cleanup on navigate away
}`}</div>
            </div>
        </div>
    );
}
