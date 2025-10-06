export interface Person {
  id: string;
  Name: string;
  Status: string;
  'Close Class'?: string;
  [key: string]: string | number | boolean | undefined | string[];
}

export interface FunnelEvent {
  id: string;
  'From Status': string;
  'To Status': string;
  'Changed At': string;
  Lead?: string[];
  [key: string]: string | number | boolean | undefined | string[];
}

export interface SankeyNode {
  name: string;
  category: 'active' | 'closed' | 'paused';
}

export interface SankeyLink {
  source: number | string;
  target: number | string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function transformEventsToSankey(_events: FunnelEvent[], people?: Person[]): SankeyData {
  // Use live Airtable data only - no fallback
  if (!people || people.length === 0) {
    throw new Error('No data available from Airtable');
  }
  
  return transformLiveDataToSankey(people);
}

// Transform live Airtable data into Sankey format
function transformLiveDataToSankey(people: Person[]): SankeyData {
  // Count people currently in each status
  const statusCounts: Record<string, number> = {};
  people.forEach(person => {
    const status = person.Status;
    if (status) {
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    }
  });

  // Map Airtable statuses to our Sankey nodes - simplified with descriptive labels
  const nodes: SankeyNode[] = [
    { name: 'Applications', category: 'active' },
    { name: 'Unassessed', category: 'paused' },
    { name: 'Closed/Rejected', category: 'closed' },
    { name: 'Qualified', category: 'active' },
    { name: 'Waiting on Reply', category: 'paused' },
    { name: 'Call Upcoming', category: 'active' },
    { name: 'Call Completed', category: 'active' },
    { name: 'Onboarded', category: 'active' },
    { name: 'Paused', category: 'paused' },
  ];

  // Get current counts for each status
  const unassessedCount = statusCounts['New'] || 0;
  const leadCount = statusCounts['Lead'] || 0;
  const schedulingCount = statusCounts['Scheduling Email Sent'] || 0;
  const callScheduledCount = statusCounts['Call Scheduled'] || 0;
  const callCompletedCount = statusCounts['Call Completed'] || 0;
  const onboardedCount = statusCounts['Onboarded'] || 0;
  const activeCount = statusCounts['Active'] || 0;
  const pausedCount = statusCounts['Paused'] || 0;
  const closedCount = statusCounts['Closed'] || 0;


  // Count people who dropped off AFTER qualifying (using Close Class)
  const closedPeople = people.filter(p => p.Status === 'Closed');
  let closedAfterCall = 0;
  let closedAfterOnboarding = 0;
  
  closedPeople.forEach(person => {
    const closeClass = person['Close Class'] || '';
    // Match variations: "Disqualified — After Call", "Withdrew — After Call"
    if (closeClass.toLowerCase().includes('after call')) {
      closedAfterCall++;
    } else if (closeClass.toLowerCase().includes('after onboard')) {
      closedAfterOnboarding++;
    }
  });

  // Calculate the initial closed count (rejected before qualifying)
  const closedInitially = closedCount - closedAfterCall - closedAfterOnboarding;

  // Total qualified = everyone who entered the pipeline after initial screening
  // This includes: Lead + Scheduling + Call Scheduled + Call Completed + Onboarded + Active + Paused + those who dropped after qualifying
  const totalQualified = leadCount + schedulingCount + callScheduledCount + callCompletedCount + 
                         onboardedCount + activeCount + pausedCount + closedAfterCall + closedAfterOnboarding;
  
  // SIMPLIFIED FLOW LOGIC:
  // Qualified splits into current states that explain WHERE people are:
  // - "Waiting on Reply" = Scheduling Email Sent status (awaiting response)
  // - "Call Upcoming" = Call Scheduled status (on the calendar)
  // - Flow through to Call Completed (those who had their calls)
  
  // People waiting on reply to scheduling email
  const waitingOnReply = schedulingCount;
  
  // People with upcoming calls on calendar
  const callUpcoming = callScheduledCount;
  
  // People who completed calls (and continue in pipeline)
  const completedCalls = callCompletedCount + onboardedCount + activeCount + pausedCount + closedAfterCall + closedAfterOnboarding;
  
  // From Call Completed: people split to Onboarded, Paused, or Closed
  // Important: People who closed after onboarding exit at Call Completed stage for clearer visualization
  const flowToOnboarded = onboardedCount + activeCount; // Only current onboarded, not those who later closed
  const flowToPaused = pausedCount;
  const flowToClosedFromCall = closedAfterCall + closedAfterOnboarding; // Include both call and post-onboarding closures
  
  const links: SankeyLink[] = [
    // Initial split from Applications
    { source: 'Applications', target: 'Unassessed', value: unassessedCount },
    { source: 'Applications', target: 'Qualified', value: totalQualified },
    { source: 'Applications', target: 'Closed/Rejected', value: closedInitially },
    
    // Qualified splits into current states
    { source: 'Qualified', target: 'Waiting on Reply', value: waitingOnReply },
    { source: 'Qualified', target: 'Call Upcoming', value: callUpcoming },
    { source: 'Qualified', target: 'Call Completed', value: completedCalls },
    
    // Exits from Call Completed (all closures happen here for clarity)
    { source: 'Call Completed', target: 'Onboarded', value: flowToOnboarded },
    { source: 'Call Completed', target: 'Paused', value: flowToPaused },
    { source: 'Call Completed', target: 'Closed/Rejected', value: flowToClosedFromCall },
  ];

  return { nodes, links: links.filter(l => l.value > 0) };
}



