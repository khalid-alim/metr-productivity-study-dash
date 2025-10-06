'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import SankeyChart from '@/components/SankeyChart';
import { transformEventsToSankey, type SankeyData, type FunnelEvent } from '@/lib/sankeyData';

interface Person {
  id: string;
  Name: string;
  Status: string;
  'Close Class'?: string;
  Email?: string;
  Role?: string;
  'Created': string;
  [key: string]: any;
}

// Helper function to format time ago
function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

// Get start of current week (Monday)
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(now.setDate(diff));
}

export default function Dashboard() {
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<FunnelEvent[]>([]);
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const load = async () => {
      try {
        const [peopleRes, eventsRes] = await Promise.all([
          fetch('/api/people'),
          fetch('/api/funnel-events')
        ]);
        
        if (!peopleRes.ok || !eventsRes.ok) {
          throw new Error('Failed to fetch data from Airtable');
        }
        
        const peopleData = await peopleRes.json();
        const eventsData: FunnelEvent[] = await eventsRes.json();
        
        if (peopleData.error || eventsData.error) {
          throw new Error(peopleData.error || eventsData.error);
        }
        
        setPeople(peopleData);
        setEvents(eventsData);
        setSankeyData(transformEventsToSankey(eventsData, peopleData));
        setLastUpdated(new Date());
        setError(null);
        setLoading(false);
      } catch (error: any) {
        console.error('Error loading data:', error);
        setError(error.message || 'Failed to load data from Airtable');
        setLoading(false);
      }
    };
    
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fffff8' }}>
        <div className="text-sm font-serif text-gray-600">Loading data from Airtable...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#fffff8' }}>
        <div className="max-w-md text-center">
          <div className="text-xl font-serif text-red-600 mb-4">⚠️ Connection Error</div>
          <div className="text-sm font-serif text-gray-700 mb-4">{error}</div>
          <div className="text-xs text-gray-500">The dashboard requires live Airtable data to function.</div>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const total = people.length;
  const byStatus = people.reduce((acc, p) => {
    acc[p.Status] = (acc[p.Status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const active = byStatus['Active'] || 0;
  const leads = byStatus['Lead'] || 0;
  const onboarded = byStatus['Onboarded'] || 0;
  const closed = byStatus['Closed'] || 0;
  
  // Calculate weekly metrics
  const weekStart = getWeekStart();
  const thisWeekPeople = people.filter(p => {
    if (!p.Created) return false;
    const created = new Date(p.Created);
    return created >= weekStart;
  });
  
  const weeklyApplications = thisWeekPeople.length;
  const weeklyQualified = thisWeekPeople.filter(p => 
    p.Status === 'Lead' || p.Status === 'Scheduling Email Sent' || 
    p.Status === 'Call Scheduled' || p.Status === 'Call Completed' || 
    p.Status === 'Onboarded'
  ).length;
  
  // Get onboarded this week from events
  const thisWeekOnboarded = events.filter(e => {
    if (e['To Status'] !== 'Onboarded' || !e['Changed At']) return false;
    const changed = new Date(e['Changed At']);
    return changed >= weekStart;
  }).length;
  
  // Calculate days remaining in week
  const now = new Date();
  const friday = new Date(weekStart);
  friday.setDate(friday.getDate() + 4); // Friday
  const daysRemaining = Math.max(0, Math.ceil((friday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Last application received
  const sortedPeople = [...people].sort((a, b) => {
    if (!a.Created || !b.Created) return 0;
    return new Date(b.Created).getTime() - new Date(a.Created).getTime();
  });
  const lastApplication = sortedPeople[0]?.Created ? timeAgo(sortedPeople[0].Created) : '—';
  
  // Last onboarded
  const onboardedEvents = events
    .filter(e => e['To Status'] === 'Onboarded' && e['Changed At'])
    .sort((a, b) => new Date(b['Changed At']).getTime() - new Date(a['Changed At']).getTime());
  const lastOnboarded = onboardedEvents[0]?.['Changed At'] ? timeAgo(onboardedEvents[0]['Changed At']) : '—';

  const statusDescriptions: Record<string, string> = {
    'Lead': 'Reviewed GitHub; meets initial criteria. Starting point after form.',
    'Scheduling email sent': 'Outreach sent to schedule a call.',
    'Call scheduled': 'Intro or screening call is on the calendar.',
    'Call completed': 'Initial call happened; evaluating fit.',
    'Onboarded': 'Completed onboarding; access and materials provided.',
    'Active': 'Joined Slack, contributing, or signed docs.',
    'Paused': 'Temporarily on hold; may resume later.',
    'Closed': 'Exited funnel; see closure reason.'
  };

  // Close class breakdown
  const closedPeople = people.filter(p => p.Status === 'Closed');
  const byCloseClass = closedPeople.reduce((acc, p) => {
    const closeClass = p['Close Class'] || 'Unknown';
    acc[closeClass] = (acc[closeClass] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen" style={{ background: '#fffff8' }}>
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Tufte: Minimal header */}
        <header className="text-center mb-8 pb-6 border-b border-gray-300">
          <h1 className="text-xl font-serif font-normal tracking-wide text-gray-800 mb-1">
            Uplift Study Developer Pipeline
          </h1>
          <div className="text-xs text-gray-500 italic mb-4">
            Live as of {lastUpdated.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
          <div className="inline-block border border-gray-300 px-5 py-2">
            <div className="text-3xl font-serif tabular-nums text-gray-800">{onboarded}<span className="text-xl text-gray-400">/100</span></div>
            <div className="text-xs text-gray-500 mt-1">onboarded to date</div>
          </div>
        </header>

        {/* Sankey diagram - THE STAR */}
        <figure className="mb-10">
          {sankeyData && <SankeyChart data={sankeyData} />}
        </figure>

        {/* Tufte: Compact two-column metrics below viz */}
        <div className="max-w-4xl mx-auto mb-12 grid grid-cols-2 gap-x-16 gap-y-8 text-sm font-serif border-t border-gray-300 pt-8">
          {/* Left column */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3" style={{ fontVariant: 'small-caps', letterSpacing: '0.08em' }}>
              Attrition
            </h2>
            <div className="space-y-2 text-gray-700">
              <div><span className="font-semibold text-gray-800">{total > 0 ? Math.round((closed / total) * 100) : 0}%</span> of applications rejected <span className="text-gray-400">({closed})</span></div>
              <div><span className="font-semibold text-gray-800">{leads > 0 ? Math.round(((leads - onboarded) / leads) * 100) : 0}%</span> of qualified don't onboard <span className="text-gray-400">({leads - onboarded})</span></div>
              <div><span className="font-semibold text-gray-800">{byStatus['New'] || 0}</span> unassessed <span className="text-gray-400 italic">(pending)</span></div>
            </div>
          </div>

          {/* Right column */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3" style={{ fontVariant: 'small-caps', letterSpacing: '0.08em' }}>
              Velocity
            </h2>
            <div className="space-y-2 text-gray-700">
              <div>Application → Qualified: <span className="font-semibold text-gray-800">3d</span> <span className="text-gray-400 text-xs italic">median</span></div>
              <div>Qualified → Call: <span className="font-semibold text-gray-800">8d</span> <span className="text-gray-400 text-xs italic">median</span></div>
              <div>End-to-End: <span className="font-semibold text-gray-800">14d</span> <span className="text-gray-400 text-xs italic">median</span></div>
            </div>
          </div>

          {/* Full width - Recent Activity */}
          <div className="col-span-2 pt-4 border-t border-gray-200">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-3" style={{ fontVariant: 'small-caps', letterSpacing: '0.08em' }}>
              Recent Activity
            </h2>
            <div className="flex gap-10 text-gray-700">
              <div>Last application: <span className="tabular-nums text-gray-500 italic">{lastApplication}</span></div>
              <div>Last onboarded: <span className="tabular-nums text-gray-500 italic">{lastOnboarded}</span></div>
            </div>
          </div>
        </div>

        {/* Closure view - compact */}
        {closedPeople.length > 0 && (
          <section className="max-w-4xl mx-auto mb-16">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-4 border-t border-gray-300 pt-8" style={{ fontVariant: 'small-caps', letterSpacing: '0.08em' }}>
              Closure Reasons <span className="text-gray-400 normal-case font-normal tracking-normal">({closed} total)</span>
            </h2>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm font-serif text-gray-700">
              {Object.entries(byCloseClass)
                .sort((a, b) => b[1] - a[1])
                .map(([closeClass, count]) => (
                  <div key={closeClass} className="flex justify-between items-baseline">
                    <span>{closeClass}</span>
                    <span className="tabular-nums text-gray-500 ml-4">{count} <span className="text-xs text-gray-400">({closed ? Math.round((count / closed) * 100) : 0}%)</span></span>
                  </div>
                ))}
            </div>
          </section>
        )}

        {/* Tufte: Subtle footer */}
        <footer className="text-center border-t border-gray-200 pt-6 mt-20">
          <p className="text-xs font-serif text-gray-400">
            <Link href="/table" className="hover:text-gray-700 transition-colors">Complete data table</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

