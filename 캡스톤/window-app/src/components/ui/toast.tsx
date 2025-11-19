// React-only stub for toast UI to avoid Radix dependencies.
// It satisfies existing imports but renders no visual toast UI.

import * as React from "react";

export type ToastProps = {
  id?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
};

export type ToastActionElement = React.ReactElement | null | undefined;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function ToastViewport(_props: ToastProps) {
  return null;
}

export function Toast(_props: ToastProps) {
  return null;
}

export function ToastTitle(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function ToastDescription(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}

export function ToastClose(_props: ToastProps) {
  return null;
}

export const toast = {
  success: (msg: string) => console.log("[toast success]", msg),
  error: (msg: string) => console.error("[toast error]", msg),
  info: (msg: string) => console.log("[toast info]", msg),
};
