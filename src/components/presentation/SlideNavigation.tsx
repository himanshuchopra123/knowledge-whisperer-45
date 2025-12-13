import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

interface SlideNavigationProps {
  currentSlide: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
  onGoToSlide: (index: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function SlideNavigation({
  currentSlide,
  totalSlides,
  onPrevious,
  onNext,
  onGoToSlide,
  isFullscreen,
  onToggleFullscreen,
}: SlideNavigationProps) {
  return (
    <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-10">
      <Button
        variant="outline"
        size="icon"
        onClick={onPrevious}
        disabled={currentSlide === 0}
        className="bg-background/80 backdrop-blur-sm"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            onClick={() => onGoToSlide(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSlide
                ? "bg-primary w-4"
                : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
            }`}
          />
        ))}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={onNext}
        disabled={currentSlide === totalSlides - 1}
        className="bg-background/80 backdrop-blur-sm"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={onToggleFullscreen}
        className="bg-background/80 backdrop-blur-sm ml-4"
      >
        {isFullscreen ? (
          <Minimize className="h-4 w-4" />
        ) : (
          <Maximize className="h-4 w-4" />
        )}
      </Button>

      <span className="text-sm text-muted-foreground ml-2">
        {currentSlide + 1} / {totalSlides}
      </span>
    </div>
  );
}
