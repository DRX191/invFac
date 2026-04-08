import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
}

const SCANNER_ID = "barcode-scanner-region";

function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    let mounted = true;
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (decodedText) => {
            const now = Date.now();
            if (
              decodedText === lastScanRef.current.code &&
              now - lastScanRef.current.at < 900
            ) {
              return;
            }
            lastScanRef.current = { code: decodedText, at: now };
            onScan(decodedText.trim());
          },
          () => {
            // Ignore per-frame scan errors while camera is active.
          }
        );
      } catch (error) {
        if (mounted) {
          console.error("Scanner start error", error);
        }
      }
    };

    void startScanner();

    return () => {
      mounted = false;
      if (scannerRef.current?.isScanning) {
        void scannerRef.current.stop().then(() => scannerRef.current?.clear());
      } else {
        void scannerRef.current?.clear();
      }
    };
  }, [onScan]);

  return <div id={SCANNER_ID} className="min-h-[240px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-black" />;
}

export default BarcodeScanner;
