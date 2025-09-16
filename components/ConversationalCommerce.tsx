"use client";

import { Button } from "@/components/ui/button";
import { useCallback, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConversation } from "@elevenlabs/react";
import { cn } from "@/lib/utils";
import { UIResourceRenderer } from "@mcp-ui/client";
import { ShoppingCart, Package, Terminal } from "lucide-react";

async function requestMicrophonePermission() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    return true;
  } catch (error) {
    console.error("Microphone permission denied:", error);
    return false;
  }
}

async function checkEnvironment() {
  try {
    const response = await fetch("/api/test-env");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking environment:", error);
    return null;
  }
}

async function getSignedUrl(): Promise<{
  signedUrl: string;
  isDemo?: boolean;
}> {
  try {
    console.log("Fetching signed URL...");
    const response = await fetch("/api/signed-url");

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      throw new Error(
        errorData.details ||
          errorData.error ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    if (!data.signedUrl) {
      throw new Error("No signed URL in response");
    }

    return { signedUrl: data.signedUrl, isDemo: data.isDemo };
  } catch (error) {
    console.error("Error in getSignedUrl:", error);
    throw error;
  }
}

export function ConversationalCommerce() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [mcpToolResult, setMcpToolResult] = useState<any>(null);

  useEffect(() => {
    checkEnvironment().then(setEnvStatus);
  }, []);

  const conversation = useConversation({
    mode: "webrtc",
    onConnect: () => {
      console.log("Connected to conversation");
      setError(null);
    },
    onDisconnect: () => {
      console.log("Disconnected from conversation");
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      if (isDemoMode) {
        setError(
          "Demo mode: This is a placeholder connection. Set up your AGENT_ID for real functionality."
        );
      } else {
        setError(`Conversation error: ${error.message || "Unknown error"}`);
      }
      setIsLoading(false);
    },
    onDebug: (debugInfo) => {
      console.log(
        "[v0] ElevenLabs onDebug callback triggered:",
        JSON.stringify(debugInfo, null, 2)
      );
      if (debugInfo.mcp_tool_call) {
        const uiResources = debugInfo.mcp_tool_call.result?.reduce(
          (acc: any, result: any) => {
            if (result.type === "resource") {
              return [...acc, result.resource];
            }
            return acc;
          },
          []
        );
        console.log("UI Resources:", uiResources);
        setMcpToolResult(uiResources);
      }
    },
    onMessage: (message) => {
      console.log("Message received:", message);
      console.log(
        "[v0] ElevenLabs message received:",
        JSON.stringify(message, null, 2)
      );
    },
  });

  async function startConversation() {
    try {
      setIsLoading(true);
      setError(null);

      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setError("Microphone permission is required for voice conversation");
        setIsLoading(false);
        return;
      }

      const { signedUrl, isDemo } = await getSignedUrl();

      if (isDemo) {
        setIsDemoMode(true);
        setError(
          "Demo mode: Using placeholder agent ID. Set up your AGENT_ID environment variable for real functionality."
        );
        setIsLoading(false);
        return;
      }

      await conversation.startSession({ signedUrl });
      setIsLoading(false);
    } catch (error) {
      console.error("Error starting conversation:", error);
      setError(
        error instanceof Error ? error.message : "Failed to start conversation"
      );
      setIsLoading(false);
    }
  }

  const stopConversation = useCallback(async () => {
    try {
      setIsLoading(true);
      await conversation.endSession();
      setError(null);
      setIsDemoMode(false);
    } catch (error) {
      console.error("Error stopping conversation:", error);
      setError(
        error instanceof Error ? error.message : "Failed to stop conversation"
      );
    } finally {
      setIsLoading(false);
    }
  }, [conversation]);

  const isConfigError =
    error?.includes("AGENT_ID") || error?.includes("ELEVENLABS_API_KEY");

  return (
    <div className="flex gap-6 w-full h-screen pt-16 p-6">
      {/* AI Shopping Assistant - Left Side */}
      <div className="flex flex-col w-96 flex-shrink-0">
        <Card className="rounded-3xl h-full">
          <CardContent className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-center text-2xl font-bold">
                {isDemoMode
                  ? "AI Shopping Assistant - Demo Mode"
                  : conversation.status === "connected"
                  ? conversation.isSpeaking
                    ? "Assistant is speaking"
                    : "Assistant is listening"
                  : "AI Shopping Assistant"}
              </CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-y-4 text-center items-center flex-grow justify-center">
              <div className="flex justify-center w-full">
                <div
                  className={cn(
                    "orb",
                    isDemoMode
                      ? "orb-inactive"
                      : conversation.status === "connected" &&
                        conversation.isSpeaking
                      ? "orb-active animate-orb"
                      : conversation.status === "connected"
                      ? "animate-orb-slow orb-inactive"
                      : "orb-inactive"
                  )}
                ></div>
              </div>

              {error && (
                <div
                  className={cn(
                    "text-sm p-3 rounded-md border max-w-md mx-auto text-left",
                    isDemoMode
                      ? "text-orange-600 bg-orange-50 border-orange-200"
                      : "text-red-500 bg-red-50 border-red-200"
                  )}
                >
                  <div className="font-medium mb-2">
                    {isDemoMode ? "Demo Mode:" : "Configuration Error:"}
                  </div>
                  <div className="mb-3">{error}</div>

                  {(isConfigError || isDemoMode) && (
                    <div className="text-xs text-gray-600 space-y-2">
                      <div>To enable full functionality:</div>
                      <div className="space-y-1">
                        <div>1. Get your API key from ElevenLabs</div>
                        <div>
                          2. Create a conversational AI agent and copy the Agent
                          ID
                        </div>
                        <div>
                          3. Set environment variables in your deployment
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4 w-full px-4">
                <Button
                  variant="outline"
                  className="rounded-full bg-transparent w-full"
                  size="lg"
                  disabled={
                    isLoading ||
                    (conversation !== null &&
                      conversation.status === "connected")
                  }
                  onClick={startConversation}
                >
                  {isLoading
                    ? "Starting..."
                    : isDemoMode
                    ? "Try Demo"
                    : "Start Shopping"}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full bg-transparent w-full"
                  size="lg"
                  disabled={isLoading || (conversation === null && !isDemoMode)}
                  onClick={stopConversation}
                >
                  {isLoading ? "Stopping..." : "End Session"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Product View - Right Side */}
      <div className="flex-1">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Interactive Product View</CardTitle>
          </CardHeader>
          <CardContent className="h-full overflow-hidden">
            {mcpToolResult && (
              <div className="hide-scrollbar flex gap-4 overflow-x-auto scroll-smooth h-full">
                {mcpToolResult.map((uiResource: any, index: number) => {
                  const height = 360;
                  const width = 230;

                  return (
                    <div
                      key={index}
                      className="flex-shrink-0 transform-gpu transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-5"
                      style={{
                        width: `${width}px`,
                        minHeight: `${height}px`,
                        animationDelay: `${index * 100}ms`,
                      }}
                    >
                      <div className="flex h-full flex-col">
                        <UIResourceRenderer
                          resource={{
                            uri: uiResource.uri,
                            mimeType: uiResource.mimeType,
                            text: uiResource.text,
                          }}
                          onUIAction={async (result) => {
                            console.log("Action:", result);
                          }}
                          htmlProps={{
                            autoResizeIframe: { width: true, height: true },
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
