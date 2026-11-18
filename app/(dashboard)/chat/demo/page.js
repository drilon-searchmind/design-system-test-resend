import { ChatPanel } from "@/components/chat/chat-panel";

export const metadata = { title: "AI Chat · Demo · Searchmind 1337 OS" };

export default function ChatDemoPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ChatPanel />
    </div>
  );
}
