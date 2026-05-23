"use client";

import { useEffect, useState } from "react";

interface Props {
  materialId: string;
  onComplete: (stats: { entitiesAdded: number; entitiesUpdated: number; edgesAdded: number }) => void;
  onError: (message: string) => void;
}

export function ProcessingView({ materialId, onComplete, onError }: Props) {
  const [status, setStatus] = useState("Starting...");

  useEffect(() => {
    const eventSource = new EventSource(`/api/upload/${materialId}/stream`);

    eventSource.addEventListener("status", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      setStatus(data.message);
    });

    eventSource.addEventListener("complete", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      eventSource.close();
      onComplete(data.stats);
    });

    eventSource.addEventListener("error", (e) => {
      let message = "Processing failed.";
      try {
        const data = JSON.parse((e as MessageEvent).data);
        message = data.message || message;
      } catch {
        // native EventSource error event — not a server error message
      }
      eventSource.close();
      onError(message);
    });

    return () => {
      eventSource.close();
    };
  }, [materialId, onComplete, onError]);

  return (
    <div className="py-12 text-center">
      <div className="inline-flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-[#C9512D] border-t-transparent animate-spin" />
        <p className="text-[13px] text-[#2A2A26]">{status}</p>
      </div>
    </div>
  );
}
