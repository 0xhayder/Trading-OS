"use client";

import dynamic from "next/dynamic";

const JournalApp = dynamic(() => import("@/App"), { ssr: false });

export default function JournalPage() {
  return <JournalApp />;
}
