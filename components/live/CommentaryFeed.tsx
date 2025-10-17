'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp, Clock, Users, Filter, RefreshCw } from 'lucide-react';
import type { RaceUpdate } from '@/types/live-race';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import ReactCountryFlag from 'react-country-flag';
import { getCountryCodeForFlag } from '@/lib/utils/country-codes';

type FilterType = 'all' | 'high' | 'ai';

export function CommentaryFeed() {
  const { t } = useLanguage();
  const [updates, setUpdates] = useState<RaceUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUpdates();
    // Poll every 15 seconds for new updates
    const interval = setInterval(fetchUpdates, 15000);
    return () => clearInterval(interval);
  }, [filter]);

  async function fetchUpdates() {
    try {
      const params = new URLSearchParams();
      if (filter === 'high') {
        params.set('priority', 'high');
      } else if (filter === 'ai') {
        params.set('type', 'ai');
      }
      params.set('limit', '30');

      const res = await fetch(`/api/race/updates?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setUpdates(data.updates || []);
    } catch (error) {
      console.error('Error fetching commentary:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchUpdates();
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Livekommentar</h2>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1"
          >
            Allt
          </Button>
          <Button
            variant={filter === 'high' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('high')}
            className="flex-1"
          >
            Viktigt
          </Button>
          <Button
            variant={filter === 'ai' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('ai')}
            className="flex-1"
          >
            AI-analys
          </Button>
        </div>
      </div>

      {/* Updates Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {updates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Ingen kommentar än</p>
            <p className="text-xs mt-1">Uppdateringar kommer under loppet</p>
          </div>
        ) : (
          updates.map((update) => (
            <CommentaryCard key={update.id} update={update} />
          ))
        )}
      </div>
    </Card>
  );
}

function CommentaryCard({ update }: { update: RaceUpdate }) {
  const getIcon = () => {
    switch (update.updateType) {
      case 'lead_change':
        return { icon: <TrendingUp className="h-4 w-4" />, color: 'bg-red-500' };
      case 'ai':
        return { icon: <Sparkles className="h-4 w-4" />, color: 'bg-blue-500' };
      case 'milestone':
        return { icon: <Users className="h-4 w-4" />, color: 'bg-green-500' };
      default:
        return { icon: <Clock className="h-4 w-4" />, color: 'bg-gray-500' };
    }
  };

  const getPriorityBadge = () => {
    switch (update.priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Viktigt</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      default:
        return null;
    }
  };

  const { icon, color } = getIcon();

  return (
    <div className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded ${color} text-white flex-shrink-0`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Metadata */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(update.timestamp)}
            </span>
            {getPriorityBadge()}
          </div>

          {/* Commentary Text */}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {update.contentSv || update.content}
          </p>

          {/* Related Countries */}
          {update.relatedCountries && update.relatedCountries.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {update.relatedCountries.map((country) => (
                <div
                  key={country}
                  className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs"
                >
                  <ReactCountryFlag
                    countryCode={getCountryCodeForFlag(country)}
                    svg
                    style={{
                      width: '1em',
                      height: '0.75em',
                    }}
                  />
                  <span>{country}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const time = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (seconds < 60) return 'Nyss';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min sedan`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} tim sedan`;

  return time.toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
