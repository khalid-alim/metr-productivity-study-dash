'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Person {
  id: string;
  Name: string;
  Status: string;
  'Close Class'?: string;
  Email?: string;
  Role?: string;
  'GitHub Link'?: string;
  'Source/Channel'?: string;
  'Created': string;
  [key: string]: any;
}

export default function TableView() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetch('/api/people')
      .then(res => res.json())
      .then(data => {
        setPeople(data);
        setLoading(false);
      });
  }, []);

  const statuses = ['All', ...Array.from(new Set(people.map(p => p.Status)))];

  const filtered = people.filter(p => {
    const matchesSearch = filter === '' || 
      p.Name?.toLowerCase().includes(filter.toLowerCase()) ||
      p.Email?.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.Status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">All Records</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Close Class</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map(person => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{person.Name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{person.Email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={person.Status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {person['Close Class'] || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">{person.Role}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {person['Source/Channel'] || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
            Showing {filtered.length} of {people.length} records
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'Lead': 'bg-blue-100 text-blue-800',
    'Scheduling email sent': 'bg-cyan-100 text-cyan-800',
    'Call scheduled': 'bg-teal-100 text-teal-800',
    'Call completed': 'bg-green-100 text-green-800',
    'Onboarded': 'bg-emerald-100 text-emerald-800',
    'Active': 'bg-green-200 text-green-900',
    'Paused': 'bg-yellow-100 text-yellow-800',
    'Closed': 'bg-gray-200 text-gray-800',
  };
  const descriptions: Record<string, string> = {
    'Lead': 'Reviewed GitHub; meets initial criteria. Starting point after form.',
    'Scheduling email sent': 'Outreach sent to schedule a call.',
    'Call scheduled': 'Intro or screening call is on the calendar.',
    'Call completed': 'Initial call happened; evaluating fit.',
    'Onboarded': 'Completed onboarding; access and materials provided.',
    'Active': 'Joined Slack, contributing, or signed docs.',
    'Paused': 'Temporarily on hold; may resume later.',
    'Closed': 'Exited funnel; see closure reason.'
  };

  return (
    <span title={descriptions[status] || ''} className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
