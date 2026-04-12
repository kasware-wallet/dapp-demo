/**
 * Type definitions for KasWare Wallet API
 * These types mirror the plugin's src/shared/types.ts
 * 
 * @see D:\nodejs2024\moissan0.13.5\src\shared\types.ts
 */

/**
 * Transaction types supported by KasWare
 */
export enum TxType {
  SIGN_TX,
  SEND_KASPA,
  SIGN_KRC20_DEPLOY,
  SIGN_KRC20_MINT,
  SIGN_KRC20_TRANSFER,
  SIGN_KRC20_TRANSFER_BATCH,
  SIGN_KRC20_MINT_BATCH,
  SIGN_KNS_TRANSFER,
  SIGN_KSPRNFT_TRANSFER,
}

/**
 * Kaspa Sighash types allowed by consensus
 * @see https://kaspa-mdbook.aspectron.com/transactions/sighashes.html
 */
export enum SighashBiType {
  All = 0b00000001, // 1
  None = 0b00000010, // 2
  Single = 0b00000100, // 4
  AllAnyOneCanPay = 0b10000001, // 128 + 1 = 129
  NoneAnyOneCanPay = 0b10000010, // 128 + 2 = 130
  SingleAnyOneCanPay = 0b10000100, // 128 + 4 = 132
}

/**
 * Sign message type
 * - 'schnorr': Schnorr signature
 * - 'ecdsa': ECDSA signature  
 * - 'auto': Auto-detect based on address type
 */
export type TSignMessage = 'schnorr' | 'ecdsa' | 'auto';

/**
 * Build script type for inscriptions
 */
export enum BuildScriptType {
  KRC20 = 'KRC20',
  KNS = 'KNS',
  KSPR_KRC721 = 'KSPR_KRC721',
}

/**
 * Batch transfer item
 */
export interface IBatchTransfer {
  tick: string;
  dec?: string;
  to: string;
  amount: number | string;
}

/**
 * Batch transfer result status
 */
export type TBatchTransferStatus = 'failed' | 'success';

/**
 * Batch transfer result
 */
export interface IBatchTransferResult {
  index: number;
  tick: string;
  to: string;
  amount: number | string;
  status: TBatchTransferStatus;
  errorMsg: string | undefined;
  txId: { commitId: string; revealId: string } | undefined;
}

/**
 * UTXO Entry JSON format
 */
export interface IUtxoEntryJson {
  entry: {
    address: {
      version: string;
      prefix: string;
      payload: string;
    };
    outpoint: {
      transactionId: string;
      index: number;
    };
    amount: number;
    scriptPublicKey: {
      version: number;
      script: string;
    };
    blockDaaScore: number;
    isCoinbase: boolean;
  };
  outpoint: {
    transactionId: string;
    index: number;
  };
  address: {
    version: string;
    prefix: string;
    payload: string;
  };
  amount: number;
  isCoinbase: boolean;
  blockDaaScore: number;
  scriptPublicKey: {
    version: number;
    script: string;
  };
}

/**
 * Submit Commit parameters
 */
export interface ISubmitCommitParams {
  priorityEntries?: IUtxoEntryJson[];
  entries: IUtxoEntryJson[];
  outputs: { address: string; amount: number }[];
  changeAddress: string;
  priorityFee?: number;
  script: string;
  networkId?: string;
}

/**
 * Submit Reveal parameters
 */
export interface ISubmitRevealParams {
  priorityEntries: IUtxoEntryJson[];
  entries: IUtxoEntryJson[];
  outputs?: { address: string; amount: number }[];
  changeAddress: string;
  priorityFee?: number;
  script: string;
  networkId?: string;
}

/**
 * Sign PSKT options
 */
export interface ISignPsktOptions {
  txJsonString: string;
  options?: {
    signInputs: {
      index: number;
      sighashType: SighashBiType;
    }[];
  };
}

/**
 * Build script result
 */
export interface IBuildScriptResult {
  script: string;
  p2shAddress: string;
}

/**
 * Network ID type
 */
export type TNetworkId = 'mainnet' | 'testnet-10' | 'testnet-11' | 'testnet-12' | 'devnet' | 'testnet' | 'simnet';

/**
 * Balance response
 */
export interface IBalanceResponse {
  confirmed: number;
  unconfirmed: number;
  total: number;
}
