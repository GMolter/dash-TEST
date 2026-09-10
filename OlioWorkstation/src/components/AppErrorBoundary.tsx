import { Component, type ReactNode } from 'react';

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <section role="alert" className="glass-panel w-full max-w-md rounded-3xl p-8 text-center">
          <h1 className="text-2xl font-semibold">Let’s get Olio back.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">This view couldn’t load. Reload to try again with the latest version.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white hover:bg-violet-500">Reload Olio</button>
        </section>
      </main>
    );
  }
}
