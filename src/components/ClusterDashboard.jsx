import { useState } from 'react'
import { formatEther } from 'ethers'
import { BLOCKS_PER_YEAR, BLOCKS_PER_DAY } from '../utils/format'
import Calculator from './Calculator'

function Row({ label, fromContract, children }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-700/50 last:border-b-0">
      <span className="text-gray-400 text-sm">
        {label}
        {fromContract && <span className="text-blue-400 ml-0.5">*</span>}
      </span>
      <div className="text-right">{children}</div>
    </div>
  )
}

function CollapsibleCard({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-gray-750 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-300">{title}</span>
        <span className="text-gray-400 text-xs">{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-700">{children}</div>}
    </div>
  )
}

export default function ClusterDashboard({ contractData, operators, networkParams, assetType, snapshot, currentBlock, onRefreshBlock }) {
  if (!contractData || !networkParams || !snapshot) return null

  const typeLabel = assetType === 1 ? 'ETH' : 'SSV'
  const eb = contractData.effectiveBalance != null ? BigInt(contractData.effectiveBalance) : 0n
  const ebScale = eb / 32n

  // Our calculated burn rate from operator fees + network fee
  const totalOpFeesPerBlock = operators
    ? operators.reduce((sum, op) => sum + BigInt(op.fee), 0n)
    : 0n
  const networkFeePerBlock = BigInt(networkParams.networkFee)
  const burnRatePerBlock = (totalOpFeesPerBlock + networkFeePerBlock) * ebScale
  const burnRateAnnual = burnRatePerBlock * BigInt(BLOCKS_PER_YEAR)

  // Breakdown for table
  const totalOpFeesAnnual = totalOpFeesPerBlock * BigInt(BLOCKS_PER_YEAR)
  const totalOpFeesScaled = totalOpFeesAnnual * ebScale
  const networkFeeAnnual = networkFeePerBlock * BigInt(BLOCKS_PER_YEAR)
  const networkFeeScaled = networkFeeAnnual * ebScale

  // Contract's burn rate (for reference)
  const contractBurnRate = BigInt(contractData.burnRate)


  // Liquidation collateral (using our burn rate)
  const minCollateral = BigInt(networkParams.minCollateral)
  const threshold = BigInt(networkParams.liquidationThreshold)
  const dynamicCollateral = burnRatePerBlock * threshold
  const liquidationCollateral = dynamicCollateral > minCollateral ? dynamicCollateral : minCollateral

  // Runway (using our burn rate)
  const balance = BigInt(contractData.balance)
  let runwayBlocks = 0n
  let runwayDays = 0
  if (burnRatePerBlock > 0n) {
    const available = balance > liquidationCollateral ? balance - liquidationCollateral : 0n
    runwayBlocks = available / burnRatePerBlock
    runwayDays = Number(runwayBlocks) / BLOCKS_PER_DAY
  }

  // Subgraph single-line tuple
  const singleLine = JSON.stringify([
    snapshot.validatorCount,
    snapshot.networkFeeIndex,
    snapshot.index,
    snapshot.active,
    snapshot.balance,
  ])

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold">Cluster Overview</h2>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${assetType === 1 ? 'bg-blue-600' : 'bg-purple-600'}`}>
          {typeLabel}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${contractData.isLiquidated ? 'bg-red-600' : 'bg-green-600'}`}>
          {contractData.isLiquidated ? 'Liquidated' : 'Active'}
        </span>
        {!contractData.isLiquidated && contractData.isLiquidatable && (
          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-yellow-600">LIQUIDATABLE</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left column - Cluster metrics */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-md p-4">
            <Row label="Effective Balance" fromContract={contractData.effectiveBalance != null}>
              <div>
                <span className="text-gray-100 text-sm font-mono">
                  {contractData.effectiveBalance != null ? contractData.effectiveBalance.toString() + ' ETH' : '—'}
                </span>
                {assetType === 0 && (
                  <>
                    <br />
                    <span className="text-gray-500 text-xs font-mono">
                      {snapshot.validatorCount} validators x 32
                    </span>
                  </>
                )}
              </div>
            </Row>

            <Row label="Balance" fromContract>
              <div>
                <span className="text-gray-100 text-sm font-mono">
                  {formatEther(balance)} {typeLabel}
                </span>
                <br />
                <span className="text-gray-500 text-xs font-mono">
                  {balance.toString()} wei
                </span>
              </div>
            </Row>

            {/* Burn Rate with table breakdown */}
            <div className="py-3 border-b border-gray-700/50">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm text-gray-400">Burn Rate</span>
                <div className="text-right">
                  <span className="text-gray-100 text-sm font-mono">
                    {formatEther(burnRateAnnual)} {typeLabel}
                  </span>
                  <br />
                  <span className="text-gray-500 text-xs font-mono">
                    {formatEther(burnRatePerBlock)} {typeLabel}/block
                    {burnRatePerBlock === contractBurnRate ? (
                      <span className="text-green-400 ml-1">&#10003;</span>
                    ) : (
                      <span className="text-yellow-400 ml-1" title={`Contract: ${formatEther(contractBurnRate)} ${typeLabel}/block`}>&#10007;</span>
                    )}
                  </span>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs">
                    <th className="text-left font-normal pb-1"></th>
                    <th className="text-right font-normal pb-1">Annual</th>
                    <th className="text-right font-normal pb-1">EB Scale</th>
                    <th className="text-right font-normal pb-1">Total</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="text-gray-300">
                    <td className="text-gray-400 py-1">Operator Fees</td>
                    <td className="text-right py-1">{formatEther(totalOpFeesAnnual)}</td>
                    <td className="text-right py-1 text-gray-500">{eb.toString()} EB = x{ebScale.toString()}</td>
                    <td className="text-right py-1">{formatEther(totalOpFeesScaled)}</td>
                  </tr>
                  <tr className="text-gray-300">
                    <td className="text-gray-400 py-1">Network Fee</td>
                    <td className="text-right py-1">{formatEther(networkFeeAnnual)}</td>
                    <td className="text-right py-1 text-gray-500">{eb.toString()} EB = x{ebScale.toString()}</td>
                    <td className="text-right py-1">{formatEther(networkFeeScaled)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Row label="Liquidation Collateral">
              <div>
                <span className="text-gray-100 text-sm font-mono">
                  {formatEther(liquidationCollateral)} {typeLabel}
                </span>
                <br />
                <span className="text-gray-500 text-xs font-mono">
                  {liquidationCollateral.toString()} wei
                </span>
              </div>
            </Row>

            <Row label="Runway">
              <div>
                <span className="text-gray-100 text-sm font-mono">
                  {runwayDays.toFixed(2)} days
                </span>
                <br />
                <span className="text-gray-500 text-xs font-mono">
                  {runwayBlocks.toString()} blocks
                </span>
              </div>
            </Row>
          </div>

          {/* Subgraph data - collapsible */}
          <CollapsibleCard title="Subgraph Cluster Snapshot">
            <pre className="mt-2 text-sm text-gray-300 font-mono overflow-x-auto">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 p-2 bg-gray-900 rounded text-xs text-green-400 overflow-x-auto block">
                {singleLine}
              </code>
              <CopyButton text={singleLine} />
            </div>
          </CollapsibleCard>
        </div>

        {/* Right column - Operators */}
        <div className="bg-gray-800 border border-gray-700 rounded-md p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Operators</h3>
          {operators && operators.map((op) => (
            <div key={op.id} className="flex justify-between items-start py-2 border-b border-gray-700/50 last:border-b-0">
              <span className="text-sm font-medium text-gray-200">#{op.id}</span>
              <div className="text-right">
                <div className="text-sm font-mono text-gray-100">
                  {formatEther(BigInt(op.fee) * BigInt(BLOCKS_PER_YEAR))} {typeLabel}
                </div>
                <div className="text-xs font-mono text-gray-500">
                  {formatEther(op.fee)} {typeLabel}/block
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Calculator
        balance={balance}
        burnRatePerBlock={burnRatePerBlock}
        liquidationCollateral={liquidationCollateral}
        typeLabel={typeLabel}
        validatorCount={parseInt(snapshot.validatorCount)}
        eb={eb}
        totalFeesPerBlockPerValidator={totalOpFeesPerBlock + networkFeePerBlock}
        threshold={threshold}
        minCollateral={minCollateral}
        assetType={assetType}
        currentBlock={currentBlock}
        runwayBlocks={runwayBlocks}
        onRefreshBlock={onRefreshBlock}
      />
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs rounded transition-colors whitespace-nowrap"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}
