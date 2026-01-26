import { MusicPlayer } from '../components/MusicPlayer';

export default function PlayerPage() {
    return (
        <div style={{ padding: '20px' }}>
            {/* Same MusicPlayer island - Hangar migrates it from home page, no remount */}
            <MusicPlayer />
        </div>
    );
}
