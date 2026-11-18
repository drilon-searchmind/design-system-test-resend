import { AiChatOverview } from "@/components/chat/ai-chat-overview";

export const metadata = { title: "AI Chat · Searchmind 1337 OS" };

export default function ChatPage() {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col">
      <AiChatOverview />
    </main>
  );
}
