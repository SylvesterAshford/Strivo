"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { pinEntity, hideEntity } from "@/app/actions/entities";

interface Props {
  entityId: string;
  x: number;
  y: number;
  onClose: () => void;
}

export function NodeContextMenu({ entityId, x, y, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const items = [
    {
      label: "Open drill-down",
      action: () => {
        onClose();
        const params = new URLSearchParams(searchParams.toString());
        params.set("node", entityId);
        router.push(`/?${params.toString()}`, { scroll: false });
      },
    },
    {
      label: "Pin to center",
      action: async () => {
        onClose();
        await pinEntity(entityId);
      },
    },
    {
      label: "Copy entity name",
      action: () => {
        const node = document.querySelector(`[data-entity-id="${entityId}"]`);
        const name = node?.getAttribute("data-entity-name") ?? entityId;
        navigator.clipboard.writeText(name);
        onClose();
      },
    },
    {
      label: "Copy link",
      action: () => {
        const url = `${window.location.origin}/?node=${entityId}`;
        navigator.clipboard.writeText(url);
        onClose();
      },
    },
    {
      label: "Branch from here",
      action: () => {
        onClose();
        alert("Coming in phase 4.");
      },
    },
    {
      label: "Hide from view",
      action: async () => {
        onClose();
        await hideEntity(entityId);
      },
    },
  ];

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: y, left: x, zIndex: 100 }}
      className="bg-white border border-[#D6D3CA] rounded-lg shadow-lg py-1 w-52"
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.action}
          className="w-full text-left px-4 py-2 text-[13px] text-[#2D2D2A] hover:bg-[#F4F3EE] transition-colors"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
