import { useState } from 'react'
import { formatEther, parseEther } from 'ethers'
import { BLOCKS_PER_DAY, BLOCKS_PER_YEAR } from '../utils/format'

function CalcRow({ label, children }) {
  return (
    <div className="flex justify-between items-start py-1.5">
      <span className="text-gray-400 text-sm">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}

function computeFromEB(newEB, totalFeesPerBlockPerValidator, threshold, minCollateral) {
  const burnRate = totalFeesPerBlockPerValidator * newEB / 32n
  const dynamicCollateral = burnRate * threshold
  const collateral = dynamicCollateral > minCollateral ? dynamicCollateral : minCollateral
  return { burnRate, collateral }
}

function DepositWithdraw({ balance, burnRatePerBlock, liquidationCollateral, typeLabel }) {
  const [amount, setAmount] = useState('')

  let newBalance = balance
  let newRunwayBlocks = 0n
  let newRunwayDays = 0
  let valid = true

  if (amount !== '') {
    try {
      const delta = parseEther(amount)
      newBalance = balance + delta
      if (newBalance < 0n) newBalance = 0n
    } catch {
      valid = false
    }
  }

  if (valid && burnRatePerBlock > 0n) {
    const available = newBalance > liquidationCollateral ? newBalance - liquidationCollateral : 0n
    newRunwayBlocks = available / burnRatePerBlock
    newRunwayDays = Number(newRunwayBlocks) / BLOCKS_PER_DAY
  }

  return (
    <div>
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">Amount ({typeLabel})</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.5 or -0.02"
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 placeholder-gray-600 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      {valid && amount !== '' && (
        <div className="space-y-0">
          <CalcRow label="Current balance">
            <span className="text-gray-300 text-sm font-mono">{formatEther(balance)} {typeLabel}</span>
          </CalcRow>
          <CalcRow label="New balance">
            <span className="text-gray-100 text-sm font-mono">{formatEther(newBalance)} {typeLabel}</span>
          </CalcRow>
          <CalcRow label="New runway">
            <div>
              <span className="text-gray-100 text-sm font-mono">{newRunwayDays.toFixed(2)} days</span>
              <br />
              <span className="text-gray-500 text-xs font-mono">{newRunwayBlocks.toString()} blocks</span>
            </div>
          </CalcRow>
        </div>
      )}
      {!valid && <p className="text-red-400 text-xs">Invalid amount</p>}
    </div>
  )
}

function TargetRunway({ balance, burnRatePerBlock, liquidationCollateral, typeLabel }) {
  const [days, setDays] = useState('')

  let requiredBalance = 0n
  let diff = 0n
  let valid = true

  if (days !== '') {
    const d = parseFloat(days)
    if (isNaN(d) || d < 0) {
      valid = false
    } else {
      const targetBlocks = BigInt(Math.round(d * BLOCKS_PER_DAY))
      requiredBalance = burnRatePerBlock * targetBlocks + liquidationCollateral
      diff = requiredBalance - balance
    }
  }

  return (
    <div>
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">Desired runway (days)</label>
        <input
          type="text"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="365"
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 placeholder-gray-600 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      {valid && days !== '' && (
        <div className="space-y-0">
          <CalcRow label="Current balance">
            <span className="text-gray-300 text-sm font-mono">{formatEther(balance)} {typeLabel}</span>
          </CalcRow>
          <CalcRow label="Required balance">
            <span className="text-gray-100 text-sm font-mono">{formatEther(requiredBalance)} {typeLabel}</span>
          </CalcRow>
          <CalcRow label="Difference">
            <span className={`text-sm font-mono ${diff > 0n ? 'text-yellow-400' : 'text-green-400'}`}>
              {diff > 0n ? '+' : ''}{formatEther(diff)} {typeLabel}
            </span>
          </CalcRow>
        </div>
      )}
      {!valid && <p className="text-red-400 text-xs">Invalid number of days</p>}
    </div>
  )
}

function UpdateEB({ balance, eb, validatorCount, totalFeesPerBlockPerValidator, threshold, minCollateral, assetType, typeLabel }) {
  const [input, setInput] = useState('')
  const isETH = assetType === 1

  let valid = true
  let newEB = eb
  let newValidatorCount = validatorCount
  let newBurnRate = 0n
  let newCollateral = minCollateral
  let newBurnRateAnnual = 0n
  let runwayBlocks = 0n
  let runwayDays = 0

  if (input !== '') {
    const val = parseInt(input, 10)
    if (isNaN(val) || val < 0) {
      valid = false
    } else {
      if (isETH) {
        newEB = BigInt(val)
        newValidatorCount = Number(newEB / 32n)
      } else {
        newValidatorCount = val
        newEB = BigInt(val) * 32n
      }

      if (newEB === 0n) {
        newBurnRate = 0n
        newCollateral = minCollateral
      } else {
        const computed = computeFromEB(newEB, totalFeesPerBlockPerValidator, threshold, minCollateral)
        newBurnRate = computed.burnRate
        newCollateral = computed.collateral
      }
      newBurnRateAnnual = newBurnRate * BigInt(BLOCKS_PER_YEAR)

      if (newBurnRate > 0n) {
        const available = balance > newCollateral ? balance - newCollateral : 0n
        runwayBlocks = available / newBurnRate
        runwayDays = Number(runwayBlocks) / BLOCKS_PER_DAY
      }
    }
  }

  return (
    <div>
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">
          {isETH ? `New EB (current: ${eb.toString()} ETH)` : `New validator count (current: ${validatorCount})`}
        </label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isETH ? eb.toString() : validatorCount.toString()}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 placeholder-gray-600 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      {valid && input !== '' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div className="space-y-0">
            {isETH ? (
              <>
                <CalcRow label="Current EB">
                  <span className="text-gray-300 text-sm font-mono">{eb.toString()} ETH</span>
                </CalcRow>
                <CalcRow label="New EB">
                  <span className="text-gray-100 text-sm font-mono">{newEB.toString()} ETH</span>
                </CalcRow>
              </>
            ) : (
              <>
                <CalcRow label="Current validators">
                  <span className="text-gray-300 text-sm font-mono">{validatorCount}</span>
                </CalcRow>
                <CalcRow label="New validators">
                  <span className="text-gray-100 text-sm font-mono">{newValidatorCount}</span>
                </CalcRow>
                <CalcRow label="New EB">
                  <span className="text-gray-100 text-sm font-mono">{newEB.toString()} ETH</span>
                </CalcRow>
              </>
            )}
          </div>
          <div className="space-y-0">
            <CalcRow label="New burn rate">
              <div>
                <span className="text-gray-100 text-sm font-mono">{formatEther(newBurnRateAnnual)} {typeLabel}</span>
                <br />
                <span className="text-gray-500 text-xs font-mono">{formatEther(newBurnRate)} {typeLabel}/block</span>
              </div>
            </CalcRow>
            <CalcRow label="New collateral">
              <span className="text-gray-100 text-sm font-mono">{formatEther(newCollateral)} {typeLabel}</span>
            </CalcRow>
            <CalcRow label="New runway">
              <div>
                <span className="text-gray-100 text-sm font-mono">{runwayDays.toFixed(2)} days</span>
                <br />
                <span className="text-gray-500 text-xs font-mono">{runwayBlocks.toString()} blocks</span>
              </div>
            </CalcRow>
          </div>
        </div>
      )}
      {!valid && <p className="text-red-400 text-xs">Invalid number</p>}
    </div>
  )
}

