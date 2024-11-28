"use client";
import { cn } from "../../lib/utils";
import React, { ReactNode } from "react";
 
interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children: ReactNode;
  showRadialGradient?: boolean;
}
 
export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        "relative min-h-screen bg-gray-950 overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0">
        <div
          className={cn(
            `absolute inset-0 
            [--aurora:repeating-linear-gradient(100deg,var(--blue-500/10)_10%,var(--indigo-500/10)_15%,var(--purple-500/10)_20%,var(--blue-600/10)_25%,var(--indigo-600/10)_30%)]
            [background-image:var(--aurora)]
            [background-size:300%_300%]
            [background-position:50%_50%]
            filter blur-[100px]
            after:content-[""]
            after:absolute
            after:inset-0
            after:[background-image:var(--aurora)]
            after:[background-size:200%_200%]
            after:animate-aurora
            after:[background-attachment:fixed]
            after:mix-blend-multiply
            pointer-events-none
            opacity-50
            will-change-transform
            -z-10`,
            showRadialGradient &&
              `[mask-image:radial-gradient(ellipse_at_100%_0%,black_30%,transparent_70%)]`
          )}
        />
      </div>
      <div className="relative w-full">
        {children}
      </div>
    </div>
  );
};
