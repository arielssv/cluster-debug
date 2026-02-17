const SSV_HOODI_SUBGRAPH = 'https://api.studio.thegraph.com/query/71118/ssv-network-hoodi/version/latest'

export async function fetchCluster(owner, operatorIds) {
  const lowerOwner = owner.toLowerCase()
  const sortedIds = [...operatorIds].sort((a, b) => a - b)
  const clusterId = `${lowerOwner}-${sortedIds.join('-')}`

  const query = `
    query ClusterSnapshot {
      cluster(id: "${clusterId}") {
        validatorCount
        networkFeeIndex
        index
        active
        balance
      }
    }
  `

  const res = await fetch(SSV_HOODI_SUBGRAPH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })

  const json = await res.json()

  if (json.errors) {
    throw new Error(json.errors[0].message)
  }

  return json.data.cluster
}
