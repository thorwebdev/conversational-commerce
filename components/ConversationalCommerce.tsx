"use client";

import { Button } from "@/components/ui/button";
import { ConversationButton } from "@/components/ConversationButton";
import { Orb } from "@/components/Orb";
import { useCallback, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConversation } from "@elevenlabs/react";
import { cn } from "@/lib/utils";
import { UIResourceRenderer } from "@mcp-ui/client";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ElevenLabsLogo, GithubLogo } from "@/components/logos";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

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

type ViewState = "initial" | "listening" | "results";

export function ConversationalCommerce() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [mcpToolResult, setMcpToolResult] = useState<any>(null);
  const [viewState, setViewState] = useState<ViewState>("initial");
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [volumeLevel, setVolumeLevel] = useState(0);

  useEffect(() => {
    checkEnvironment().then(setEnvStatus);
  }, []);

  const conversation = useConversation({
    mode: "webrtc",
    clientTools: {
      redirect_to_checkout: async ({ url }: { url: string }) => {
        console.log("Redirecting to checkout:", url);
        // Open in new tab/window for better UX
        window.open(url, "_blank", "noopener,noreferrer");
        return "Redirected to checkout successfully";
      },
      open_cart: async () => {
        console.log("Opening cart");
        // This would typically open a cart modal or navigate to cart page
        // For now, we'll just log it and let the AI handle the conversation
        return "Cart opened successfully";
      },
      add_to_cart: async ({
        productId,
        quantity = 1,
      }: {
        productId: string;
        quantity?: number;
      }) => {
        console.log(`Adding to cart: ${productId} x${quantity}`);
        // This would typically add the item to the cart
        // For now, we'll just log it and let the AI handle the conversation
        return `Added ${quantity} item(s) to cart`;
      },
    },
    onConnect: () => {
      console.log("Connected to conversation");
      setError(null);
      setViewState("listening");
    },
    onDisconnect: () => {
      console.log("Disconnected from conversation");
      setIsLoading(false);
      setViewState("initial");
      setMcpToolResult(null);
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
        if (uiResources && uiResources.length > 0) {
          setViewState("results");
        }
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

  // Check for pending prompts when returning from detail page
  useEffect(() => {
    const pendingPrompt = sessionStorage.getItem("pendingPrompt");
    if (pendingPrompt && conversation.status === "connected") {
      conversation.sendUserMessage(pendingPrompt);
      sessionStorage.removeItem("pendingPrompt");
    }
  }, [conversation.status]);

  // Update volume level from audio frequency data
  useEffect(() => {
    if (conversation.status !== "connected") return;

    const updateVolume = () => {
      try {
        const frequencyData = conversation.getOutputByteFrequencyData();
        if (frequencyData && frequencyData.length > 0) {
          // Calculate average volume from frequency data
          const sum = frequencyData.reduce((a, b) => a + b, 0);
          const average = sum / frequencyData.length;
          // Normalize to 0-1 range (frequencyData values are 0-255)
          const normalized = average / 255;
          setVolumeLevel(normalized);
        }
      } catch (error) {
        // Silently handle if method not available
      }
    };

    const intervalId = setInterval(updateVolume, 50); // Update every 50ms

    return () => clearInterval(intervalId);
  }, [conversation.status]);

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
      setViewState("initial");
      setMcpToolResult(null);
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
    <div className="w-full h-screen flex flex-col bg-white">
      {/* Global Header - Always present but title opacity changes */}
      <header className="sticky top-0 z-50 bg-white">
        <nav className="w-full grid grid-cols-2 px-14 py-5">
          <div className="flex">
            <Link href="/" prefetch={true}>
              <ElevenLabsLogo className="h-[15px] w-auto hover:text-gray-500" />
            </Link>
          </div>

          <div className="flex gap-4 justify-end">
            <Link
              href="https://github.com/thorwebdev/conversational-commerce"
              target="_blank"
              rel="noopener noreferrer"
              className="py-0.5"
              aria-label="View source on GitHub"
            >
              <GithubLogo className="w-5 h-5 hover:text-gray-500 text-[#24292f]" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-start overflow-auto">
        <AnimatePresence mode="wait">
          {/* Initial State */}
          {viewState === "initial" && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl mx-auto px-8"
            >
              <div className="flex flex-col items-center text-center space-y-8">
                {/* Title */}
                <h1 className="text-5xl font-light tracking-tight">
                  Eleven Shopping
                </h1>

                {/* Orb */}
                <div className="py-12">
                  <Orb size="large" />
                </div>

                {/* Description */}
                <p className="text-gray-600 max-w-md text-md">
                  Your personal AI shopping assistant for any Shopify store.
                  Just describe the product you want, by name, style, or
                  details, and I'll find it for you.
                </p>

                {/* Button */}
                <ConversationButton
                  onClick={startConversation}
                  disabled={conversation.status === "connected"}
                  isLoading={isLoading}
                  loadingText="Starting..."
                >
                  Start shopping
                </ConversationButton>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    className={cn(
                      "text-sm p-4 rounded-lg max-w-md",
                      isDemoMode
                        ? "text-orange-600 bg-orange-50 border border-orange-200"
                        : "text-red-500 bg-red-50 border border-red-200"
                    )}
                  >
                    <div className="font-medium mb-2">
                      {isDemoMode ? "Demo Mode" : "Configuration Error"}
                    </div>
                    <div className="mb-3">{error}</div>
                    {(isConfigError || isDemoMode) && (
                      <div className="text-xs text-gray-600 space-y-2">
                        <div>To enable full functionality:</div>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Get your API key from ElevenLabs</li>
                          <li>
                            Create a conversational AI agent and copy the Agent
                            ID
                          </li>
                          <li>Set environment variables in your deployment</li>
                        </ol>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Listening State */}
          {viewState === "listening" && !mcpToolResult && (
            <motion.div
              key="listening"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-2xl mx-auto px-8"
            >
              <div className="flex flex-col items-center text-center space-y-8">
                {/* Animated Orb */}
                <div className="py-12">
                  <Orb
                    size="large"
                    isAnimated={true}
                    isSpeaking={conversation.isSpeaking}
                    volumeLevel={volumeLevel}
                  />
                </div>

                {/* Status Text */}
                <motion.p
                  initial={{ opacity: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  className="text-gray-400 text-4xl font-light tracking-tight pb-4"
                >
                  {conversation.isSpeaking ? "Speaking..." : "Listening..."}
                </motion.p>

                {/* End Call Button */}
                <ConversationButton
                  onClick={stopConversation}
                  isLoading={isLoading}
                  loadingText="Ending..."
                >
                  End call
                </ConversationButton>
              </div>
            </motion.div>
          )}

          {/* Results State */}
          {viewState === "results" && mcpToolResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, filter: "blur(10px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="w-full mb-[5vh]"
            >
              <div className="w-full">
                {/* Compact header row with avatar, status, and end call button */}
                <div className="flex items-center justify-between mb-9 px-14">
                  <div className="flex items-center gap-4">
                    {/* Small conversation orb */}
                    <Orb
                      size="small"
                      isAnimated={true}
                      isSpeaking={conversation.isSpeaking}
                      volumeLevel={volumeLevel}
                    />
                    <span className="text-gray-500 text-2xl font-light tracking-tight">
                      {conversation.isSpeaking ? "Speaking..." : "Listening..."}
                    </span>
                  </div>

                  <ConversationButton
                    onClick={stopConversation}
                    isLoading={isLoading}
                    loadingText="Ending..."
                  >
                    End call
                  </ConversationButton>
                </div>

                <div>
                  {/* Product Cards */}
                  <div className="flex gap-6 overflow-x-auto hide-scrollbar scroll-smooth pb-4 px-14">
                    {mcpToolResult.map((uiResource: any, index: number) => {
                      // If there's only 1 card, show it wider (likely a detail view)
                      const isSingleCard = mcpToolResult.length === 1;

                      const width = isSingleCard ? "100%" : 280;
                      const height = isSingleCard ? "75vh" : 400;

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          transition={{
                            duration: 0.5,
                            delay: index * 0.1,
                            ease: "easeOut",
                          }}
                          className="flex-shrink-0 transition-transform hover:scale-105"
                          style={{
                            width:
                              typeof width === "number" ? `${width}px` : width,
                            height:
                              typeof height === "number"
                                ? `${height}px`
                                : height,
                          }}
                        >
                          <div
                            ref={(el) => {
                              productRefs.current[index] = el;
                            }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full"
                          >
                            <UIResourceRenderer
                              resource={{
                                uri: uiResource.uri,
                                mimeType: uiResource.mimeType,
                                text: uiResource.text,
                              }}
                              onUIAction={async (result) => {
                                console.log("UI Action received:", result);

                                // Check if this is a detail/navigation action
                                if (
                                  result.type === "navigate" ||
                                  result.type === "detail" ||
                                  (result.type === "resource" &&
                                    result.payload?.resource)
                                ) {
                                  // Navigate to full-page detail view
                                  const resource =
                                    result.payload?.resource || result.payload;
                                  if (
                                    resource &&
                                    (resource.uri || resource.text)
                                  ) {
                                    const resourceParam = encodeURIComponent(
                                      JSON.stringify(resource)
                                    );
                                    router.push(
                                      `/product/${Date.now()}?resource=${resourceParam}`
                                    );
                                    return;
                                  }
                                }

                                // Handle other action types
                                switch (result.type) {
                                  case "prompt":
                                    conversation.sendUserMessage(
                                      result.payload.prompt
                                    );
                                    break;

                                  case "tool":
                                    if (
                                      result.payload.toolName ===
                                      "redirect_to_checkout"
                                    ) {
                                      const url = result.payload.params?.url;
                                      if (url) {
                                        window.open(
                                          url,
                                          "_blank",
                                          "noopener,noreferrer"
                                        );
                                      }
                                    } else if (
                                      result.payload.toolName === "add_to_cart"
                                    ) {
                                      const prompt =
                                        result.payload.params?.prompt ||
                                        "Add this item to my cart";
                                      conversation.sendUserMessage(prompt);
                                    }
                                    break;

                                  case "link":
                                    // Check if this is a product detail link
                                    if (
                                      result.payload.url &&
                                      result.payload.url.includes("/products/")
                                    ) {
                                      // This might be a detail page - check if we have a resource
                                      if (result.payload.resource) {
                                        const resourceParam =
                                          encodeURIComponent(
                                            JSON.stringify(
                                              result.payload.resource
                                            )
                                          );
                                        router.push(
                                          `/product/${Date.now()}?resource=${resourceParam}`
                                        );
                                      } else {
                                        // Open external product page
                                        window.open(
                                          result.payload.url,
                                          "_blank",
                                          "noopener,noreferrer"
                                        );
                                      }
                                    } else if (result.payload.url) {
                                      window.open(
                                        result.payload.url,
                                        "_blank",
                                        "noopener,noreferrer"
                                      );
                                    }
                                    break;

                                  case "intent":
                                    if (
                                      result.payload.intent ===
                                        "view_details" ||
                                      result.payload.intent === "detail"
                                    ) {
                                      // Check if there's a detail resource in the payload
                                      if (result.payload.resource) {
                                        const resourceParam =
                                          encodeURIComponent(
                                            JSON.stringify(
                                              result.payload.resource
                                            )
                                          );
                                        router.push(
                                          `/product/${Date.now()}?resource=${resourceParam}`
                                        );
                                      } else {
                                        // Fall back to prompting for details
                                        const intentPrompt =
                                          result.payload.prompt ||
                                          `Show me details for this product`;
                                        conversation.sendUserMessage(
                                          intentPrompt
                                        );
                                      }
                                    } else {
                                      const intentPrompt =
                                        result.payload.prompt ||
                                        `Handle intent: ${result.payload.intent}`;
                                      conversation.sendUserMessage(
                                        intentPrompt
                                      );
                                    }
                                    break;

                                  default:
                                    console.log(
                                      "Unhandled UI action type:",
                                      result.type,
                                      result
                                    );
                                }
                              }}
                              htmlProps={{
                                autoResizeIframe: {
                                  width: false,
                                  height: true,
                                },
                              }}
                              iframeProps={{
                                style: { width: "100%", height: "100%" },
                              }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
