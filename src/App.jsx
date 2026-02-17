import { useState } from 'react'
import ClusterInput from './components/ClusterInput'
import ClusterDashboard from './components/ClusterDashboard'
import NetworkParams from './components/NetworkParams'
import { fetchCluster } from './services/subgraph'
import {
  getClusterAssetType,
  fetchOperatorData,
  fetchClusterContractData,
  fetchNetworkParams,
  getCurrentBlock,
} from './services/contract'

function App() {
  const [clusterData, setClusterData] = useState(null)
  const [contractData, setContractData] = useState(null)
  const [operators, setOperators] = useState(null)
  const [networkParams, setNetworkParams] = useState(null)
  const [assetType, setAssetType] = useState(null)
  const [currentBlock, setCurrentBlock] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFetch(owner, operatorIds) {
    setLoading(true)
    setError(null)
    setClusterData(null)
    setContractData(null)
    setOperators(null)
    setNetworkParams(null)
    setAssetType(null)
    setCurrentBlock(null)

    try {
      const snapshot = await fetchCluster(owner, operatorIds)
      if (!snapshot) {
        setError('Cluster not found. Check the owner address and operator IDs.')
        return
      }
      setClusterData(snapshot)

      const type = await getClusterAssetType(owner, operatorIds)
      setAssetType(type)

      const [clusterContractData, opResults, params, block] = await Promise.all([
        fetchClusterContractData(owner, operatorIds, snapshot, type),
        Promise.all(
          operatorIds.map(async (id) => {
            const { fee } = await fetchOperatorData(id, type)
            return { id, fee }
          })
        ),
        fetchNetworkParams(type),
        getCurrentBlock(),
      ])

      setContractData(clusterContractData)
      setOperators(opResults)
      setNetworkParams(params)
      setCurrentBlock(block)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <img src="/ssv-logo.png" alt="SSV Network" className="h-[1.875rem] w-auto" />
              <h1 className="text-3xl font-bold">Cluster Debugging & Simulations</h1>
            </div>
            <div className="flex items-center gap-2 border border-green-500/50 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-sm text-green-400">Hoodi Testnet</span>
            </div>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Inspect and debug SSV Network clusters on Hoodi Testnet.
          </p>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
            <ClusterInput onSubmit={handleFetch} loading={loading} />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-md">
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}

        <ClusterDashboard
          contractData={contractData}
          operators={operators}
          networkParams={networkParams}
          assetType={assetType}
          snapshot={clusterData}
          currentBlock={currentBlock}
          onRefreshBlock={async () => {
            const block = await getCurrentBlock()
            setCurrentBlock(block)
          }}
        />

        <NetworkParams params={networkParams} assetType={assetType} />
      </div>
    </div>
  )
}

export default App
