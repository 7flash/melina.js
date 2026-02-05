// Simple MCP client for testing
import { randomUUID } from "crypto";
import { measure } from '@ments/utils';

const SERVER_URL = "http://localhost:3000/mcp";

// Helper function to send MCP requests
async function sendRequest(method: string, params?: any) {
  const id = `client-${randomUUID().slice(0, 8)}`;
  const request = {
    jsonrpc: "2.0",
    id,
    method,
    params
  };

  measure(() => `Sending request: ${JSON.stringify(request, null, 2)}`, 'MCP Request');

  const response = await fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  if (response.status === 202) {
    measure(() => "Server accepted notification (202)", 'MCP Notification');
    return null;
  }

  const data = await response.json();
  measure(() => `Received response: ${JSON.stringify(data, null, 2)}`, 'MCP Response');
  return data.result;
}

// Helper function to send MCP notifications
async function sendNotification(method: string, params?: any) {
  const notification = {
    jsonrpc: "2.0",
    method,
    params
  };

  measure(() => `Sending notification: ${JSON.stringify(notification, null, 2)}`, 'MCP Notification');

  const response = await fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(notification)
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  measure(() => `Notification accepted (${response.status})`, 'MCP Notification');
}

// Run a test sequence
async function runTest() {
  try {
    // Initialize
    measure(() => "--- Initializing MCP connection ---", 'MCP Test');
    const initResult = await sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "MCPExampleClient",
        version: "1.0.0"
      }
    });

    measure(() => "--- Sending initialized notification ---", 'MCP Test');
    await sendNotification("notifications/initialized");

    // List tools
    measure(() => "\n--- Listing available tools ---", 'MCP Test');
    const toolsResult = await sendRequest("tools/list");

    // Call a tool
    measure(() => "\n--- Calling weather tool ---", 'MCP Test');
    const toolResult = await sendRequest("tools/call", {
      name: "get_weather",
      arguments: {
        location: "San Francisco"
      }
    });

    // List prompts
    measure(() => "\n--- Listing available prompts ---", 'MCP Test');
    const promptsResult = await sendRequest("prompts/list");

    // Get a prompt
    measure(() => "\n--- Getting greeting prompt ---", 'MCP Test');
    const promptResult = await sendRequest("prompts/get", {
      name: "greeting-template",
      arguments: {
        name: "Claude"
      }
    });

    // List resources
    measure(() => "\n--- Listing available resources ---", 'MCP Test');
    const resourcesResult = await sendRequest("resources/list");

    // Read a resource
    measure(() => "\n--- Reading a resource ---", 'MCP Test');
    const resourceResult = await sendRequest("resources/read", {
      uri: "https://example.com/documentation/overview"
    });

    // Read a template resource
    measure(() => "\n--- Reading a template resource ---", 'MCP Test');
    const templateResourceResult = await sendRequest("resources/read", {
      uri: "https://example.com/users/1"
    });

    measure(() => "\n--- Test completed successfully ---", 'MCP Test');
  } catch (error) {
    measure(() => `Test failed: ${error}`, 'MCP Test Error');
  }
}

// Run the test
runTest();