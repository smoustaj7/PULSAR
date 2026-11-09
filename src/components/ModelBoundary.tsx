import { Component, type ReactNode } from 'react'

/** Shows `fallback` instead of the 3D model if it throws (no WebGL, model failed to load). */
export class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('3D body model unavailable, showing the 2D figure instead.', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
