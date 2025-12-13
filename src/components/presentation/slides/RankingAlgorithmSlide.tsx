import { Slide } from "../Slide";

export function RankingAlgorithmSlide() {
  return (
    <Slide
      title="Ranking Algorithm"
      subtitle="Multi-factor weighted scoring for optimal results"
    >
      <div className="w-full max-w-5xl mx-auto space-y-8">
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-xl border border-primary text-center">
            <div className="text-5xl font-bold text-primary mb-2">70%</div>
            <div className="text-lg font-semibold text-foreground">Semantic</div>
            <div className="text-sm text-muted-foreground mt-2">
              Vector cosine similarity
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border text-center">
            <div className="text-5xl font-bold text-primary/70 mb-2">10%</div>
            <div className="text-lg font-semibold text-foreground">Recency</div>
            <div className="text-sm text-muted-foreground mt-2">
              Newer docs preferred
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border text-center">
            <div className="text-5xl font-bold text-primary/70 mb-2">10%</div>
            <div className="text-lg font-semibold text-foreground">Position</div>
            <div className="text-sm text-muted-foreground mt-2">
              Earlier chunks boosted
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border text-center">
            <div className="text-5xl font-bold text-primary/70 mb-2">10%</div>
            <div className="text-lg font-semibold text-foreground">Metadata</div>
            <div className="text-sm text-muted-foreground mt-2">
              Title/filename matches
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎯</div>
              <div>
                <div className="font-semibold text-foreground">Similarity Threshold</div>
                <div className="text-muted-foreground">
                  Minimum 0.15 score to qualify for results
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="flex items-center gap-4">
              <div className="text-4xl">📚</div>
              <div>
                <div className="font-semibold text-foreground">Diversity Control</div>
                <div className="text-muted-foreground">
                  Max 3 chunks per document to prevent over-representation
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}
