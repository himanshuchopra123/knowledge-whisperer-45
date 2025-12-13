import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface DownloadPdfButtonProps {
  slidesRef: React.RefObject<HTMLDivElement>;
  totalSlides: number;
  onSlideChange: (index: number) => Promise<void>;
}

export function DownloadPdfButton({
  slidesRef,
  totalSlides,
  onSlideChange,
}: DownloadPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!slidesRef.current) return;

    setIsGenerating(true);

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [1920, 1080],
      });

      for (let i = 0; i < totalSlides; i++) {
        await onSlideChange(i);
        await new Promise((resolve) => setTimeout(resolve, 500));

        const canvas = await html2canvas(slidesRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#0f172a",
          width: 1920,
          height: 1080,
        });

        const imgData = canvas.toDataURL("image/png");

        if (i > 0) {
          pdf.addPage([1920, 1080], "landscape");
        }

        pdf.addImage(imgData, "PNG", 0, 0, 1920, 1080);
      }

      pdf.save("rag-architecture-presentation.pdf");
    } catch (error) {
      console.error("PDF generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isGenerating}
      variant="outline"
      className="bg-background/80 backdrop-blur-sm"
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </>
      )}
    </Button>
  );
}
