import { Slide } from "../Slide";
import { MermaidDiagram } from "../MermaidDiagram";

const searchDiagram = `
flowchart LR
    Q["🔍 User Query"] --> P["🧠 parse-query-intent"]
    P --> S["📊 semantic-search"]
    S --> R["⚖️ Weighted Ranking"]
    R --> G["✨ generate-answer"]
    G --> A["📋 Answer + Citations"]
`;

export function SearchPipelineSlide() {
  return (
    <Slide
      title="Search Pipeline"
      subtitle="From natural language query to intelligent answer"
    >
      <div className="w-full space-y-8">
        <MermaidDiagram chart={searchDiagram} className="w-full max-w-4xl mx-auto" />

        <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="text-xl font-bold text-foreground mb-3">Intent Parsing</div>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li>• Sort order detection</li>
              <li>• Time filters (last week, etc.)</li>
              <li>• Document type filters</li>
              <li>• Owner identification</li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="text-xl font-bold text-foreground mb-3">Semantic Search</div>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li>• Query embedding generation</li>
              <li>• Vector similarity search</li>
              <li>• Multi-factor ranking</li>
              <li>• Diversity control</li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="text-xl font-bold text-foreground mb-3">Answer Generation</div>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li>• Context injection (RAG)</li>
              <li>• Lovable AI (Gemini)</li>
              <li>• Source citation</li>
              <li>• Search history tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </Slide>
  );
}
