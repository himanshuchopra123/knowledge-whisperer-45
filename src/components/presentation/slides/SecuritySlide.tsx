import { Slide } from "../Slide";
import { Shield, Lock, Key, Users } from "lucide-react";

export function SecuritySlide() {
  return (
    <Slide
      title="Security & Access Control"
      subtitle="Data protection at every layer"
    >
      <div className="w-full max-w-5xl mx-auto grid grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl border border-border flex items-start gap-4">
            <Shield className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <div className="text-xl font-bold text-foreground mb-2">Row Level Security</div>
              <p className="text-muted-foreground">
                PostgreSQL RLS policies ensure users can only access their own documents
                and search history.
              </p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border flex items-start gap-4">
            <Lock className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <div className="text-xl font-bold text-foreground mb-2">JWT Authentication</div>
              <p className="text-muted-foreground">
                All edge functions validate JWT tokens to ensure authenticated access
                to backend services.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl border border-border flex items-start gap-4">
            <Key className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <div className="text-xl font-bold text-foreground mb-2">Encrypted Tokens</div>
              <p className="text-muted-foreground">
                Third-party OAuth tokens (Notion, Google) are encrypted at rest
                using application-level encryption.
              </p>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border flex items-start gap-4">
            <Users className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <div className="text-xl font-bold text-foreground mb-2">Scoped Access</div>
              <p className="text-muted-foreground">
                Each user manages their own integrations with isolated access
                to connected services.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
}
