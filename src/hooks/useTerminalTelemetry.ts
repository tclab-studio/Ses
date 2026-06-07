import { useEffect } from "react";

const originalFetch = global.fetch;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

function patchFetch() {
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    const method = init?.method ?? (input instanceof Request ? input.method : "GET");
    const start = Date.now();

    originalConsoleLog(`[FETCH] → REQ: ${method} ${url}`);

    try {
      const res = await originalFetch(input, init);
      const elapsed = Date.now() - start;
      if (res.ok) {
        originalConsoleLog(`[NET] ← ${res.status}: ${method} ${url} (${elapsed}ms)`);
      } else {
        originalConsoleError(`[ERROR] ← ${res.status}: ${method} ${url} (${elapsed}ms)`);
      }
      return res;
    } catch (err: unknown) {
      const elapsed = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      originalConsoleError(`[ERROR] ✗ ERR: ${method} ${url} (${elapsed}ms) — ${msg}`);
      throw err;
    }
  };
}

function restoreFetch() {
  global.fetch = originalFetch;
}

function patchConsole() {
  console.log = (...args: unknown[]) => {
    originalConsoleLog("[INFO]", ...args);
  };
  console.warn = (...args: unknown[]) => {
    originalConsoleWarn("[WARN]", ...args);
  };
  console.error = (...args: unknown[]) => {
    originalConsoleError("[ERROR]", ...args);
  };
}

function restoreConsole() {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
}

export function useTerminalTelemetry() {
  useEffect(() => {
    patchFetch();
    patchConsole();
    originalConsoleLog("[SYSTEM] Telemetry active. Intercepting core loops...");
    return () => {
      restoreFetch();
      restoreConsole();
    };
  }, []);
}