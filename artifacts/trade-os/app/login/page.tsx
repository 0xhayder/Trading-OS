"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPending(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setPending(false);

    if (!response.ok) {
      setError("Password is incorrect.");
      return;
    }

    const nextPath = new URLSearchParams(window.location.search).get("next");
    router.replace(nextPath || "/");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <form className="w-full max-w-sm border border-border rounded-sm p-5 space-y-4" onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 border border-border rounded-sm flex items-center justify-center">
            <Terminal size={15} />
          </div>
          <div>
            <h1 className="text-sm font-semibold">TradeOS Access</h1>
            <p className="text-xs text-muted-foreground font-mono">Protected trading workspace</p>
          </div>
        </div>

        <div>
          <div className="section-label mb-1.5">Password</div>
          <input
            autoFocus
            type="password"
            className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && <div className="text-xs font-mono text-red-400">{error}</div>}

        <button
          className="w-full py-2 text-sm font-mono bg-foreground text-background rounded-sm hover:opacity-90 disabled:opacity-60"
          disabled={pending || !password}
          type="submit"
        >
          {pending ? "Checking" : "Enter"}
        </button>
      </form>
    </main>
  );
}
