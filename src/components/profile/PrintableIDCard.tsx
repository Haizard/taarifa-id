"use client";

import { useRef } from "react";
import QRCode from "react-qr-code";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props {
  profileId: string;
  profileUrl: string;
  name: string;
  accountType: string;
  bloodGroup?: string;
  picUrl?: string;
}

export default function PrintableIDCard({
  profileId,
  profileUrl,
  name,
  accountType,
  bloodGroup,
  picUrl,
}: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({ contentRef: printRef });

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Preview your printable ID card. Click print to generate.
      </p>

      {/* Card preview — standard CR80 card size ratio */}
      <div ref={printRef} className="mx-auto" style={{ width: "340px" }}>
        <div
          className="relative bg-gradient-to-br from-blue-900 to-blue-700 text-white rounded-2xl overflow-hidden shadow-xl"
          style={{ width: "340px", height: "215px" }}
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative flex h-full">
            {/* Left: Info */}
            <div className="flex-1 p-4 flex flex-col justify-between">
              {/* Header */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-5 h-5 bg-yellow-400 rounded flex items-center justify-center">
                    <span className="text-blue-900 text-[8px] font-black">TID</span>
                  </div>
                  <span className="text-[10px] font-bold tracking-widest opacity-90">TAARIFA_ID</span>
                </div>

                {/* Photo placeholder */}
                <div className="flex items-center gap-2.5">
                  {picUrl ? (
                    <img src={picUrl} alt={name} className="w-14 h-16 object-cover rounded-lg border-2 border-white/20" />
                  ) : (
                    <div className="w-14 h-16 bg-white/10 rounded-lg border-2 border-white/20 flex items-center justify-center text-white font-bold text-xl">
                      {name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm leading-tight">{name}</p>
                    <p className="text-[10px] opacity-75 mt-0.5">{accountType}</p>
                    {bloodGroup && (
                      <span className="inline-block mt-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        {bloodGroup}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile ID */}
              <div>
                <p className="text-[9px] opacity-60 uppercase tracking-wider">Profile ID</p>
                <p className="font-mono font-bold text-xs tracking-wider">{profileId}</p>
              </div>
            </div>

            {/* Right: QR Code */}
            <div className="w-24 bg-white/10 flex flex-col items-center justify-center p-3 gap-2">
              <div className="bg-white p-1.5 rounded-lg">
                <QRCode value={profileUrl} size={66} level="H" />
              </div>
              <p className="text-[8px] text-center opacity-60">Scan to view profile</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print button */}
      <Button onClick={handlePrint} fullWidth>
        <Printer size={18} /> Print ID Card
      </Button>

      <div className="text-xs text-gray-400 text-center space-y-1">
        <p>Standard credit card size (85.6mm × 54mm)</p>
        <p>Recommended: Print on glossy card stock</p>
      </div>
    </div>
  );
}
