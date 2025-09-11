"use client"

import { Button } from "@/components/ui/button"
import { useCallback, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useConversation } from "@elevenlabs/react"
import { cn } from "@/lib/utils"
import {
  UIResourceRenderer,
  type UIActionResult,
  basicComponentLibrary,
  remoteTextDefinition,
  remoteButtonDefinition,
} from "@mcp-ui/client"
import { ShoppingCart, Package, Terminal } from "lucide-react"

// Mock product data
const products = [
  { id: 1, name: "Wireless Headphones", price: 199.99, image: "/wireless-headphones.png" },
  { id: 2, name: "Smart Watch", price: 299.99, image: "/smartwatch-lifestyle.png" },
  { id: 3, name: "Laptop Stand", price: 79.99, image: "/laptop-stand.png" },
  { id: 4, name: "USB-C Hub", price: 49.99, image: "/usb-hub.png" },
]

// Create shopping UI as remote DOM resource
const createShoppingResource = (productId: number) => {
  const product = products.find((p) => p.id === productId)
  if (!product) return null

  const remoteDomScript = `
    const container = document.createElement('div');
    container.className = 'p-6 bg-white rounded-lg shadow-lg max-w-sm mx-auto';
    
    const img = document.createElement('img');
    img.src = '${product.image}';
    img.alt = '${product.name}';
    img.className = 'w-full h-48 object-cover rounded-lg mb-4';
    
    const title = document.createElement('h3');
    title.textContent = '${product.name}';
    title.className = 'text-xl font-bold mb-2';
    
    const price = document.createElement('p');
    price.textContent = '$${product.price}';
    price.className = 'text-2xl font-bold text-green-600 mb-4';
    
    const button = document.createElement('ui-button');
    button.setAttribute('label', 'Add to Cart');
    button.setAttribute('variant', 'primary');
    button.className = 'w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors';
    
    button.addEventListener('press', () => {
      window.parent.postMessage({ 
        type: 'tool', 
        payload: { 
          toolName: 'addToCart', 
          params: { 
            productId: ${product.id},
            productName: '${product.name}',
            price: ${product.price}
          } 
        } 
      }, '*');
    });
    
    container.appendChild(img);
    container.appendChild(title);
    container.appendChild(price);
    container.appendChild(button);
    
    root.appendChild(container);
  `

  return {
    type: "resource" as const,
    resource: {
      uri: `ui://commerce/product-${productId}`,
      mimeType: "application/vnd.mcp-ui.remote-dom+javascript; framework=react",
      text: remoteDomScript,
    },
  }
}

// Create cart summary resource
const createCartResource = (cartItems: any[]) => {
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const remoteDomScript = `
    const container = document.createElement('div');
    container.className = 'p-6 bg-gray-50 rounded-lg';
    
    const title = document.createElement('h3');
    title.textContent = 'Shopping Cart';
    title.className = 'text-xl font-bold mb-4';
    
    const itemsList = document.createElement('div');
    itemsList.className = 'space-y-2 mb-4';
    
    ${cartItems
      .map(
        (item) => `
      const item${item.id} = document.createElement('div');
      item${item.id}.className = 'flex justify-between items-center p-2 bg-white rounded';
      item${item.id}.innerHTML = '<span>${item.name} x${item.quantity}</span><span>$${(item.price * item.quantity).toFixed(2)}</span>';
      itemsList.appendChild(item${item.id});
    `,
      )
      .join("")}
    
    const totalElement = document.createElement('div');
    totalElement.className = 'text-xl font-bold border-t pt-2';
    totalElement.innerHTML = 'Total: $${total.toFixed(2)}';
    
    const checkoutBtn = document.createElement('ui-button');
    checkoutBtn.setAttribute('label', 'Checkout');
    checkoutBtn.className = 'w-full mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors';
    
    checkoutBtn.addEventListener('press', () => {
      window.parent.postMessage({ 
        type: 'tool', 
        payload: { 
          toolName: 'checkout', 
          params: { 
            items: ${JSON.stringify(cartItems)},
            total: ${total}
          } 
        } 
      }, '*');
    });
    
    container.appendChild(title);
    container.appendChild(itemsList);
    container.appendChild(totalElement);
    container.appendChild(checkoutBtn);
    
    root.appendChild(container);
  `

  return {
    type: "resource" as const,
    resource: {
      uri: "ui://commerce/cart-summary",
      mimeType: "application/vnd.mcp-ui.remote-dom+javascript; framework=react",
      text: remoteDomScript,
    },
  }
}

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

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
      }
      throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.signedUrl) {
      throw new Error("No signed URL in response")
    }

    return { signedUrl: data.signedUrl, isDemo: data.isDemo }
  } catch (error) {
    console.error("Error in getSignedUrl:", error)
    throw error
  }
}

