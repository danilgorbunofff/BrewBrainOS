'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

type ClientErrorBoundaryProps = {
  children: ReactNode
  fallback: ReactNode
}

type ClientErrorBoundaryState = {
  hasError: boolean
}

export class ClientErrorBoundary extends Component<ClientErrorBoundaryProps, ClientErrorBoundaryState> {
  state: ClientErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ClientErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}