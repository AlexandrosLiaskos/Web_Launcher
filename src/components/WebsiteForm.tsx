import { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { Website } from '../store/websiteStore'

interface WebsiteFormProps {
  onSubmit: (website: Omit<Website, 'id' | 'frecency' | 'lastVisited' | 'totalVisits' | 'createdAt'>) => void
  onClose: () => void
  initialData?: Partial<Website>
  categories: string[]
}

export function WebsiteForm({ onSubmit, onClose, initialData, categories }: WebsiteFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    url: initialData?.url || '',
    description: initialData?.description || '',
    category: initialData?.category || '',
    tags: initialData?.tags?.join(', ') || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title: formData.title,
      url: formData.url.startsWith('http') ? formData.url : `https://${formData.url}`,
      description: formData.description,
      category: formData.category,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[500px] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {initialData ? 'Edit Website' : 'Add New Website'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              placeholder="Website Title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              URL
            </label>
            <input
              type="text"
              value={formData.url}
              onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              placeholder="https://example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              placeholder="Brief description of the website"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 rounded-md border border-gray-600 text-white focus:outline-none focus:border-blue-500"
              placeholder="development, tools, productivity"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
            >
              {initialData ? 'Save Changes' : 'Add Website'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
