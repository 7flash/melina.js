// Dashboard page client — no extra logic needed.
// Navigation is handled globally by layout.client.tsx via data-link attributes.
export default function mount() {
    // Dashboard cards use <a data-link href="/agent/..."> which are
    // intercepted by the global layout click handler.
}
