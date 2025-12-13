import { Slide } from "../Slide";
import { MermaidDiagram } from "../MermaidDiagram";

const ragDiagram = `
flowchart TB
    Q["User Query"] --> E["Query Embedding"]
    E --> V["Vector Search"]
    V --> R["Top K Results"]
    R --> C["Context Assembly"]
    
    C --> P["Prompt Construction"]
    P --> AI["Lovable AI\n(Gemini 2.5 Flash)"]
    AI --> A["Generated Answer"]
    A --> CITE["+ Source Citations"]
`;

export function RAGFlowSlide() {
  return (
    <Slide
      title="RAG Answer Generation"
      subtitle="Context-aware AI responses with source attribution"
    >
      <div className="w-full max-w-5xl mx-auto grid grid-cols-2 gap-8">
        <div>
          <MermaidDiagram chart={ragDiagram} className="w-full" />
        </div>

        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="text-xl font-bold text-foreground mb-3">Context Injection</h3>
            <p className="text-muted-foreground">
              Retrieved document chunks are assembled into a coherent context
              that provides the AI with relevant information to generate
              accurate, grounded answers.
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="text-xl font-bold text-foreground mb-3">AI Model</h3>
            <div className="p-3 bg-primary/10 rounded-lg font-mono text-primary">
              google/gemini-2.5-flash
            </div>
            <p className="text-muted-foreground mt-3">
              Fast, accurate responses via Lovable AI integration
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="text-xl font-bold text-foreground mb-3">Source Citations</h3>
            <p className="text-muted-foreground">
              Every answer includes links to original documents for
              verification and deeper exploration.
            </p>
          </div>
        </div>
      </div>
    </Slide>
  );
}
