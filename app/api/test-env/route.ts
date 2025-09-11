import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    hasAgentId: !!process.env.AGENT_ID,
    hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
    agentIdValue: process.env.AGENT_ID ? `${process.env.AGENT_ID.substring(0, 8)}...` : "not set",
    allEnvKeys: Object.keys(process.env).filter(
      (key) => key.includes("AGENT") || key.includes("ELEVEN") || key.includes("API"),
    ),
  })
}
