import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle } from "lucide-react";

const ConfirmContext = createContext(undefined);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, description, confirmLabel, danger, resolve }

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setState({
        title: opts.title || "Are you sure?",
        description: opts.description || "This action cannot be undone.",
        confirmLabel: opts.confirmLabel || "Confirm",
        cancelLabel: opts.cancelLabel || "Cancel",
        danger: opts.danger !== false,
        resolve,
      });
    });
  }, []);

  const handleClose = (result) => {
    state?.resolve?.(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-ink-950/50 p-4">
          <div className="w-full sm:max-w-sm bg-white rounded-card shadow-pop p-5">
            <div className="flex items-start gap-3">
              <div
                className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${
                  state.danger ? "bg-alert-50" : "bg-warn-50"
                }`}
              >
                <AlertTriangle size={18} className={state.danger ? "text-alert-600" : "text-warn-600"} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-base font-semibold text-ink-900">
                  {state.title}
                </h3>
                <p className="mt-1 text-sm text-ink-500">{state.description}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => handleClose(false)}
                className="px-4 py-2 text-sm font-medium rounded-card text-ink-700 hover:bg-ink-50 transition-colors"
              >
                {state.cancelLabel}
              </button>
              <button
                onClick={() => handleClose(true)}
                className={`px-4 py-2 text-sm font-medium rounded-card text-white transition-colors ${
                  state.danger ? "bg-alert-600 hover:bg-alert-700" : "bg-ink-900 hover:bg-ink-800"
                }`}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (ctx === undefined) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
