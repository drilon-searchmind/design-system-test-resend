import { ChatPanel } from "@/components/chat/chat-panel";

export const metadata = { title: "AI Chat · Demo · 1337-crm by Searchmind" };

export default function ChatDemoPage() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ChatPanel />
    </div>
  );
}
