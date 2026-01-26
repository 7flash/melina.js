import { MusicPlayer } from './components/MusicPlayer';

export default function HomePage() {
    return (
        <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
            <h1>🎵 Melina Music</h1>
            <p style={{ opacity: 0.7, fontSize: '1.2rem' }}>
                This demo uses <strong>Persistent Portals</strong> for true state persistence.
                The MusicPlayer is placed on each page but the Hangar runtime moves (not remounts)
                the React root during navigation, preserving all state.
            </p>

            <div style={{
                marginTop: '40px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '20px'
            }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} style={{
                        aspectRatio: '1/1',
                        background: '#333',
                        borderRadius: '12px'
                    }} />
                ))}
            </div>

            {/* MusicPlayer island - renders as mini widget on home page */}
            <MusicPlayer />
        </div>
    );
}
