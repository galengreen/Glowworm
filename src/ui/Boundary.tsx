// Contains a rendering error to one block (a segment, question or figure) instead of blanking the page.
import { Component, type ReactNode } from 'react';

export class Boundary extends Component<{ label: string; children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="gate" role="alert" style={{ borderColor: 'var(--miss)', margin: '12px 0' }}>
        <span style={{ color: 'var(--miss)' }}>✕</span>
        <span>Couldn't show {this.props.label}. Run <code>pnpm glowworm validate</code> to find the problem. ({this.state.error.message})</span>
      </div>
    );
  }
}