export function ConversationalCommerce() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [envStatus, setEnvStatus] = useState<any>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [currentView, setCurrentView] = useState<"products" | "cart" | "logs">("products")
  const [selectedProduct, setSelectedProduct] = useState<number>(1)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [lastAction, setLastAction] = useState<any>(null)
  const [mcpToolCalls, setMcpToolCalls] = useState<any[]>([])
  const [mcpUIResults, setMcpUIResults] = useState<any[]>([])

  useEffect(() => {
    checkEnvironment().then(setEnvStatus)
  }, [])

  const extractMcpToolResult = (debugInfo: any) => {
    try {
      // Look for tool call results in various message formats
      if (debugInfo?.type === "tool_result" || debugInfo?.tool_result) {
        return debugInfo.tool_result || debugInfo
      }

      // Check if it's a message with tool call content
      if (debugInfo?.message?.content) {
        const content = debugInfo.message.content
        if (typeof content === "string") {
          try {
            return JSON.parse(content)
          } catch {
            return content
          }
        }
        return content
      }

      // Check for nested tool results
      if (debugInfo?.data?.tool_result) {
        return debugInfo.data.tool_result
      }

      // Look for any JSON-like structures that might be tool results
      if (debugInfo && typeof debugInfo === "object") {
        const keys = Object.keys(debugInfo)
        const toolKeys = keys.filter(
          (key) =>
            key.includes("tool") || key.includes("result") || key.includes("response") || key.includes("content"),
        )

        if (toolKeys.length > 0) {
          return debugInfo
        }
      }

      return null
    } catch (error) {
      console.error("[v0] Error extracting MCP tool result:", error)
      return null
    }
  }

  const createMcpUIResource = (toolResult: any, index: number) => {
    if (!toolResult) return null

    // Check if this is a product search result from MCP
    if (toolResult?.mcp_tool_call?.result?.[0]?.text) {
      try {
        const productData = JSON.parse(toolResult.mcp_tool_call.result[0].text)
        if (productData.products && Array.isArray(productData.products)) {
          return createProductSearchResource(productData, toolResult.mcp_tool_call)
        }
      } catch (e) {
        console.log("Not a product search result, rendering as generic MCP result")
      }
    }

    const resourceScript = `
      const container = document.createElement('div');
      container.className = 'p-4 bg-blue-50 border border-blue-200 rounded-lg';
      
      const title = document.createElement('h4');
      title.textContent = 'MCP Tool Result #${index + 1}';
      title.className = 'font-bold text-blue-800 mb-2';
      
      const content = document.createElement('pre');
      content.textContent = ${JSON.stringify(JSON.stringify(toolResult, null, 2))};
      content.className = 'text-sm bg-white p-2 rounded border overflow-x-auto';
      
      // If the result contains UI-renderable content, try to render it
      ${
        toolResult?.ui_content
          ? `
        const uiContent = document.createElement('div');
        uiContent.innerHTML = ${JSON.stringify(toolResult.ui_content)};
        uiContent.className = 'mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded';
        container.appendChild(uiContent);
      `
          : ""
      }
      
      // If the result contains actions, create interactive buttons
      ${
        toolResult?.actions
          ? `
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'mt-2 flex gap-2';
        
        ${toolResult.actions
          .map(
            (action: any, actionIndex: number) => `
          const actionBtn${actionIndex} = document.createElement('ui-button');
          actionBtn${actionIndex}.setAttribute('label', '${action.label || `Action ${actionIndex + 1}`}');
          actionBtn${actionIndex}.className = 'bg-blue-600 text-white px-3 py-1 rounded text-sm';
          
          actionBtn${actionIndex}.addEventListener('press', () => {
            window.parent.postMessage({ 
              type: 'tool', 
              payload: { 
                toolName: 'mcpAction', 
                params: ${JSON.stringify(action)}
              } 
            }, '*');
          });
          
          actionsDiv.appendChild(actionBtn${actionIndex});
        `,
          )
          .join("")}
        
        container.appendChild(actionsDiv);
      `
          : ""
      }
      
      container.appendChild(title);
      container.appendChild(content);
      root.appendChild(container);
    `

    return {
      type: "resource" as const,
      resource: {
        uri: `ui://mcp/tool-result-${index}`,
        mimeType: "application/vnd.mcp-ui.remote-dom+javascript; framework=react",
        text: resourceScript,
      },
    }
  }

  // Create specialized product search resource
  const createProductSearchResource = (productData: any, toolCall: any) => {
    const { products, pagination, available_filters } = productData
    const toolName = toolCall.tool_name || "search_shop_catalog"
    const query = toolCall.parameters?.query || "products"
    
    const resourceScript = `
      const container = document.createElement('div');
      container.className = 'space-y-6';
      
      // Header
      const header = document.createElement('div');
      header.className = 'flex justify-between items-center mb-4';
      
      const title = document.createElement('h3');
      title.textContent = 'Search Results: "${query}"';
      title.className = 'text-xl font-bold text-gray-800';
      
      const resultCount = document.createElement('span');
      resultCount.textContent = '${products.length} results';
      resultCount.className = 'text-sm text-gray-600';
      
      header.appendChild(title);
      header.appendChild(resultCount);
      
      // Products grid
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
      
      ${products
        .map(
          (product: any, idx: number) => `
        const productCard${idx} = document.createElement('div');
        productCard${idx}.className = 'bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow';
        
        const productImage${idx} = document.createElement('img');
        productImage${idx}.src = '${product.image_url}';
        productImage${idx}.alt = '${product.title}';
        productImage${idx}.className = 'w-full h-48 object-cover';
        productImage${idx}.onerror = function() {
          this.src = '/placeholder.jpg';
        };
        
        const productContent${idx} = document.createElement('div');
        productContent${idx}.className = 'p-4';
        
        const productTitle${idx} = document.createElement('h4');
        productTitle${idx}.innerHTML = '<a href="${product.url}" target="_blank" class="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors">${product.title}</a>';
        
        const productDesc${idx} = document.createElement('p');
        productDesc${idx}.textContent = '${product.description.substring(0, 120)}...';
        productDesc${idx}.className = 'text-sm text-gray-600 mt-2 line-clamp-3';
        
        const productPrice${idx} = document.createElement('div');
        productPrice${idx}.className = 'flex justify-between items-center mt-3';
        
        const priceSpan${idx} = document.createElement('span');
        priceSpan${idx}.textContent = '$${product.price_range.min}';
        priceSpan${idx}.className = 'text-xl font-bold text-green-600';
        
        const addToCartBtn${idx} = document.createElement('ui-button');
        addToCartBtn${idx}.setAttribute('label', 'Add to Cart');
        addToCartBtn${idx}.className = 'bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm';
        
        addToCartBtn${idx}.addEventListener('press', () => {
          window.parent.postMessage({ 
            type: 'tool', 
            payload: { 
              toolName: 'addToShopifyCart', 
              params: { 
                productId: '${product.product_id}',
                productTitle: '${product.title}',
                price: parseFloat('${product.price_range.min}'),
                imageUrl: '${product.image_url}',
                url: '${product.url}'
              } 
            } 
          }, '*');
        });
        
        productPrice${idx}.appendChild(priceSpan${idx});
        productPrice${idx}.appendChild(addToCartBtn${idx});
        
        productContent${idx}.appendChild(productTitle${idx});
        productContent${idx}.appendChild(productDesc${idx});
        productContent${idx}.appendChild(productPrice${idx});
        
        productCard${idx}.appendChild(productImage${idx});
        productCard${idx}.appendChild(productContent${idx});
        
        grid.appendChild(productCard${idx});
      `,
        )
        .join("")}
      
      // Pagination
      ${
        pagination?.hasNextPage
          ? `
      const paginationDiv = document.createElement('div');
      paginationDiv.className = 'flex justify-center mt-6';
      
      const loadMoreBtn = document.createElement('ui-button');
      loadMoreBtn.setAttribute('label', 'Load More Products');
      loadMoreBtn.className = 'bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors';
      
      loadMoreBtn.addEventListener('press', () => {
        window.parent.postMessage({ 
          type: 'tool', 
          payload: { 
            toolName: 'loadMoreProducts', 
            params: { 
              cursor: '${pagination.endCursor}',
              query: '${query}',
              nextPage: ${pagination.nextPage}
            } 
          } 
        }, '*');
      });
      
      paginationDiv.appendChild(loadMoreBtn);
      container.appendChild(paginationDiv);
      `
          : ""
      }
      
      container.appendChild(header);
      container.appendChild(grid);
      root.appendChild(container);
    `

    return {
      type: "resource" as const,
      resource: {
        uri: `ui://mcp/product-search-${Date.now()}`,
        mimeType: "application/vnd.mcp-ui.remote-dom+javascript; framework=react",
        text: resourceScript,
      },
    }
  }

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
    onDebug: (debugInfo) => {
      console.log("[v0] ElevenLabs onDebug callback triggered:", JSON.stringify(debugInfo, null, 2))

      const debugLog = {
        timestamp: new Date().toISOString(),
        type: "elevenlabs_debug",
        data: debugInfo,
      }

      console.log("[v0] Debug Info Logged:", debugLog)
      setMcpToolCalls((prev) => [...prev, debugLog].slice(-20))

      const toolResult = extractMcpToolResult(debugInfo)
      if (toolResult) {
        console.log("[v0] Extracted MCP Tool Result:", toolResult)
        setMcpUIResults((prev) => {
          const newResults = [...prev, toolResult].slice(-10) // Keep last 10 results
          return newResults
        })
      }
    },
    onMessage: (message) => {
      console.log("Message received:", message)
      console.log("[v0] ElevenLabs message received:", JSON.stringify(message, null, 2))

      if (message && typeof message === "object") {
        const toolCall = {
          timestamp: new Date().toISOString(),
          type: "elevenlabs_message",
          data: message,
        }
        console.log("[v0] MCP Tool Call Result:", toolCall)
        setMcpToolCalls((prev) => [...prev, toolCall].slice(-20))

        const toolResult = extractMcpToolResult(message)
        if (toolResult) {
          console.log("[v0] Extracted MCP Tool Result from message:", toolResult)
          setMcpUIResults((prev) => {
            const newResults = [...prev, toolResult].slice(-10)
            return newResults
          })
        }
      }
    },
  })

  const handleCommerceAction = async (result: UIActionResult) => {
    console.log("[v0] MCP UI Action Result:", JSON.stringify(result, null, 2))

    const toolCallLog = {
      timestamp: new Date().toISOString(),
      type: "ui_action",
      data: result,
    }
    setMcpToolCalls((prev) => [...prev, toolCallLog].slice(-10))

    if (result.type === "tool") {
      const { toolName, params } = result.payload

      console.log(`[v0] Tool called: ${toolName} with params:`, params)

      if (toolName === "addToCart") {
        const existingItem = cartItems.find((item) => item.id === params.productId)
        if (existingItem) {
          setCartItems((items) =>
            items.map((item) => (item.id === params.productId ? { ...item, quantity: item.quantity + 1 } : item)),
          )
        } else {
          setCartItems((items) => [
            ...items,
            {
              id: params.productId,
              name: params.productName,
              price: params.price,
              quantity: 1,
            },
          ])
        }
        setLastAction({ type: "addToCart", product: params.productName })
      } else if (toolName === "checkout") {
        setLastAction({ type: "checkout", total: params.total })
        alert(`Checkout initiated for $${params.total.toFixed(2)}`)
      } else if (toolName === "mcpAction") {
        console.log("[v0] MCP Action triggered:", params)
        setLastAction({ type: "mcpAction", action: params })
      }
    }
    return { status: "Action handled" }
  }

  async function startConversation() {
    try {
      setIsLoading(true)
      setError(null)

      const hasPermission = await requestMicrophonePermission()
      if (!hasPermission) {
        setError("Microphone permission is required for voice conversation")
        setIsLoading(false)
        return
      }

      const { signedUrl, isDemo } = await getSignedUrl()

      if (isDemo) {
        setIsDemoMode(true)
        setError(
          "Demo mode: Using placeholder agent ID. Set up your AGENT_ID environment variable for real functionality.",
        )
        setIsLoading(false)
        return
      }

      await conversation.startSession({ signedUrl })
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

  const isConfigError = error?.includes("AGENT_ID") || error?.includes("ELEVENLABS_API_KEY")

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      <Card className="rounded-3xl">
        <CardContent>
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
          <div className="flex flex-col gap-y-4 text-center items-center">
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
                      <div>1. Get your API key from ElevenLabs</div>
                      <div>2. Create a conversational AI agent and copy the Agent ID</div>
                      <div>3. Set environment variables in your deployment</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="rounded-full bg-transparent"
                size="lg"
                disabled={isLoading || (conversation !== null && conversation.status === "connected")}
                onClick={startConversation}
              >
                {isLoading ? "Starting..." : isDemoMode ? "Try Demo" : "Start Shopping"}
              </Button>
              <Button
                variant="outline"
                className="rounded-full bg-transparent"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3">
          <CardContent className="p-4">
            <div className="flex gap-4 justify-center">
              <Button
                variant={currentView === "products" ? "default" : "outline"}
                onClick={() => setCurrentView("products")}
                className="flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Products
              </Button>
              <Button
                variant={currentView === "cart" ? "default" : "outline"}
                onClick={() => setCurrentView("cart")}
                className="flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Cart ({cartItems.length})
              </Button>
              <Button
                variant={currentView === "logs" ? "default" : "outline"}
                onClick={() => setCurrentView("logs")}
                className="flex items-center gap-2"
              >
                <Terminal className="w-4 h-4" />
                MCP Logs ({mcpToolCalls.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {currentView === "products" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Select Product</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {products.map((product) => (
                    <Button
                      key={product.id}
                      variant={selectedProduct === product.id ? "default" : "outline"}
                      onClick={() => setSelectedProduct(product.id)}
                      className="text-xs p-2 h-auto"
                    >
                      {product.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Interactive Product View</CardTitle>
              </CardHeader>
              <CardContent>
                <UIResourceRenderer
                  resource={createShoppingResource(selectedProduct)}
                  onUIAction={handleCommerceAction}
                  componentLibrary={{
                    ...basicComponentLibrary,
                    "ui-text": remoteTextDefinition,
                    "ui-button": remoteButtonDefinition,
                  }}
                />
              </CardContent>
            </Card>
          </>
        )}

        {currentView === "cart" && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Shopping Cart</CardTitle>
            </CardHeader>
            <CardContent>
              {cartItems.length > 0 ? (
                <UIResourceRenderer
                  resource={createCartResource(cartItems)}
                  onUIAction={handleCommerceAction}
                  componentLibrary={{
                    ...basicComponentLibrary,
                    "ui-text": remoteTextDefinition,
                    "ui-button": remoteButtonDefinition,
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Your cart is empty. Add some products to get started!
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentView === "logs" && (
          <>
            {mcpUIResults.length > 0 && (
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>MCP Tool Results (Rendered as UI)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mcpUIResults.map((result, index) => (
                      <div key={index}>
                        <UIResourceRenderer
                          resource={createMcpUIResource(result, index)}
                          onUIAction={handleCommerceAction}
                          componentLibrary={{
                            ...basicComponentLibrary,
                            "ui-text": remoteTextDefinition,
                            "ui-button": remoteButtonDefinition,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" onClick={() => setMcpUIResults([])} className="mt-4">
                    Clear MCP UI Results
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>MCP Tool Call Results & Debug Info</CardTitle>
              </CardHeader>
              <CardContent>
                {mcpToolCalls.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {mcpToolCalls.map((call, index) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              call.type === "elevenlabs_message"
                                ? "text-blue-600"
                                : call.type === "elevenlabs_debug"
                                  ? "text-purple-600"
                                  : "text-green-600",
                            )}
                          >
                            {call.type === "elevenlabs_message"
                              ? "ElevenLabs Message"
                              : call.type === "elevenlabs_debug"
                                ? "ElevenLabs Debug"
                                : "UI Action"}
                          </span>
                          <span className="text-xs text-gray-500">{new Date(call.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                          {JSON.stringify(call.data, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No MCP tool calls or debug info logged yet. Start a conversation to see ElevenLabs agent activity.
                  </div>
                )}
                {mcpToolCalls.length > 0 && (
                  <Button variant="outline" onClick={() => setMcpToolCalls([])} className="mt-4">
                    Clear Logs
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {lastAction && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm">
              <strong>Last Action:</strong> {JSON.stringify(lastAction, null, 2)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
