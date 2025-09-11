"use client"

import { Button } from "@/components/ui/button"
import { useCallback, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useConversation } from "@elevenlabs/react"
import { cn } from "@/lib/utils"
import { Code } from "@/components/Code"

async function requestMicrophonePermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true })
    return true
  } catch (error) {
    console.error("Microphone permission denied:", error)
    return false
  }
}

async function checkEnvironment() {
  try {
    const response = await fetch("/api/test-env")
    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error checking environment:", error)
    return null
  }
}

async function getSignedUrl(): Promise<{ signedUrl: string; isDemo?: boolean }> {
  try {
    console.log("Fetching signed URL...")
    const response = await fetch("/api/signed-url")

    console.log("Response status:", response.status)
    console.log("Response ok:", response.ok)

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
      }

      console.error("API response error:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
      })

      throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log("Successfully got signed URL")

    if (!data.signedUrl) {
      throw new Error("No signed URL in response")
    }

    return { signedUrl: data.signedUrl, isDemo: data.isDemo }
  } catch (error) {
    console.error("Error in getSignedUrl:", error)
    throw error
  }
}

export function ConvAI() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [envStatus, setEnvStatus] = useState<any>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    checkEnvironment().then(setEnvStatus)
  }, [])

  const conversation = useConversation({
    mode: "webrtc",
    onConnect: () => {
      console.log("Connected to conversation")
      setError(null)
    },
    onDisconnect: () => {
      console.log("Disconnected from conversation")
      setIsLoading(false)
    },
    onError: (error) => {
      console.error("Conversation error:", error)
      if (isDemoMode) {
        setError("Demo mode: This is a placeholder connection. Set up your AGENT_ID for real functionality.")
      } else {
        setError(`Conversation error: ${error.message || "Unknown error"}`)
      }
      setIsLoading(false)
    },
    onMessage: (message) => {
      console.log("Message received:", message)
    },
  })

  async function startConversation() {
    try {
      setIsLoading(true)
      setError(null)

      console.log("Requesting microphone permission...")
      const hasPermission = await requestMicrophonePermission()
      if (!hasPermission) {
        setError("Microphone permission is required for voice conversation")
        setIsLoading(false)
        return
      }

      console.log("Getting signed URL...")
      const { signedUrl, isDemo } = await getSignedUrl()

      if (isDemo) {
        setIsDemoMode(true)
        setError(
          "Demo mode: Using placeholder agent ID. Set up your AGENT_ID environment variable for real functionality.",
        )
        setIsLoading(false)
        return
      }

      console.log("Got signed URL, starting session...")
      await conversation.startSession({ signedUrl })
      console.log("Session started successfully")

      setIsLoading(false)
    } catch (error) {
      console.error("Error starting conversation:", error)
      setError(error instanceof Error ? error.message : "Failed to start conversation")
      setIsLoading(false)
    }
  }

  const stopConversation = useCallback(async () => {
    try {
      setIsLoading(true)
      await conversation.endSession()
      setError(null)
      setIsDemoMode(false)
    } catch (error) {
      console.error("Error stopping conversation:", error)
      setError(error instanceof Error ? error.message : "Failed to stop conversation")
    } finally {
      setIsLoading(false)
    }
  }, [conversation])

  // Check if error is related to missing environment variables
  const isConfigError = error?.includes("AGENT_ID") || error?.includes("ELEVENLABS_API_KEY")

  return (
    <div className={"flex justify-center items-center gap-x-4"}>
      <Card className={"rounded-3xl max-w-2xl"}>
        <CardContent>
          <CardHeader>
            <CardTitle className={"text-center text-2xl font-bold"}>
              {isDemoMode
                ? "ElevenLabs Agents - Demo Mode"
                : conversation.status === "connected"
                  ? conversation.isSpeaking
                    ? `Agent is speaking`
                    : "Agent is listening"
                  : "ElevenLabs Agents"}
            </CardTitle>
          </CardHeader>
          <div className={"flex flex-col gap-y-4 text-center items-center"}>
            <div className="flex justify-center w-full">
              <div
                className={cn(
                  "orb",
                  isDemoMode
                    ? "orb-inactive"
                    : conversation.status === "connected" && conversation.isSpeaking
                      ? "orb-active animate-orb"
                      : conversation.status === "connected"
                        ? "animate-orb-slow orb-inactive"
                        : "orb-inactive",
                )}
              ></div>
            </div>

            {/* Environment Status Debug Info */}
            {envStatus && (
              <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded border text-left w-full max-w-md">
                <div className="font-medium mb-1">Environment Status:</div>
                <div>Has AGENT_ID: {envStatus.hasAgentId ? "✅" : "❌ (using demo placeholder)"}</div>
                <div>Has ELEVENLABS_API_KEY: {envStatus.hasElevenLabsKey ? "✅" : "❌"}</div>
                <div>Agent ID: {envStatus.agentIdValue}</div>
                {envStatus.allEnvKeys.length > 0 && <div>Available env keys: {envStatus.allEnvKeys.join(", ")}</div>}
              </div>
            )}

            {error && (
              <div
                className={cn(
                  "text-sm p-3 rounded-md border max-w-md mx-auto text-left",
                  isDemoMode
                    ? "text-orange-600 bg-orange-50 border-orange-200"
                    : "text-red-500 bg-red-50 border-red-200",
                )}
              >
                <div className="font-medium mb-2">{isDemoMode ? "Demo Mode:" : "Configuration Error:"}</div>
                <div className="mb-3">{error}</div>

                {(isConfigError || isDemoMode) && (
                  <div className="text-xs text-gray-600 space-y-2">
                    <div>To enable full functionality:</div>
                    <div className="space-y-1">
                      <div>
                        1. Get your API key from{" "}
                        <a
                          href="https://elevenlabs.io"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          ElevenLabs
                        </a>
                      </div>
                      <div>2. Create a conversational AI agent and copy the Agent ID</div>
                      <div>3. Set environment variables in your deployment:</div>
                      <div className="ml-2 space-y-1">
                        <div>
                          <Code>ELEVENLABS_API_KEY=your_api_key</Code>
                        </div>
                        <div>
                          <Code>AGENT_ID=your_agent_id</Code>
                        </div>
                      </div>
                      <div className="mt-2 text-blue-600">💡 In Vercel: Project Settings → Environment Variables</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              variant={"outline"}
              className={"rounded-full"}
              size={"lg"}
              disabled={isLoading || (conversation !== null && conversation.status === "connected")}
              onClick={startConversation}
            >
              {isLoading ? "Starting..." : isDemoMode ? "Try Demo" : "Start conversation"}
            </Button>
            <Button
              variant={"outline"}
              className={"rounded-full"}
              size={"lg"}
              disabled={isLoading || (conversation === null && !isDemoMode)}
              onClick={stopConversation}
            >
              {isLoading ? "Stopping..." : "End conversation"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
