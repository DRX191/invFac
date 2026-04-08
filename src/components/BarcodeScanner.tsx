import { useEffect, useRef } from "react";
 
declare global {
  interface Window {
    Quagga?: {
      init: (config: unknown, cb: (err?: Error) => void) => void;
      start: () => void;
      stop: () => void;
      onDetected: (cb: (result: any) => void) => void;
      offDetected: (cb: (result: any) => void) => void;
    };
    __quaggaLoader?: Promise<void>;
  }
}

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  instanceId?: string;
  compact?: boolean;
}

const DEFAULT_SCANNER_ID = "barcode-scanner-region";

function loadQuaggaFromCdn(): Promise<void> {
  if (window.Quagga) {
    return Promise.resolve();
  }

  if (window.__quaggaLoader) {
    return window.__quaggaLoader;
  }

  window.__quaggaLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.8.2/dist/quagga.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Quagga2 desde CDN."));
    document.head.appendChild(script);
  });

  return window.__quaggaLoader;
}

function BarcodeScanner({
  onScan,
  instanceId = DEFAULT_SCANNER_ID,
  compact = false
}: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const onScanRef = useRef(onScan);
  const onDetectedRef = useRef<((result: any) => void) | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      if (!containerRef.current) {
        return;
      }

      try {
        await loadQuaggaFromCdn();
        if (!mounted || !window.Quagga || !containerRef.current) {
          return;
        }

        await new Promise<void>((resolve, reject) => {
          window.Quagga?.init(
            {
              inputStream: {
                name: "Live",
                type: "LiveStream",
                target: containerRef.current,
                constraints: {
                  facingMode: "environment"
                }
              },
              locator: {
                patchSize: compact ? "small" : "medium",
                halfSample: true
              },
              locate: true,
              frequency: 12,
              numOfWorkers: 2,
              decoder: {
                readers: [
                  "code_128_reader",
                  "ean_reader",
                  "ean_8_reader",
                  "upc_reader",
                  "upc_e_reader",
                  "code_39_reader",
                  "code_93_reader",
                  "codabar_reader",
                  "i2of5_reader"
                ]
              }
            },
            (err?: Error) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            }
          );
        });

        if (!mounted || !window.Quagga) {
          return;
        }

        window.Quagga.start();

        const onDetected = (result: any) => {
          const decodedText = result?.codeResult?.code;
          if (!decodedText) {
            return;
          }

            const now = Date.now();
            if (
              decodedText === lastScanRef.current.code &&
              now - lastScanRef.current.at < 900
            ) {
              return;
            }
            lastScanRef.current = { code: decodedText, at: now };
            onScanRef.current(String(decodedText).trim());
        };

        onDetectedRef.current = onDetected;
        window.Quagga.onDetected(onDetected);
      } catch (error) {
        if (mounted) {
          console.error("Scanner start error", error);
        }
      }
    };

    void startScanner();

    return () => {
      mounted = false;
      if (window.Quagga && onDetectedRef.current) {
        window.Quagga.offDetected(onDetectedRef.current);
      }
      if (window.Quagga) {
        window.Quagga.stop();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [compact]);

  return (
    <div
      id={instanceId}
      ref={containerRef}
      className={`barcode-scanner w-full ${
        compact ? "barcode-scanner--compact" : "barcode-scanner--regular"
      }`}
    />
  );
}

export default BarcodeScanner;
