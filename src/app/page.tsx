import { UserButton } from "@clerk/nextjs";
import { requireWorkspace } from "@/lib/workspace";

export default async function HomePage() {
  const workspace = await requireWorkspace();

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#2A2A26]">
      <header className="flex h-14 items-center justify-between border-b border-[#DDDAD0] bg-white px-6">
        <div className="flex items-baseline gap-3">
          <span className="text-[15px] font-medium tracking-[0.02em]">LATTICE</span>
          <span className="text-[13px] text-[#6B675D]">{workspace.name}</span>
        </div>
        <UserButton />
      </header>

      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#9C9890] mb-4">
            PHASE 1 PLACEHOLDER
          </p>
          <h1 className="text-2xl font-semibold tracking-[-0.024em] text-[#111110] mb-4">
            Welcome.
          </h1>
          <p className="text-[13px] leading-relaxed text-[#6B675D]">
            Your workspace is ready. The upload flow and graph come in phase 2.
          </p>
        </div>
      </main>
    </div>
  );
}
