import * as React from "react";
import { Toaster as SonnerToaster } from "sonner";

export type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

// Simple Sonner wrapper without next-themes
export function Toaster(props: ToasterProps) {
  return <SonnerToaster richColors closeButton {...props} />;
}
