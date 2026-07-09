import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/dashboard-shell";
import { Messenger } from "@/components/messaging/messenger";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
  head: () => ({
    meta: [
      { title: "Messages · SPACES" },
      { name: "description", content: "Secure, premium messaging with owners, agents and buyers on SPACES." },
    ],
  }),
});

function MessagesPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1400px] space-y-4 animate-fade-in">
        <header className="px-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with owners, agents and the SPACES team — securely.</p>
        </header>
        <Messenger />
      </div>
    </DashboardShell>
  );
}
