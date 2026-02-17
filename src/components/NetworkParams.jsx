import { useState } from 'react'
import { formatEther } from 'ethers'
import { BLOCKS_PER_YEAR, BLOCKS_PER_DAY } from '../utils/format'

function Row({ label, children }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-700/50 last:border-b-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}

export default function NetworkParams({ params, assetType }) {
  const [open, setOpen] = useState(false)

  if (!params) return null

  const typeLabel = assetType === 1 ? 'ETH' : 'SSV'
  const annualFee = BigInt(params.networkFee) * BigInt(BLOCKS_PER_YEAR)
  const thresholdDays = (Number(params.liquidationThreshold) / BLOCKS_PER_DAY).toFixed(2)

  return (
    <div className="mt-4">
      <div className="bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-300">Network Parameters</span>
            <span className="text-xs text-gray-500 font-normal">({typeLabel} variant)</span>
          </div>
          <span className="text-gray-400 text-xs">{open ? '\u25B2' : '\u25BC'}</span>
        </button>
        {open && (
          <div className="px-4 pb-4 border-t border-gray-700">
            <Row label="Network Fee">
              <div>
                <span className="text-gray-100 text-sm font-mono">
                  {formatEther(annualFee)} ETH/year
                </span>
                <br />
                <span className="text-gray-500 text-xs font-mono">
                  {formatEther(params.networkFee)} ETH/block
                </span>
                <br />
                <span className="text-gray-500 text-xs font-mono">
                  {params.networkFee.toString()} wei/block
                </span>
              </div>
            </Row>

            <Row label="Liquidation Threshold">
              <div>
                <span className="text-gray-100 text-sm font-mono">
                  ~{thresholdDays} days
                </span>
                <br />
                <span className="text-gray-500 text-xs font-mono">
                  {params.liquidationThreshold.toString()} blocks
                </span>
              </div>
            </Row>

            <Row label="Min Liquidation Collateral">
              <div>
                <span className="text-gray-100 text-sm font-mono">
                  {formatEther(params.minCollateral)} ETH
                </span>
                <br />
                <span className="text-gray-500 text-xs font-mono">
                  {params.minCollateral.toString()} wei
                </span>
              </div>
            </Row>
          </div>
        )}
      </div>
    </div>
  )
}
