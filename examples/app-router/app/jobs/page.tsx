// Server Component - renders the JobsPageView island
import { JobsPageView } from '../components/Jobs';

/**
 * Jobs Page - renders the full jobs view
 * The layout's JobTracker widget automatically hides on this route
 */
export default function JobsPage() {
    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            // @ts-ignore - View Transitions API
            viewTransitionName: 'jobs-widget'
        }}>
            <JobsPageView />
        </div>
    );
}
