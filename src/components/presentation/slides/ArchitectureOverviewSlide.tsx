import { Slide } from "../Slide";
import { MermaidDiagram } from "../MermaidDiagram";

const architectureDiagram = `
graph TB
    subgraph User["👤 User Layer"]
        UI[React Frontend]
    end
    
    subgraph Edge["⚡ Edge Functions"]
        PROC[process-document]
        PARSE[parse-query-intent]
        SEARCH[semantic-search]
        GEN[generate-answer]
    end
    
    subgraph Data["💾 Data Layer"]
        DOCS[(documents)]
        CHUNKS[(document_chunks)]
        VEC[pgvector]
    end
    
    subgraph AI["🤖 AI Services"]
        HF[HuggingFace Embeddings]
        LAI[Lovable AI - Gemini]
    end
    
    UI --> PROC
    UI --> PARSE
    PARSE --> SEARCH
    SEARCH --> GEN
    GEN --> UI
    
    PROC --> HF
    PROC --> CHUNKS
    SEARCH --> HF
    SEARCH --> VEC
    GEN --> LAI
    
    CHUNKS --> VEC
    DOCS --> CHUNKS
`;

export function ArchitectureOverviewSlide() {
  return (
    <Slide
      title="High-Level Architecture"
      subtitle="Four-layer design for scalable document intelligence"
    >
      <div className="w-full max-w-5xl mx-auto">
        <MermaidDiagram chart={architectureDiagram} className="w-full" />
      </div>
    </Slide>
  );
}
