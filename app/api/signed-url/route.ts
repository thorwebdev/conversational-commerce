import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Use the AGENT_ID from environment, or fall back to a placeholder for demo
    let agentId = process.env.AGENT_ID
    const apiKey = process.env.ELEVENLABS_API_KEY

    // For demonstration purposes, use a placeholder if AGENT_ID is not set
    if (!agentId) {
      console.warn("AGENT_ID not found in environment, using placeholder for demo")
      // This is a placeholder - you'll need to replace this with your actual agent ID
      agentId = "demo-agent-id-placeholder"
    }

    console.log("Environment check:", {
      hasAgentId: !!process.env.AGENT_ID,
      usingPlaceholder: !process.env.AGENT_ID,
      hasApiKey: !!apiKey,
      agentId: agentId ? `${agentId.substring(0, 8)}...` : "undefined",
      nodeEnv: process.env.NODE_ENV,
    })

    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY environment variable is not set")
      return NextResponse.json(
        {
          error: "ELEVENLABS_API_KEY is not configured",
          details: "Please set the ELEVENLABS_API_KEY environment variable with your ElevenLabs API key.",
        },
        { status: 400 },
      )
    }

    // If using placeholder, return a mock response for demo
    if (agentId === "demo-agent-id-placeholder") {
      console.log("Returning demo signed URL (not functional)")
      return NextResponse.json({
        signedUrl: "wss://demo-signed-url-placeholder.elevenlabs.io/conversation",
        isDemo: true,
      })
    }

    console.log("Making request to ElevenLabs API...")

    // Use direct fetch to ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
      },
    )

    console.log("ElevenLabs API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("ElevenLabs API error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      })

      return NextResponse.json(
        {
          error: `ElevenLabs API error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("Successfully got signed URL from ElevenLabs")

    return NextResponse.json({ signedUrl: data.signed_url })
  } catch (error) {
    console.error("Detailed error in signed-url route:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    })

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
