"use client";

import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            MCP Database Assistant
          </h1>
          <p className="text-muted-foreground">
            Ask questions about paints & colors (MongoDB) or food products
            (MySQL)
          </p>
        </div>

        <Chat />
      </div>
    </main>
  );
}
