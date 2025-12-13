import { Slide } from "../Slide";
import { MermaidDiagram } from "../MermaidDiagram";

const integrationsDiagram = `
flowchart LR
    subgraph Sources["📁 Data Sources"]
        UP["File Upload"]
        NOT["Notion"]
        GD["Google Drive"]
    end
    
    subgraph Auth["🔐 OAuth"]
        NA["notion-auth"]
        GA["google-drive-auth"]
    end
    
    subgraph Import["📥 Import"]
        NI["notion-import"]
        GI["google-drive-import"]
        GS["google-drive-sync"]
    end
    
    subgraph Process["⚙️ Processing"]
        PD["process-document"]
    end
    
    UP --> PD
    NOT --> NA --> NI --> PD
    GD --> GA --> GI --> PD
    GA --> GS --> PD
`;

export function IntegrationsSlide() {
  return (
    <Slide
      title="Multi-Source Integration"
      subtitle="Unified document access across platforms"
    >
      <div className="w-full space-y-8">
        <MermaidDiagram chart={integrationsDiagram} className="w-full max-w-4xl mx-auto" />

        <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="text-3xl mb-4">📤</div>
            <div className="text-xl font-bold text-foreground mb-2">File Upload</div>
            <ul className="space-y-1 text-muted-foreground text-sm">
              <li>• Direct PDF/DOCX upload</li>
              <li>• Drag and drop support</li>
              <li>• Immediate processing</li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="text-3xl mb-4">📓</div>
            <div className="text-xl font-bold text-foreground mb-2">Notion</div>
            <ul className="space-y-1 text-muted-foreground text-sm">
              <li>• OAuth integration</li>
              <li>• Page selection import</li>
              <li>• Encrypted token storage</li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <div className="text-3xl mb-4">📁</div>
            <div className="text-xl font-bold text-foreground mb-2">Google Drive</div>
            <ul className="space-y-1 text-muted-foreground text-sm">
              <li>• OAuth integration</li>
              <li>• Auto-sync capability</li>
              <li>• Multi-format support</li>
            </ul>
          </div>
        </div>
      </div>
    </Slide>
  );
}
