/**
 * Messages API Route - Server-Sent Events
 * 
 * Pushes new messages to connected clients every 3-7 seconds
 */

const contacts = [
    { id: 1, name: 'Emma Watson', avatar: 'EW' },
    { id: 2, name: 'Liam Chen', avatar: 'LC' },
    { id: 3, name: 'Sophia Kim', avatar: 'SK' },
    { id: 4, name: 'Noah Williams', avatar: 'NW' },
    { id: 5, name: 'Olivia Brown', avatar: 'OB' },
    { id: 6, name: 'Mason Davis', avatar: 'MD' },
    { id: 7, name: 'Ava Martinez', avatar: 'AM' },
    { id: 8, name: 'Ethan Garcia', avatar: 'EG' },
];

const messageTemplates = [
    "Hey! Just checking in 👋",
    "Did you see the latest changes?",
    "This is working great! 🎉",
    "Can you review when you get a chance?",
    "Quick question about the API...",
    "Love the new UI!",
    "The performance is incredible",
    "Just deployed to production",
    "Meeting in 5!",
    "Great work on this feature",
    "How's it going?",
    "Need help with something",
    "🚀🚀🚀",
    "This is so smooth!",
    "The server-first approach is genius",
    "Shipped the fix!",
    "Looking good!",
    "Almost done with the PR",
    "Tests are passing ✅",
    "Ready for review",
];

export async function GET(req: Request) {
    const encoder = new TextEncoder();
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const stream = new ReadableStream({
        start(controller) {
            const sendMessage = () => {
                if (cancelled) return;

                const contact = contacts[Math.floor(Math.random() * contacts.length)];
                const text = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

                const message = {
                    id: Date.now(),
                    contactId: contact.id,
                    contactName: contact.name,
                    contactAvatar: contact.avatar,
                    text,
                    timestamp: new Date().toISOString(),
                };

                try {
                    const data = `data: ${JSON.stringify(message)}\n\n`;
                    controller.enqueue(encoder.encode(data));
                } catch (e) {
                    // Controller might be closed
                    cancelled = true;
                    if (intervalId) clearInterval(intervalId);
                }
            };

            // Send first message immediately
            sendMessage();

            // Send at regular interval (4 seconds)
            intervalId = setInterval(sendMessage, 4000);
        },
        cancel() {
            cancelled = true;
            if (intervalId) clearInterval(intervalId);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
