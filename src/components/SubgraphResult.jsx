import { useState } from 'react'

export default function SubgraphResult({ data, error }) {
  const [copied, setCopied] = useState(false)

  if (error) {
    return (
      <div className="mt-6 p-4 bg-red-900/30 border border-red-700 rounded-md">
        <p className="text-red-400 font-medium">Error</p>
        <p className="text-red-300 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!data) return null

  const singleLine = JSON.stringify([
    data.validatorCount,
    data.networkFeeIndex,
    data.index,
    data.active,
    data.balance,
  ])

  function handleCopy() {
    navigator.clipboard.writeText(singleLine)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-6 space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">Raw JSON</h3>
        <pre className="p-4 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-200 overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-2">
          Single-line Cluster Tuple
        </h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-md text-sm text-green-400 overflow-x-auto block">
            {singleLine}
          </code>
          <button
            onClick={handleCopy}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-md transition-colors whitespace-nowrap"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
