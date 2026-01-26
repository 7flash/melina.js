/**
 * API Route - Server Only
 * 
 * This route handler runs exclusively on the server.
 * It can access databases, file system, secrets, etc.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(req: Request, { params }: { params: Record<string, string> }) {
    // We can read from file system here - proving this is server-side
    const serverTime = new Date().toISOString();
    const hostname = process.env.HOSTNAME || 'localhost';

    return Response.json({
        message: 'Hello from Melina API!',
        serverTime,
        hostname,
        method: 'GET',
        info: 'This response was generated on the server with full Node.js capabilities.'
    });
}

export async function POST(req: Request, { params }: { params: Record<string, string> }) {
    const body = await req.json().catch(() => ({}));

    return Response.json({
        message: 'POST received!',
        receivedData: body,
        serverTime: new Date().toISOString()
    });
}
