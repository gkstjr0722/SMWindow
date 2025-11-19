import * as React from "react";

// Simple stub implementations so we don't depend on @radix-ui/react-tooltip.
// They just render their children as-is.
export const TooltipProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => <>{children}</>;

export const Tooltip: React.FC<React.PropsWithChildren> = ({ children }) => (
  <>{children}</>
);

export const TooltipTrigger: React.FC<React.PropsWithChildren> = ({
  children,
}) => <>{children}</>;

export const TooltipContent: React.FC<React.PropsWithChildren> = ({
  children,
}) => <>{children}</>;
