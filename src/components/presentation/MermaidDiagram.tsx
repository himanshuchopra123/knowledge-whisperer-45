import { useEffect, useRef } from "react";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;
      
      const mermaid = (await import("mermaid")).default;
      
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#3b82f6",
          primaryTextColor: "#ffffff",
          primaryBorderColor: "#60a5fa",
          lineColor: "#94a3b8",
          secondaryColor: "#1e293b",
          tertiaryColor: "#0f172a",
          background: "#0f172a",
          mainBkg: "#1e293b",
          nodeBorder: "#3b82f6",
          clusterBkg: "#1e293b",
          titleColor: "#f1f5f9",
          edgeLabelBackground: "#1e293b",
        },
        flowchart: {
          htmlLabels: true,
          curve: "basis",
        },
      });

      try {
        containerRef.current.innerHTML = "";
        const { svg } = await mermaid.render(
          `mermaid-${Math.random().toString(36).substr(2, 9)}`,
          chart
        );
        containerRef.current.innerHTML = svg;
      } catch (error) {
        console.error("Mermaid rendering error:", error);
        containerRef.current.innerHTML = `<pre class="text-destructive">${chart}</pre>`;
      }
    };

    renderDiagram();
  }, [chart]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: "200px" }}
    />
  );
}
