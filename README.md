## Setup

### ElevenLabs Agent

1. Create a new agent in ElevenLabs
1. Add a custom MCP server using SSE and url https://mcpstorefront.com/?store=allbirds.com&mode=prompt
1. Copy the Agent ID and add to .env.local as AGENT_ID
1. Add the ElevenLabs API key to .env.local as ELEVENLABS_API_KEY
1. Install dependencies with `pnpm install`
1. Run the project with `pnpm dev`
