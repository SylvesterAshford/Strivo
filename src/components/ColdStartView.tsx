"use client";

import { useState } from "react";
import { ColdStartHero } from "@/components/coldstart/ColdStartHero";
import { UploadModal } from "@/components/upload/UploadModal";

export function ColdStartView() {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <ColdStartHero onUpload={() => setUploadOpen(true)} />
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}
