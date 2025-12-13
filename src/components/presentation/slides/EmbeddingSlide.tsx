import { Slide } from "../Slide";

export function EmbeddingSlide() {
  return (
    <Slide
      title="Embedding Generation"
      subtitle="Converting text to semantic vectors"
    >
      <div className="w-full max-w-5xl mx-auto space-y-8">
        <div className="grid grid-cols-2 gap-8">
          <div className="bg-card p-8 rounded-xl border border-border">
            <h3 className="text-2xl font-bold text-foreground mb-4">Model</h3>
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="font-mono text-lg text-primary">
                  sentence-transformers/all-MiniLM-L6-v2
                </div>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span> 384-dimensional vectors
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span> Fast inference speed
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span> Optimized for semantic similarity
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-card p-8 rounded-xl border border-border">
            <h3 className="text-2xl font-bold text-foreground mb-4">Storage</h3>
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="font-mono text-lg text-primary">
                  pgvector extension
                </div>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span> PostgreSQL native
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span> Cosine similarity search
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">✓</span> Indexed for performance
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-primary">~512</div>
              <div className="text-muted-foreground">tokens per chunk</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-primary">384</div>
              <div className="text-muted-foreground">dimensions</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-4xl font-bold text-primary">0.15</div>
              <div className="text-muted-foreground">similarity threshold</div>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}
