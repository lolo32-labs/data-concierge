import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getClientConfig } from "@/lib/client-config";
import DashboardSidebar from "@/components/dashboard-sidebar";
import ChatArea from "@/components/chat-area";

interface PageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientPage({ params }: PageProps) {
  const { clientId } = await params;

  // Check auth
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(`dc-auth-${clientId}`);
  if (!authCookie) {
    redirect(`/${clientId}/login`);
  }

  // Load config
  const config = await getClientConfig(clientId);
  if (!config) {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <div className="flex flex-col w-full">
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-md" />
            <span className="font-semibold text-sm">ProfitSight</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{config.name}</span>
            <div className="w-7 h-7 bg-gray-800 rounded-full flex items-center justify-center text-xs">
              {config.name[0]}
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <DashboardSidebar clientId={clientId} clientName={config.name} />
          <ChatArea clientId={clientId} suggestedQuestions={config.suggested_questions} />
        </div>
      </div>
    </div>
  );
}
