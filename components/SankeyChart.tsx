'use client';
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyLeft } from 'd3-sankey';
import type { SankeyData } from '@/lib/sankeyData';

interface SankeyChartProps {
  data: SankeyData;
  width?: number;
  height?: number;
}

export default function SankeyChart({ data, width = 1400, height = 800 }: SankeyChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;
    if (!data.links || data.links.length === 0) return;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const margin = { top: 40, right: 220, bottom: 80, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Manually assign node layers for proper sequential layout
    const nodeDepthMap: Record<string, number> = {
      'Applications': 0,
      'Unassessed': 1,
      'Closed/Rejected': 5,  // Far right to minimize visual dominance
      'Qualified': 1,
      'Waiting on Reply': 2,
      'Call Upcoming': 2,
      'Call Completed': 2,
      'Onboarded': 3,
      'Paused': 3,
    };

    const graphData: any = {
      nodes: data.nodes.map((d, i) => ({ 
        ...d, 
        index: i,
        depth: nodeDepthMap[d.name] ?? i  // Explicitly set depth/layer
      })),
      links: data.links.map(d => ({ 
        source: d.source, 
        target: d.target, 
        value: d.value 
      }))
    };

    const sankeyGenerator = sankey<any, any>()
      .nodeId((d: any) => d.name)
      .nodeAlign(sankeyLeft)
      .nodeWidth(3) // Tufte: thin data-bearing line, slightly thicker for clarity
      .nodePadding(80) // Much more spacing between nodes to prevent visual overlap
      .extent([[0, 0], [innerWidth, innerHeight]])
      .iterations(100); // More iterations for better layout

    const graph = sankeyGenerator(graphData);
    if (!graph || !graph.nodes || !graph.links) return;

    const nodes = graph.nodes;
    const links = graph.links;

    // Color scheme matching the provided design
    const getNodeColor = (nodeName: string) => {
      if (nodeName === 'Onboarded' || nodeName === 'Qualified' || nodeName === 'Call Completed') return '#1a4a5a'; // success
      if (nodeName === 'Waiting on Reply' || nodeName === 'Call Upcoming' || nodeName === 'Paused') return '#5a7a8a'; // pending
      if (nodeName === 'Unassessed') return '#8a7a4a'; // unreviewed
      if (nodeName === 'Closed/Rejected') return '#aaaaaa'; // closed
      return '#777777'; // neutral (Applications)
    };

    const getLinkColor = (link: any) => {
      if (link.target.name === 'Closed/Rejected') return '#777777';
      if (link.target.name === 'Onboarded' || link.target.name === 'Call Completed') return '#1a4a5a';
      if (link.target.name === 'Waiting on Reply' || link.target.name === 'Call Upcoming' || link.target.name === 'Paused') return '#5a7a8a';
      if (link.target.name === 'Unassessed') return '#8a7a4a';
      return '#1a4a5a';
    };

    const getLinkOpacity = (link: any) => {
      if (link.target.name === 'Closed/Rejected') return 0.20;
      if (link.target.name === 'Waiting on Reply' || link.target.name === 'Call Upcoming' || link.target.name === 'Unassessed') return 0.25;
      return 0.25;
    };

    // Draw links with category-based colors
    const link = g.append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal() as any)
      .attr('stroke', d => getLinkColor(d))
      .attr('stroke-width', d => Math.max(1.5, d.width || 0)) // Minimum 1.5px for visibility
      .attr('opacity', d => getLinkOpacity(d))
      .on('mouseover', function() {
        d3.select(this).attr('opacity', 0.40);
      })
      .on('mouseout', function(event, d: any) {
        d3.select(this).attr('opacity', getLinkOpacity(d));
      });

    // Draw nodes as rectangles
    const node = g.append('g')
      .selectAll('rect')
      .data(nodes)
      .join('rect')
      .attr('x', d => d.x0 || 0)
      .attr('y', d => d.y0 || 0)
      .attr('height', d => (d.y1 || 0) - (d.y0 || 0))
      .attr('width', d => (d.x1 || 0) - (d.x0 || 0))
      .attr('fill', d => getNodeColor(d.name))
      .attr('stroke', 'none');

    // Tufte-style labels: Direct labeling integrated with the visualization
    // Node labels - positioned to avoid overlap, hierarchy through size/weight
    g.append('g')
      .selectAll('text.node-label')
      .data(nodes)
      .join('text')
      .attr('class', 'node-label')
      .attr('x', d => {
        const x = d.x0 || 0;
        // Left-aligned for left-side nodes, right-aligned for right-side nodes
        return x < innerWidth / 2 ? (d.x1 || 0) + 8 : (d.x0 || 0) - 8;
      })
      .attr('y', d => ((d.y0 || 0) + (d.y1 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 || 0) < innerWidth / 2 ? 'start' : 'end')
      .attr('font-family', 'Georgia, serif')
      .attr('font-size', d => {
        // Hierarchy: larger for key nodes
        if (d.name === 'Applications' || d.name === 'Onboarded') return '15px';
        return '13px';
      })
      .attr('font-weight', d => {
        // Emphasis on outcomes
        if (d.name === 'Onboarded') return '600';
        if (d.name === 'Applications') return '500';
        return '400';
      })
      .attr('fill', '#111')
      .text(d => d.name);

    // Value annotations - small, subtle, integrated
    g.append('g')
      .selectAll('text.node-value')
      .data(nodes)
      .join('text')
      .attr('class', 'node-value')
      .attr('x', d => {
        const x = d.x0 || 0;
        return x < innerWidth / 2 ? (d.x1 || 0) + 8 : (d.x0 || 0) - 8;
      })
      .attr('y', d => ((d.y0 || 0) + (d.y1 || 0)) / 2 + 16)
      .attr('text-anchor', d => (d.x0 || 0) < innerWidth / 2 ? 'start' : 'end')
      .attr('font-family', 'Georgia, serif')
      .attr('font-size', '11px')
      .attr('font-variant-numeric', 'tabular-nums')
      .attr('fill', '#666')
      .text(d => `n=${d.value || 0}`);

    // Flow annotations - only for significant transitions (value ≥ 15)
    // Positioned thoughtfully to avoid crossing paths
    const significantFlows = links.filter((d: any) => 
      d.value >= 15 && 
      d.target.name !== 'Closed/Rejected' // Don't label the rejection flow
    );
    
    g.append('g')
      .selectAll('text.flow-value')
      .data(significantFlows)
      .join('text')
      .attr('class', 'flow-value')
      .attr('x', d => {
        const sourceX = d.source.x1 || 0;
        const targetX = d.target.x0 || 0;
        return (sourceX + targetX) / 2;
      })
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '-4px')
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Georgia, serif')
      .attr('font-size', '10px')
      .attr('font-style', 'italic')
      .attr('font-variant-numeric', 'tabular-nums')
      .attr('fill', '#888')
      .text(d => d.value);

    // Tufte: Marginal annotations for key insights
    // Conversion rate from Applications to Qualified
    const applicationsNode = nodes.find(n => n.name === 'Applications');
    const qualifiedNode = nodes.find(n => n.name === 'Qualified');
    
    if (applicationsNode && qualifiedNode) {
      const conversionRate = Math.round((qualifiedNode.value / applicationsNode.value) * 100);
      
      g.append('text')
        .attr('x', (qualifiedNode.x1 || 0) + 8)
        .attr('y', (qualifiedNode.y1 || 0) + 18)
        .attr('font-family', 'Georgia, serif')
        .attr('font-size', '11px')
        .attr('font-style', 'italic')
        .attr('fill', '#888')
        .text(`${conversionRate}% qualification rate`);
    }

    // Completion rate from Qualified to Onboarded
    const onboardedNode = nodes.find(n => n.name === 'Onboarded');
    
    if (qualifiedNode && onboardedNode && onboardedNode.value > 0) {
      const completionRate = Math.round((onboardedNode.value / qualifiedNode.value) * 100);
      
      // Position annotation to the right of Onboarded node, not above it
      g.append('text')
        .attr('x', (onboardedNode.x1 || 0) + 8)
        .attr('y', ((onboardedNode.y0 || 0) + (onboardedNode.y1 || 0)) / 2 + 30)
        .attr('text-anchor', 'start')
        .attr('font-family', 'Georgia, serif')
        .attr('font-size', '11px')
        .attr('font-style', 'italic')
        .attr('fill', '#1a4a5a')
        .attr('font-weight', '500')
        .text(`${completionRate}% of qualified reach onboarding`);
    }

  }, [data, width, height]);

  return (
    <div className="py-2" style={{ background: 'transparent' }}>
      <svg ref={svgRef} width={width} height={height} className="mx-auto" style={{ background: 'transparent' }} />
      
      {/* Tufte-style legend/key: minimal, directly integrated */}
      <div className="flex justify-center gap-10 mt-6 text-sm font-serif text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#1a4a5a' }}></div>
          <span>Active progression</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#5a7a8a' }}></div>
          <span>Pending action</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#8a7a4a' }}></div>
          <span>Unreviewed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#aaaaaa' }}></div>
          <span>Closed</span>
        </div>
      </div>
      
      {/* Tufte: Small annotation for clarity */}
      <div className="text-center mt-4 text-sm font-serif text-gray-500 italic">
        Flow width represents volume; <span className="font-variant-numeric: tabular-nums">n</span> indicates count at each stage
      </div>
    </div>
  );
}


