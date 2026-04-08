import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  instanceId?: string;
}

const DEFAULT_SCANNER_ID = "barcode-scanner-region";

function BarcodeScanner({ onScan, instanceId = DEFAULT_SCANNER_ID }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const onScanRef = useRef(onScan);
  const isStartingRef = useRef(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let mounted = true;
    const scanner = new Html5Qrcode(instanceId);
    scannerRef.current = scanner;

    const startScanner = async () => {
      if (isStartingRef.current) {
        return;
      }
      isStartingRef.current = true;
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (decodedText: string) => {
            const now = Date.now();
            if (
              decodedText === lastScanRef.current.code &&
              now - lastScanRef.current.at < 900
            ) {
              return;
            }
            lastScanRef.current = { code: decodedText, at: now };
            onScanRef.current(decodedText.trim());
          },
          () => {
            // Ignore per-frame scan errors while camera is active.
          }
        );
      } catch (error) {
        if (mounted) {
          console.error("Scanner start error", error);
        }
      } finally {
        isStartingRef.current = false;
      }
    };

    void startScanner();

    return () => {
      mounted = false;
      const activeScanner = scannerRef.current;
      scannerRef.current = null;
      if (activeScanner?.isScanning) {
        void activeScanner.stop().then(() => activeScanner.clear());
      } else {
        void activeScanner?.clear();
      }
    };
  }, [instanceId]);

  return <div id={instanceId} className="min-h-[240px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-black" />;
}

export default BarcodeScanner;
