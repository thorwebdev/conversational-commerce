import { NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const revalidate = 0;

export async function GET() {
  try {
    // Use the AGENT_ID from environment, or fall back to a placeholder for demo
    let agentId = process.env.AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    // For demonstration purposes, use a placeholder if AGENT_ID is not set
    if (!agentId) {
      console.warn(
        "AGENT_ID not found in environment, using placeholder for demo"
      );
      // This is a placeholder - you'll need to replace this with your actual agent ID
      agentId = "demo-agent-id-placeholder";
    }

    console.log("Environment check:", {
      hasAgentId: !!process.env.AGENT_ID,
      usingPlaceholder: !process.env.AGENT_ID,
      hasApiKey: !!apiKey,
      agentId: agentId ? `${agentId.substring(0, 8)}...` : "undefined",
      nodeEnv: process.env.NODE_ENV,
    });

    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY environment variable is not set");
      return NextResponse.json(
        {
          error: "ELEVENLABS_API_KEY is not configured",
          details:
            "Please set the ELEVENLABS_API_KEY environment variable with your ElevenLabs API key.",
        },
        { status: 400 }
      );
    }

    // If using placeholder, return a mock response for demo
    if (agentId === "demo-agent-id-placeholder") {
      console.log("Returning demo conversation token (not functional)");
      return NextResponse.json({
        conversationToken: "demo-token-placeholder",
        isDemo: true,
      });
    }

    console.log("Making request to ElevenLabs using SDK...");

    // Initialize ElevenLabs client
    const client = new ElevenLabsClient({
      apiKey: apiKey,
    });

    // Use SDK method to get WebRTC token
    const response = await client.conversationalAi.conversations.getWebrtcToken(
      {
        agentId: agentId,
      }
    );

    console.log("Successfully got WebRTC token from ElevenLabs SDK");

    return NextResponse.json({ conversationToken: response.token });
  } catch (error) {
    console.error("Detailed error in signed-url route:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
