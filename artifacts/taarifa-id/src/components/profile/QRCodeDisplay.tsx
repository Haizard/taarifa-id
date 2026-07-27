"use client";

import { useRef } from "react";
import QRCode from "react-qr-code";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Share2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  profileId: string;
  profileUrl: string;
  name: string;
  accountType: string;
  isActive: boolean;
}

export default function QRCodeDisplay({ profileId, profileUrl, name, accountType, isActive }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `TAARIFA_ID — ${name}`,
          text: `Scan my TAARIFA_ID QR code to view my emergency profile`,
          url: profileUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(profileUrl);
      toast.success("Profile link copied to clipboard!");
    }
  }

  return (
    <div className="space-y-5">
      {!isActive && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950 rounded-2xl border border-amber-200 dark:border-amber-800">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Account not activated</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Your QR code is not yet active. Please complete payment to activate your profile.
            </p>
          </div>
        </div>
      )}

      {/* QR Card — printable */}
      <div
        ref={printRef}
        className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm text-center"
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">TID</span>
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100">
            TAARIFA<span className="text-blue-700">_ID</span>
          </span>
        </div>

        {/* QR Code */}
        <div
          className={`inline-flex p-4 rounded-2xl bg-white border-2 ${
            isActive ? "border-blue-200" : "border-gray-200 opacity-50"
          } mb-5`}
        >
          <QRCode
            value={profileUrl}
            size={180}
            level="H"
            style={{ display: "block" }}
          />
        </div>

        {/* Info */}
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{name}</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">{profileId}</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant={isActive ? "success" : "secondary"}>
            {isActive ? "ACTIVE" : "INACTIVE"}
          </Badge>
          <Badge variant="default">{accountType}</Badge>
        </div>

        <p className="text-xs text-gray-400 mt-4 break-all">{profileUrl}</p>
        <p className="text-xs text-gray-300 mt-2">Powered by Sunriver Systems</p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="flex-col h-16 gap-1 text-xs"
          onClick={handlePrint}
        >
          <Printer size={18} />
          Print
        </Button>
        <Button
          variant="outline"
          className="flex-col h-16 gap-1 text-xs"
          onClick={handleShare}
        >
          <Share2 size={18} />
          Share
        </Button>
        <Button
          variant="outline"
          className="flex-col h-16 gap-1 text-xs"
          onClick={() => {
            const svg = document.querySelector("svg");
            if (!svg) return;
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], { type: "image/svg+xml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `TAARIFA_ID_${profileId}.svg`;
            a.click();
          }}
        >
          <Download size={18} />
          Save
        </Button>
      </div>
    </div>
  );
}
