export default function RootLayout({ children }: { children: any }) {
    return (
        <html lang="en" className="dark">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Agent Interface</title>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
            </head>
            <body className="bg-background text-foreground antialiased overflow-hidden">
                {children}
                <div id="global-widget" className="fixed bottom-6 right-6 z-50 pointer-events-none" />
            </body>
        </html>
    );
}
