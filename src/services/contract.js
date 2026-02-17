import { JsonRpcProvider, Contract } from 'ethers'
import SSVNetworkViewsABI from '../abi/SSVNetworkViews.json'

const HOODI_RPC = 'https://ethereum-hoodi-rpc.publicnode.com'
const SSV_VIEWS_CONTRACT = '0x5AdDb3f1529C5ec70D77400499eE4bbF328368fe'

let provider
let contract

function getProvider() {
  if (!provider) {
    provider = new JsonRpcProvider(HOODI_RPC)
  }
  return provider
}

export function getContract() {
  if (!contract) {
    contract = new Contract(SSV_VIEWS_CONTRACT, SSVNetworkViewsABI, getProvider())
  }
  return contract
}

export async function getCurrentBlock() {
  return await getProvider().getBlockNumber()
}

function clusterTuple(snapshot) {
  return [
    snapshot.validatorCount,
    snapshot.networkFeeIndex,
    snapshot.index,
    snapshot.active,
    snapshot.balance,
  ]
}

// Asset type: 0 = SSV cluster, 1 = ETH cluster
export async function getClusterAssetType(owner, operatorIds) {
  const c = getContract()
  const result = await c.getClusterAssetType(owner, operatorIds)
  return Number(result)
}

// Returns suffix for function names: '' for ETH (type 1), 'SSV' for SSV (type 0)
function fnSuffix(assetType) {
  return assetType === 0 ? 'SSV' : ''
}

export async function fetchOperatorData(operatorId, assetType) {
  const c = getContract()
  const sfx = fnSuffix(assetType)
  const [info, fee] = await Promise.all([
    c['getOperatorById' + sfx](operatorId),
    c['getOperatorFee' + sfx](operatorId),
  ])
  return { info, fee }
}

async function callWithFallback(c, fnBase, args) {
  try {
    return await c[fnBase](...args)
  } catch {
    return await c[fnBase + 'SSV'](...args)
  }
}

async function callSSVWithFallback(c, fnBase, args) {
  try {
    return await c[fnBase + 'SSV'](...args)
  } catch {
    return await c[fnBase](...args)
  }
}

export async function fetchClusterContractData(owner, operatorIds, snapshot, assetType) {
  const c = getContract()
  const tuple = clusterTuple(snapshot)
  const sfx = fnSuffix(assetType)
  const clusterArgs = [owner, operatorIds, tuple]
  const tryCall = assetType === 0 ? callSSVWithFallback : callWithFallback

  // Check liquidated first — other calls revert on liquidated clusters
  let isLiquidated
  try {
    isLiquidated = await tryCall(c, 'isLiquidated', clusterArgs)
  } catch {
    isLiquidated = !snapshot.active
  }

  if (isLiquidated) {
    return {
      balance: 0n,
      burnRate: 0n,
      isLiquidatable: false,
      isLiquidated: true,
      effectiveBalance: assetType === 0
        ? BigInt(snapshot.validatorCount) * 32n
        : null,
    }
  }

  const calls = [
    tryCall(c, 'getBalance', clusterArgs),
    tryCall(c, 'getBurnRate', clusterArgs),
    tryCall(c, 'isLiquidatable', clusterArgs),
  ]

  if (assetType === 1) {
    calls.push(c.getEffectiveBalance(owner, operatorIds, tuple))
  }

  const results = await Promise.all(calls)

  return {
    balance: results[0],
    burnRate: results[1],
    isLiquidatable: results[2],
    isLiquidated: false,
    effectiveBalance: assetType === 0
      ? BigInt(snapshot.validatorCount) * 32n
      : results[3],
  }
}

export async function fetchNetworkParams(assetType) {
  const c = getContract()
  const sfx = fnSuffix(assetType)

  const [networkFee, liquidationThreshold, minCollateral] = await Promise.all([
    c['getNetworkFee' + sfx](),
    c['getLiquidationThresholdPeriod' + sfx](),
    c['getMinimumLiquidationCollateral' + sfx](),
  ])

  return { networkFee, liquidationThreshold, minCollateral }
}
