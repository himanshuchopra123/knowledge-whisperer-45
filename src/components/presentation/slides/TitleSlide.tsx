import { Slide } from "../Slide";
import { FileSearch, Brain, Database } from "lucide-react";

export function TitleSlide() {
  return (
    <Slide className="items-center justify-center text-center">
      <div className="space-y-8">
        <div className="flex items-center justify-center gap-6">
          <FileSearch className="h-16 w-16 text-primary" />
          <Brain className="h-20 w-20 text-primary" />
          <Database className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground">
          RAG Document Search System
        </h1>
        <p className="text-2xl md:text-3xl text-muted-foreground max-w-3xl mx-auto">
          Retrieval-Augmented Generation for Intelligent Document Discovery
        </p>
        <div className="flex items-center justify-center gap-4 pt-8">
          <span className="px-4 py-2 bg-primary/20 rounded-full text-primary text-sm font-medium">
            Semantic Search
          </span>
          <span className="px-4 py-2 bg-primary/20 rounded-full text-primary text-sm font-medium">
            AI-Powered Answers
          </span>
          <span className="px-4 py-2 bg-primary/20 rounded-full text-primary text-sm font-medium">
            Multi-Source Integration
          </span>
        </div>
      </div>
    </Slide>
  );
}
