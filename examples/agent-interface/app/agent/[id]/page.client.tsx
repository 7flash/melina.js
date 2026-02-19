// Agent detail page client script
// Navigation is handled globally by layout.client.tsx, no need to duplicate here.
export default function mount({ params }: { params: { id: string } }) {
    console.log(`[Agent Detail] Mounted for agent: ${params?.id}`);
}
