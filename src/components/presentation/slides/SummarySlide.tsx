import { Slide } from "../Slide";
import { Zap, Brain, Layers, Search, Shield, RefreshCw } from "lucide-react";

export function SummarySlide() {
  return (
    <Slide
      title="Key Differentiators"
      subtitle="What makes this system unique"
    >
      <div className="w-full max-w-5xl mx-auto grid grid-cols-3 gap-6">
        <div className="bg-card p-8 rounded-xl border border-primary">
          <Layers className="h-10 w-10 text-primary mb-4" />
          <div className="text-xl font-bold text-foreground mb-2">Multi-Source Ingestion</div>
          <p className="text-muted-foreground">
            Unified search across uploads, Notion, and Google Drive with consistent processing.
          </p>
        </div>

        <div className="bg-card p-8 rounded-xl border border-border">
          <Brain className="h-10 w-10 text-primary mb-4" />
          <div className="text-xl font-bold text-foreground mb-2">Intelligent Intent Parsing</div>
          <p className="text-muted-foreground">
            AI understands natural language queries with time filters, sorting, and owner detection.
          </p>
        </div>

        <div className="bg-card p-8 rounded-xl border border-border">
          <Search className="h-10 w-10 text-primary mb-4" />
          <div className="text-xl font-bold text-foreground mb-2">Hybrid Ranking</div>
          <p className="text-muted-foreground">
            Combines semantic similarity with recency, position, and metadata for optimal results.
          </p>
        </div>

        <div className="bg-card p-8 rounded-xl border border-border">
          <Zap className="h-10 w-10 text-primary mb-4" />
          <div className="text-xl font-bold text-foreground mb-2">AI-Powered Answers</div>
          <p className="text-muted-foreground">
            RAG-based responses with Gemini, grounded in your documents with source citations.
          </p>
        </div>

        <div className="bg-card p-8 rounded-xl border border-border">
          <RefreshCw className="h-10 w-10 text-primary mb-4" />
          <div className="text-xl font-bold text-foreground mb-2">Real-Time Processing</div>
          <p className="text-muted-foreground">
            Documents are processed and searchable immediately after upload or import.
          </p>
        </div>

        <div className="bg-card p-8 rounded-xl border border-border">
          <Shield className="h-10 w-10 text-primary mb-4" />
          <div className="text-xl font-bold text-foreground mb-2">Secure by Design</div>
          <p className="text-muted-foreground">
            RLS, JWT auth, encrypted tokens, and user-scoped access throughout.
          </p>
        </div>
      </div>
    </Slide>
  );
}
