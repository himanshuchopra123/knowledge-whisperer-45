import { Slide } from "../Slide";
import { MermaidDiagram } from "../MermaidDiagram";

const ingestionDiagram = `
flowchart LR
    A["📄 Document\nUpload"] --> B["📝 Text\nExtraction"]
    B --> C["✂️ Chunking\n~512 tokens"]
    C --> D["🔢 Embedding\nGeneration"]
    D --> E["💾 pgvector\nStorage"]
    
    B1["PDF"] --> B
    B2["DOCX"] --> B
    B3["Google Docs"] --> B
    B4["Notion Pages"] --> B
`;

export function IngestionPipelineSlide() {
  return (
    <Slide
      title="Document Ingestion Pipeline"
      subtitle="From raw documents to searchable vectors"
    >
      <div className="w-full space-y-8">
        <MermaidDiagram chart={ingestionDiagram} className="w-full max-w-4xl mx-auto" />
        
        <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="bg-card p-4 rounded-lg border border-border text-center">
            <div className="text-2xl mb-2">📄</div>
            <div className="font-semibold text-foreground">PDF</div>
            <div className="text-sm text-muted-foreground">pdfjs-serverless</div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border text-center">
            <div className="text-2xl mb-2">📝</div>
            <div className="font-semibold text-foreground">DOCX</div>
            <div className="text-sm text-muted-foreground">mammoth</div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border text-center">
            <div className="text-2xl mb-2">📁</div>
            <div className="font-semibold text-foreground">Google Drive</div>
            <div className="text-sm text-muted-foreground">OAuth + API</div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border text-center">
            <div className="text-2xl mb-2">📓</div>
            <div className="font-semibold text-foreground">Notion</div>
            <div className="text-sm text-muted-foreground">OAuth + API</div>
          </div>
        </div>
      </div>
    </Slide>
  );
}
