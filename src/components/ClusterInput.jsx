import { useState } from 'react'

export default function ClusterInput({ onSubmit, loading }) {
  const [owner, setOwner] = useState('0xe8c927a1fa792eddefe23fda643a62e03f999830')
  const [operatorIds, setOperatorIds] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmedOwner = owner.trim()
    if (!trimmedOwner || !operatorIds.trim()) return

    const ids = operatorIds
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id))
      .sort((a, b) => a - b)

    if (ids.length === 0) return

    onSubmit(trimmedOwner, ids)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 items-end">
      <div className="flex-[2]">
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Owner Address
        </label>
        <input
          type="text"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          placeholder="0xe8c927a1fa792eddefe23fda643a62e03f999830"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
      </div>
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-400 mb-1">
          Operator IDs
        </label>
        <input
          type="text"
          value={operatorIds}
          onChange={(e) => setOperatorIds(e.target.value)}
          placeholder="5,6,7,523"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors whitespace-nowrap"
      >
        {loading ? 'Fetching...' : 'Fetch'}
      </button>
    </form>
  )
}
