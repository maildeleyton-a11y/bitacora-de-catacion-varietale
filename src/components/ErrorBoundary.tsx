import React, { Component, ErrorInfo, ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { VarietaleBrandIcon } from "./VarietaleLogo";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("ErrorBoundary capturó un error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#DDC1AB] shadow-xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#01374C] flex items-center justify-center mx-auto mb-4 p-3 text-white shadow-md">
              <VarietaleBrandIcon color="#00D9B4" className="w-full h-full" />
            </div>
            <h2 className="text-xl font-black text-[#01374C] mb-2">
              Algo no cargó correctamente
            </h2>
            <p className="text-sm text-[#4A5D68] mb-6 leading-relaxed">
              La Bitácora se ha protegido para evitar bloqueos. Puedes recargar la pantalla para continuar catando normalmente.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#01374C] hover:bg-[#002636] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#00D9B4]" />
              <span>Recargar Bitácora</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
