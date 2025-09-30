# Conversational Commerce Application

## Project Overview
This is a Next.js 14 application that implements a conversational commerce experience using ElevenLabs' voice AI technology. The application allows users to interact with an AI shopping assistant through voice conversations, providing a natural and intuitive shopping experience.

## Tech Stack
- **Framework**: Next.js 14.2.16 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: Radix UI primitives with shadcn/ui components
- **Voice AI**: ElevenLabs Conversational AI
- **MCP Integration**: @mcp-ui/client for interactive product rendering
- **Build Tools**: PostCSS, Autoprefixer

## Project Structure

### Core Directories
- `/app` - Next.js App Router pages and API routes
- `/components` - React components (main app components + shadcn/ui library)
- `/hooks` - Custom React hooks
- `/lib` - Utility functions and shared logic
- `/public` - Static assets (images, videos, fonts)
- `/styles` - Global CSS and Tailwind configuration

### Key Files
- `app/page.tsx` - Main landing page that renders the ConversationalCommerce component
- `app/layout.tsx` - Root layout with navigation and background effects
- `components/ConversationalCommerce.tsx` - Main application component handling voice interactions
- `app/api/signed-url/route.ts` - API endpoint for ElevenLabs WebRTC signed URL generation
- `app/api/test-env/route.ts` - Environment configuration testing endpoint

## Core Features

### 1. Voice Shopping Assistant
The main feature is an AI-powered voice assistant that helps users shop through natural conversation:
- Real-time voice interaction using WebRTC
- Visual feedback with animated orb showing assistant state (listening/speaking)
- Microphone permission handling
- Session management (start/stop conversations)

### 2. Interactive Product View
Dynamic product display area that shows:
- Product cards rendered from MCP server responses
- Smooth animations for new product appearances
- Horizontal scrollable product gallery
- UI actions that trigger voice prompts

### 3. Environment Configuration
- Supports both production and demo modes
- Graceful fallback when API keys are not configured
- Clear error messages and setup instructions for developers

## Component Architecture

### ConversationalCommerce Component (`components/ConversationalCommerce.tsx`)
Main application component that orchestrates:
- **Voice Conversation Management**: Uses `useConversation` hook from ElevenLabs
- **State Management**: Tracks connection status, errors, demo mode, and UI resources
- **Client Tools**: Implements `redirect_to_checkout` for e-commerce actions
- **MCP Integration**: Handles tool calls and renders UI resources dynamically
- **Error Handling**: Comprehensive error states with user-friendly messages

### Key Functions:
- `requestMicrophonePermission()` - Handles browser microphone access
- `checkEnvironment()` - Verifies API configuration
- `getSignedUrl()` - Fetches WebRTC connection URL from backend
- `startConversation()` - Initiates voice session with error handling
- `stopConversation()` - Cleanly terminates active sessions

## API Routes

### `/api/signed-url` (route.ts:1-98)
Generates signed URLs for ElevenLabs WebRTC connections:
- Checks for AGENT_ID and ELEVENLABS_API_KEY environment variables
- Falls back to demo mode if not configured
- Makes authenticated requests to ElevenLabs API
- Returns signed URL or demo placeholder with appropriate flags

### `/api/test-env` (route.ts:1-13)
Debugging endpoint that returns:
- Environment variable presence checks
- Masked agent ID value
- List of relevant environment variable keys

## UI Components Library
The project uses a comprehensive set of shadcn/ui components built on Radix UI:
- Over 50 pre-built, accessible UI components
- Consistent design system with Tailwind CSS
- Components include: Button, Card, Dialog, Toast, Forms, and more

## Styling & Animation
- **Global Styles**: Located in `app/globals.css`
- **Animated Orb**: Custom CSS animations for voice assistant visual feedback
- **Background Wave**: Video background with grayscale effect
- **Responsive Design**: Mobile-friendly with adaptive layouts
- **Custom Animations**: Fade-in and slide-in effects for product cards

## Environment Variables
Required environment variables (set in `.env.local`):
```
AGENT_ID=<your-elevenlabs-agent-id>
ELEVENLABS_API_KEY=<your-elevenlabs-api-key>
```

## Setup Instructions
1. Create an agent in ElevenLabs platform
2. Add custom MCP server with URL: `https://mcpstorefront.com/?store=allbirds.com&mode=prompt`
3. Copy Agent ID and API key to `.env.local`
4. Install dependencies: `npm install` or `pnpm install`
5. Run development server: `npm run dev` or `pnpm dev`
6. Open browser at `http://localhost:3000`

## Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm run start` - Run production server
- `npm run lint` - Run ESLint checks

## Dependencies Highlights
- **@elevenlabs/react** - Voice AI integration
- **@mcp-ui/client** - MCP UI resource rendering
- **framer-motion** - Animation library
- **recharts** - Data visualization
- **date-fns** - Date manipulation
- **zod** - Schema validation
- **react-hook-form** - Form management

## Browser Requirements
- Modern browser with WebRTC support
- Microphone access permission
- JavaScript enabled

## Security Considerations
- API keys are server-side only (never exposed to client)
- Signed URLs have limited lifetime for security
- Environment variables validation before API calls
- CORS handled by Next.js API routes

## Development Notes
- Uses Next.js App Router for modern React patterns
- Server Components where possible for performance
- Client Components marked with "use client" directive
- TypeScript for type safety throughout
- Extensive error handling and user feedback

## Demo Mode
When AGENT_ID is not configured:
- Returns placeholder signed URL
- Shows demo mode indicators in UI
- Provides setup instructions to users
- Prevents API calls to ElevenLabs

This architecture ensures a smooth development experience while protecting production credentials and providing clear feedback for configuration issues.