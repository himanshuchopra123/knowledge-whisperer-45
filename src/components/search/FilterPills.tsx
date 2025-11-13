import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, MessageSquare, FolderOpen, Clock, X } from 'lucide-react';

export type SourceFilter = 'slack' | 'drive' | 'notion';
export type TimeFilter = 'today' | 'week' | 'month' | 'all';
export type DocTypeFilter = 'prd' | 'roadmap' | 'discussion' | 'all';

interface FilterPillsProps {
  sources: SourceFilter[];
  onSourcesChange: (sources: SourceFilter[]) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  docType: DocTypeFilter;
  onDocTypeChange: (type: DocTypeFilter) => void;
}

export const FilterPills = ({
  sources,
  onSourcesChange,
  timeFilter,
  onTimeFilterChange,
  docType,
  onDocTypeChange,
}: FilterPillsProps) => {
  const toggleSource = (source: SourceFilter) => {
    if (sources.includes(source)) {
      onSourcesChange(sources.filter(s => s !== source));
    } else {
      onSourcesChange([...sources, source]);
    }
  };

  const activeFilterCount = 
    sources.length + 
    (timeFilter !== 'all' ? 1 : 0) + 
    (docType !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    onSourcesChange([]);
    onTimeFilterChange('all');
    onDocTypeChange('all');
  };

  return (
    <div className="flex flex-wrap items-center gap-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Sources:</span>
        <Button
          variant={sources.includes('slack') ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleSource('slack')}
          className="h-8 transition-all hover-scale"
        >
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
          Slack
        </Button>
        <Button
          variant={sources.includes('drive') ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleSource('drive')}
          className="h-8 transition-all hover-scale"
        >
          <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
          Drive
        </Button>
        <Button
          variant={sources.includes('notion') ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleSource('notion')}
          className="h-8 transition-all hover-scale"
        >
          <FileText className="h-3.5 w-3.5 mr-1.5" />
          Notion
        </Button>
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Time:</span>
        {(['today', 'week', 'month', 'all'] as TimeFilter[]).map((filter) => (
          <Button
            key={filter}
            variant={timeFilter === filter ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTimeFilterChange(filter)}
            className="h-8 transition-all hover-scale"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            {filter === 'today' ? 'Today' : filter === 'week' ? 'This Week' : filter === 'month' ? 'This Month' : 'All Time'}
          </Button>
        ))}
      </div>

      <div className="h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Type:</span>
        {(['prd', 'roadmap', 'discussion', 'all'] as DocTypeFilter[]).map((type) => (
          <Button
            key={type}
            variant={docType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDocTypeChange(type)}
            className="h-8 transition-all hover-scale"
          >
            {type === 'prd' ? 'PRDs' : type === 'roadmap' ? 'Roadmaps' : type === 'discussion' ? 'Discussions' : 'All'}
          </Button>
        ))}
      </div>

      {activeFilterCount > 0 && (
        <>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-8">
              {activeFilterCount} active
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