function Liquidation({ balance, burnRatePerBlock, liquidationCollateral, typeLabel, currentBlock, runwayBlocks, onRefreshBlock }) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState('absolute') // 'relative' = blocks from now, 'absolute' = block number

  const liquidationBlock = currentBlock != null && runwayBlocks > 0n
    ? BigInt(currentBlock) + runwayBlocks
    : null
  const currentRunwayDays = burnRatePerBlock > 0n ? Number(runwayBlocks) / BLOCKS_PER_DAY : 0
  const liquidationDate = liquidationBlock != null
    ? new Date(Date.now() + currentRunwayDays * 24 * 60 * 60 * 1000)
    : null

  let valid = true
  let targetBlocks = 0n
  let requiredBalance = 0n
  let maxWithdrawable = 0n

  if (input !== '') {
    const val = parseInt(input, 10)
    if (isNaN(val) || val < 0) {
      valid = false
    } else if (mode === 'absolute') {
      if (currentBlock == null || val <= currentBlock) {
        valid = false
      } else {
        targetBlocks = BigInt(val) - BigInt(currentBlock)
      }
    } else {
      targetBlocks = BigInt(val)
    }
    if (valid && input !== '') {
      requiredBalance = burnRatePerBlock * targetBlocks + liquidationCollateral
      maxWithdrawable = balance - requiredBalance
      if (maxWithdrawable < 0n) maxWithdrawable = 0n
    }
  }

  return (
    <div>
      <div className="space-y-0 mb-4">
        <CalcRow label="Current block">
          <div className="flex items-center gap-2">
            <span className="text-gray-100 text-sm font-mono">{currentBlock != null ? currentBlock.toLocaleString() : '—'}</span>
            <button
              onClick={onRefreshBlock}
              className="text-gray-400 hover:text-gray-200 text-xs transition-colors"
              title="Refresh block"
            >&#x21bb;</button>
          </div>
        </CalcRow>
        <CalcRow label="Liquidation block">
          <div>
            <span className="text-gray-100 text-sm font-mono">
              {liquidationBlock != null ? liquidationBlock.toLocaleString() : '—'}
            </span>
            {runwayBlocks > 0n && (
              <>
                <br />
                <span className="text-gray-500 text-xs font-mono">in {runwayBlocks.toLocaleString()} blocks</span>
              </>
            )}
          </div>
        </CalcRow>
        <CalcRow label="Estimated date">
          <span className="text-gray-100 text-sm font-mono">
            {liquidationDate != null
              ? liquidationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
              : '—'}
          </span>
        </CalcRow>
      </div>

      <div className="border-t border-gray-700 pt-4">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-500">
              {mode === 'relative' ? 'Blocks from now' : 'Target block number'}
            </label>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => { setMode('relative'); setInput('') }}
                className={`px-2 py-0.5 rounded transition-colors ${mode === 'relative' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-300'}`}
              >Relative</button>
              <button
                onClick={() => { setMode('absolute'); setInput('') }}
                className={`px-2 py-0.5 rounded transition-colors ${mode === 'absolute' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-gray-300'}`}
              >Block #</button>
            </div>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'relative'
              ? (runwayBlocks > 0n ? runwayBlocks.toString() : '100000')
              : (liquidationBlock != null ? liquidationBlock.toString() : '')
            }
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-gray-100 placeholder-gray-600 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {valid && input !== '' && (
          <div className="space-y-0">
            {mode === 'relative' && currentBlock != null && (
              <CalcRow label="Target liquidation block">
                <span className="text-gray-100 text-sm font-mono">{(BigInt(currentBlock) + targetBlocks).toLocaleString()}</span>
              </CalcRow>
            )}
            <CalcRow label="Current balance">
              <span className="text-gray-300 text-sm font-mono">{formatEther(balance)} {typeLabel}</span>
            </CalcRow>
            <CalcRow label="Required balance">
              <span className="text-gray-100 text-sm font-mono">{formatEther(requiredBalance)} {typeLabel}</span>
            </CalcRow>
            <CalcRow label="Max withdrawable">
              <div>
                <span className={`text-sm font-mono ${maxWithdrawable > 0n ? 'text-green-400' : 'text-red-400'}`}>
                  {formatEther(maxWithdrawable)} {typeLabel}
                </span>
                <br />
                <span className="text-gray-500 text-xs font-mono">{maxWithdrawable.toString()} wei</span>
              </div>
            </CalcRow>
          </div>
        )}
        {!valid && <p className="text-red-400 text-xs">{mode === 'absolute' ? 'Must be greater than current block' : 'Invalid number of blocks'}</p>}
      </div>
    </div>
  )
}

