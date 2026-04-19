# Revivio

Revivio is a Next.js app that imports room photos from a Zillow listing and turns them
into realistic redesign or virtual staging concepts with OpenAI image generation.

## Local development

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `OPENAI_API_KEY`
4. Start the app with `npm run dev`

## Product flow

- Paste a public Zillow listing URL
- Extract photo URLs from the listing page
- Select a room photo
- Choose a theme such as Modern, Contemporary, Japandi, or Coastal
- Generate either:
  - a redesign concept that updates finishes and styling
  - a virtual staging concept that adds furniture and decor

## Deployment notes

This project is designed for Vercel deployment. Before production use, set
`OPENAI_API_KEY` in the Vercel project environment variables so the generation route can
call the OpenAI API at runtime.
