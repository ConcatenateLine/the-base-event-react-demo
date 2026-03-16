import EventTestPanel from "./components/EventTestPanel";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">The Base Event Demo</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Real-world e-commerce event system implementation
          </p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <EventTestPanel />
      </main>
    </div>
  );
}
