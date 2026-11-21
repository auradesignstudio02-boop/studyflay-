import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'حدث خطأ غير متوقع في التطبيق.',
    };
  }

  render() {
    if (this.state.hasError) {
      let friendlyMsg = 'حدث خطأ غير متوقع أثناء تشغيل التطبيق.';
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed && typeof parsed.error === 'string') {
          friendlyMsg = `تعذّر إتمام العملية السحابية: ${parsed.error}`;
        }
      } catch {
        if (this.state.errorMessage) {
          friendlyMsg = this.state.errorMessage;
        }
      }

      return (
        <div className="min-h-screen bg-[#090F1D] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#111A2E] border border-slate-800 rounded-xl p-8 text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">تعذّر تحميل هذه الصفحة</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{friendlyMsg}</p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة تحميل الصفحة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
