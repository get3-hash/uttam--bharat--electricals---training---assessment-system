import React, { useEffect, useState } from "react";
import { generateTrainingQRCode } from "../lib/qrGenerator";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { QrCode, Loader2 } from "lucide-react";

interface TrainingQRCodeProps {
  trainingId: string;
  initialUrl?: string;
  size?: number; // size in px
  className?: string;
  persistToFirestore?: boolean;
}

export const TrainingQRCode: React.FC<TrainingQRCodeProps> = ({
  trainingId,
  initialUrl,
  size = 120,
  className = "",
  persistToFirestore = true
}) => {
  const [qrUrl, setQrUrl] = useState<string>(initialUrl || "");
  const [loading, setLoading] = useState<boolean>(!initialUrl);

  useEffect(() => {
    let isMounted = true;

    async function loadQr() {
      if (initialUrl && initialUrl.length > 10) {
        setQrUrl(initialUrl);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const generated = await generateTrainingQRCode(trainingId);
        if (isMounted) {
          setQrUrl(generated);
          setLoading(false);
        }

        if (persistToFirestore && generated) {
          try {
            await updateDoc(doc(db, "trainings", trainingId), { qrCodeDataUrl: generated });
          } catch (e) {
            console.warn("Could not save QR code URL to Firestore:", e);
          }
        }
      } catch (err) {
        console.error("Error generating QR code:", err);
        if (isMounted) setLoading(false);
      }
    }

    loadQr();

    return () => {
      isMounted = false;
    };
  }, [trainingId, initialUrl, persistToFirestore]);

  if (loading) {
    return (
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`bg-[#E6F4FA] border border-[#59B5E2] rounded-xl flex flex-col items-center justify-center text-[#008DD2] gap-1 p-2 ${className}`}
      >
        <Loader2 className="w-5 h-5 animate-spin text-[#008DD2]" />
        <span className="text-[10px] font-medium text-[#757573]">QR Loading...</span>
      </div>
    );
  }

  if (!qrUrl) {
    return (
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`bg-[#FFFFFF] border border-[#D5D4D4] rounded-xl flex flex-col items-center justify-center text-[#757573] p-2 ${className}`}
      >
        <QrCode className="w-6 h-6 text-[#757573] mb-1" />
        <span className="text-[10px]">No QR</span>
      </div>
    );
  }

  return (
    <img
      src={qrUrl}
      alt="Training QR Code"
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`bg-[#FFFFFF] p-1 rounded-xl border border-[#D5D4D4] shadow-xs object-contain ${className}`}
    />
  );
};
