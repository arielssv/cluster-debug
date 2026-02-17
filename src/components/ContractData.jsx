import { formatEther } from 'ethers'
import { BLOCKS_PER_YEAR } from '../utils/format'

function Row({ label, children }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-700/50">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}

function WeiValue({ value }) {
  const wei = value.toString()
  const eth = formatEther(value)
  return (
    <div>
      <span className="text-gray-100 text-sm font-mono">{eth} ETH</span>
      <br />
      <span className="text-gray-500 text-xs font-mono">{wei} wei</span>
    </div>
  )
}

export default function ContractData({ data, operators, assetType }) {
  if (!data) return null

  const typeLabel = assetType === 1 ? 'ETH' : 'SSV'

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-3">
        On-Chain Data
        <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${assetType === 1 ? 'bg-blue-600' : 'bg-purple-600'}`}>
          {typeLabel} Cluster
        </span>
      </h2>

      <div className="bg-gray-800 border border-gray-700 rounded-md p-4 space-y-0">
        <Row label="Cluster Balance">
          <WeiValue value={data.balance} />
        </Row>

        <Row label="Burn Rate (per block)">
          <WeiValue value={data.burnRate} />
        </Row>

        <Row label="Burn Rate (annual)">
          <WeiValue value={BigInt(data.burnRate) * BigInt(BLOCKS_PER_YEAR)} />
        </Row>

        <Row label="Effective Balance">
          <span className="text-gray-100 text-sm font-mono">
            {data.effectiveBalance.toString()}
            {assetType === 1 ? ' ETH' : ''}
          </span>
        </Row>

        <Row label="Liquidatable">
          <span className={`text-sm font-bold ${data.isLiquidatable ? 'text-red-400' : 'text-green-400'}`}>
            {data.isLiquidatable ? 'YES' : 'No'}
          </span>
        </Row>

        <Row label="Liquidated">
          <span className={`text-sm font-bold ${data.isLiquidated ? 'text-red-400' : 'text-green-400'}`}>
            {data.isLiquidated ? 'YES' : 'No'}
          </span>
        </Row>
      </div>

      {operators && operators.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Operator Fees</h3>
          <div className="bg-gray-800 border border-gray-700 rounded-md p-4 space-y-0">
            {operators.map((op) => (
              <Row key={op.id} label={`Operator #${op.id}`}>
                <div>
                  <span className="text-gray-100 text-sm font-mono">
                    {formatEther(op.fee)} ETH/block
                  </span>
                  <br />
                  <span className="text-gray-500 text-xs font-mono">
                    {formatEther(BigInt(op.fee) * BigInt(BLOCKS_PER_YEAR))} ETH/year
                  </span>
                </div>
              </Row>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
