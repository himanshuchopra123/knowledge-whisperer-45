import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SlideProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Slide({ children, className, title, subtitle }: SlideProps) {
  return (
    <div
      className={cn(
        "w-full h-full flex flex-col p-8 md:p-12 lg:p-16",
        "bg-gradient-to-br from-background via-background to-muted/30",
        className
      )}
    >
      {(title || subtitle) && (
        <div className="mb-8">
          {title && (
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-2">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-lg md:text-xl text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">{children}</div>
    </div>
  );
}