export default function Calculator({
  balance, burnRatePerBlock, liquidationCollateral, typeLabel,
  validatorCount, eb, totalFeesPerBlockPerValidator, threshold, minCollateral, assetType,
  currentBlock, runwayBlocks, onRefreshBlock,
}) {
  const ebLabel = assetType === 1 ? 'Update EB' : 'Update Validators'
  const tabs = [
    { id: 'eb', label: ebLabel },
    { id: 'runway', label: 'Target Runway' },
    { id: 'deposit', label: 'Deposit / Withdraw' },
    { id: 'liquidation', label: 'Liquidation' },
  ]
  const [activeTab, setActiveTab] = useState('eb')

  return (
    <div className="mt-4 bg-gray-800 border border-gray-700 rounded-md overflow-hidden">
      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-gray-100 border-b-2 border-blue-500 bg-gray-750'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {activeTab === 'deposit' && (
          <DepositWithdraw
            balance={balance}
            burnRatePerBlock={burnRatePerBlock}
            liquidationCollateral={liquidationCollateral}
            typeLabel={typeLabel}
          />
        )}
        {activeTab === 'runway' && (
          <TargetRunway
            balance={balance}
            burnRatePerBlock={burnRatePerBlock}
            liquidationCollateral={liquidationCollateral}
            typeLabel={typeLabel}
          />
        )}
        {activeTab === 'eb' && (
          <UpdateEB
            balance={balance}
            eb={eb}
            validatorCount={validatorCount}
            totalFeesPerBlockPerValidator={totalFeesPerBlockPerValidator}
            threshold={threshold}
            minCollateral={minCollateral}
            assetType={assetType}
            typeLabel={typeLabel}
          />
        )}
        {activeTab === 'liquidation' && (
          <Liquidation
            balance={balance}
            burnRatePerBlock={burnRatePerBlock}
            liquidationCollateral={liquidationCollateral}
            typeLabel={typeLabel}
            currentBlock={currentBlock}
            runwayBlocks={runwayBlocks}
            onRefreshBlock={onRefreshBlock}
          />
        )}
      </div>
    </div>
  )
}
