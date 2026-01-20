/**
 * Convert Kaspa network name to Kasware network ID
 * @param network - Kaspa network name (e.g., "kaspa_mainnet", "kaspa_testnet_11")
 * @returns Kasware network ID (e.g., "mainnet", "testnet-11", "testnet-10", "devnet")
 */
export function getKasNetworkId(network: string): string {
  switch (network) {
    case "kaspa_mainnet":
      return "mainnet";
    case "kaspa_testnet_11":
      return "testnet-11";
    case "kaspa_testnet_10":
      return "testnet-10";
    case "kaspa_devnet":
      return "devnet";
    default:
      return "testnet-10";
  }
}
