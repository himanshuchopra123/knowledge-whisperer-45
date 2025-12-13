import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SlideNavigation } from "@/components/presentation/SlideNavigation";
import { DownloadPdfButton } from "@/components/presentation/DownloadPdfButton";
import { TitleSlide } from "@/components/presentation/slides/TitleSlide";
import { ArchitectureOverviewSlide } from "@/components/presentation/slides/ArchitectureOverviewSlide";
import { IngestionPipelineSlide } from "@/components/presentation/slides/IngestionPipelineSlide";
import { EmbeddingSlide } from "@/components/presentation/slides/EmbeddingSlide";
import { SearchPipelineSlide } from "@/components/presentation/slides/SearchPipelineSlide";
import { RankingAlgorithmSlide } from "@/components/presentation/slides/RankingAlgorithmSlide";
import { RAGFlowSlide } from "@/components/presentation/slides/RAGFlowSlide";
import { IntegrationsSlide } from "@/components/presentation/slides/IntegrationsSlide";
import { SecuritySlide } from "@/components/presentation/slides/SecuritySlide";
import { SummarySlide } from "@/components/presentation/slides/SummarySlide";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const slides = [
  TitleSlide,
  ArchitectureOverviewSlide,
  IngestionPipelineSlide,
  EmbeddingSlide,
  SearchPipelineSlide,
  RankingAlgorithmSlide,
  RAGFlowSlide,
  IntegrationsSlide,
  SecuritySlide,
  SummarySlide,
];

export default function Presentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(Math.max(0, Math.min(index, slides.length - 1)));
  }, []);

  const goToPrevious = useCallback(() => {
    goToSlide(currentSlide - 1);
  }, [currentSlide, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(currentSlide + 1);
  }, [currentSlide, goToSlide]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleSlideChange = useCallback(async (index: number) => {
    setCurrentSlide(index);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === "f") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, isFullscreen, toggleFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const CurrentSlideComponent = slides[currentSlide];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-background overflow-hidden"
    >
      {!isFullscreen && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="bg-background/80 backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <DownloadPdfButton
            slidesRef={slideRef}
            totalSlides={slides.length}
            onSlideChange={handleSlideChange}
          />
        </div>
      )}

      <div
        ref={slideRef}
        className="w-full h-full"
        style={{ aspectRatio: "16/9" }}
      >
        <CurrentSlideComponent />
      </div>

      <SlideNavigation
        currentSlide={currentSlide}
        totalSlides={slides.length}
        onPrevious={goToPrevious}
        onNext={goToNext}
        onGoToSlide={goToSlide}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {!isFullscreen && (
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground">
          Press <kbd className="px-1 py-0.5 bg-muted rounded">←</kbd>{" "}
          <kbd className="px-1 py-0.5 bg-muted rounded">→</kbd> to navigate,{" "}
          <kbd className="px-1 py-0.5 bg-muted rounded">F</kbd> for fullscreen
        </div>
      )}
    </div>
  );
}
