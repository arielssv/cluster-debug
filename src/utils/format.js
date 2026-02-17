import { formatEther } from 'ethers'

export const BLOCKS_PER_DAY = 7160
export const BLOCKS_PER_YEAR = 7160 * 365 // 2,613,400

export function weiToEth(wei) {
  return formatEther(wei)
}

export function blocksTodays(blocks) {
  return Number(blocks) / BLOCKS_PER_DAY
}

export function daysToBlocks(days) {
  return Math.round(days * BLOCKS_PER_DAY)
}

export function perBlockToAnnual(perBlock) {
  return BigInt(perBlock) * BigInt(BLOCKS_PER_YEAR)
}
