"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UIResourceRenderer } from "@mcp-ui/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ProductDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resource, setResource] = useState<any>(null);

  useEffect(() => {
    // Get the resource from URL params
    const resourceData = searchParams.get("resource");
    if (resourceData) {
      try {
        const parsed = JSON.parse(decodeURIComponent(resourceData));
        setResource(parsed);
      } catch (error) {
        console.error("Failed to parse resource:", error);
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header with back button */}
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to results
          </Button>
        </div>
      </header>

      {/* Product detail content */}
      <main className="container mx-auto px-4 py-8">
        {resource ? (
          <div className="max-w-7xl mx-auto">
            <UIResourceRenderer
              resource={{
                uri: resource.uri,
                mimeType: resource.mimeType,
                text: resource.text,
              }}
              onUIAction={async (result) => {
                console.log("Product detail action:", result);

                switch (result.type) {
                  case "prompt":
                    // Store prompt and navigate back
                    sessionStorage.setItem("pendingPrompt", result.payload.prompt);
                    router.back();
                    break;

                  case "tool":
                    if (result.payload.toolName === "redirect_to_checkout") {
                      const url = result.payload.params?.url;
                      if (url) {
                        window.open(url, "_blank", "noopener,noreferrer");
                      }
                    } else if (result.payload.toolName === "add_to_cart") {
                      const prompt = result.payload.params?.prompt || "Add this item to my cart";
                      sessionStorage.setItem("pendingPrompt", prompt);
                      router.back();
                    }
                    break;

                  case "link":
                    if (result.payload.url) {
                      window.open(result.payload.url, "_blank", "noopener,noreferrer");
                    }
                    break;

                  default:
                    console.log("Unhandled product detail action:", result.type);
                }
              }}
              htmlProps={{
                autoResizeIframe: { width: true, height: true },
                containerStyle: {
                  width: '100%',
                  maxWidth: '100%',
                  margin: 0
                }
              }}
              iframeProps={{
                style: {
                  width: '100%',
                  height: 'auto',
                  minHeight: '600px',
                  border: 'none',
                  display: 'block'
                },
                sandbox: "allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              }}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading product details...</p>
          </div>
        )}
      </main>
    </div>
  );
}