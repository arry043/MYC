import { APP_DESCRIPTION, APP_NAME } from "@/lib/app";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="text-lg text-muted-foreground">{APP_DESCRIPTION}</p>
        <p className="text-sm text-muted-foreground">
          Don&apos;t rely on motivation. Build consistency.
        </p>
      </div>
    </main>
  );
}
