"use client";

import { Component } from "react";

/** Wraps PicoWidget so a Pico runtime crash doesn't kill the page. */
export class PicoBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[PicoBoundary]", error); }
  render() {
    if (this.state.error) return null; // silently hide Pico if it crashes
    return this.props.children;
  }
}
