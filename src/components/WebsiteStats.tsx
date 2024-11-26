import { ChartBarIcon, ClockIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/solid'
import { Website } from '../store/websiteStore'

interface WebsiteStatsProps {
  website: Website
  stats: {
    totalVisits: number
    lastVisited: number
    averageVisitsPerDay: number
  }
}

export function WebsiteStats({ website, stats }: WebsiteStatsProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-700 pb-4">
        <h3 className="text-lg font-semibold text-white">{website.title}</h3>
        <span className="text-sm text-gray-400">Added {formatDate(website.createdAt)}</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-blue-400 mb-2">
            <ChartBarIcon className="w-5 h-5" />
            <span className="font-medium">Total Visits</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.totalVisits.toLocaleString()}
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-green-400 mb-2">
            <ArrowTrendingUpIcon className="w-5 h-5" />
            <span className="font-medium">Daily Average</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.averageVisitsPerDay.toFixed(1)}
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-purple-400 mb-2">
            <ClockIcon className="w-5 h-5" />
            <span className="font-medium">Last Visit</span>
          </div>
          <div className="text-sm text-white">
            {formatDate(stats.lastVisited)}
          </div>
        </div>
      </div>

      <div className="pt-4 space-y-2">
        {website.description && (
          <p className="text-gray-300">{website.description}</p>
        )}
        
        {website.tags && website.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {website.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {website.category && (
          <div className="text-sm text-gray-400">
            Category: <span className="text-blue-400">{website.category}</span>
          </div>
        )}
      </div>
    </div>
  )
}
