This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

# NextJS Frontend for NestJS Microservices Chat Application

This is a minimalistic NextJS frontend for the NestJS microservices chat application. It provides a clean, responsive UI for the chat functionality.

## Features

- Authentication (login/register)
- Real-time messaging
- Online/offline user status
- Message read receipts
- Conversation list with unread counts
- Responsive design

## Technologies Used

- Next.js (React framework)
- TypeScript
- Zustand (State management)
- Socket.io Client (Real-time communication)
- TailwindCSS (Styling)
- Axios (HTTP requests)
- date-fns (Date formatting)

## Getting Started

1. Clone this repository:

```bash
git clone
cd chat-app-frontend
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with the following content:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

4. Start the development server:

```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

App Router Structure

src/app/layout.tsx - The root layout component that wraps all pages
src/app/page.tsx - The main chat page (home route)
src/app/login/page.tsx - The login page
src/app/register/page.tsx - The registration page
src/app/providers.tsx - Client-side providers wrapper

Components

src/components/ChatComponent.tsx - The main chat UI component with all chat functionality
src/components/ClientProviders.tsx - Handles client-side state initialization and persistence

State Management with Zustand

src/lib/stores/useAuthStore.ts - Authentication state and API calls
src/lib/stores/useChatStore.ts - Chat functionality, WebSocket connections, and message handling

npx next dev -p 4000
