/**
 * Type definitions for KasWare Wallet API
 * These types mirror the plugin's src/shared/types.ts
 *
 * @see D:\nodejs2024\moissan0.13.5\src\shared\types.ts
 */

/**
 * Transaction types supported by KasWare.
 *
 * Used as the `type` parameter in {@link KaswareProvider.signKRC20Transaction}
 * to specify what kind of KRC20 operation to sign.
 *
 * @example
 * ```ts
 * // Deploy a new KRC20 token
 * await window.kasware.signKRC20Transaction(jsonStr, TxType.SIGN_KRC20_DEPLOY, '', 0.1);
 * // Mint an existing KRC20 token
 * await window.kasware.signKRC20Transaction(jsonStr, TxType.SIGN_KRC20_MINT, '', 1.0);
 * // Transfer a KRC20 token
 * await window.kasware.signKRC20Transaction(jsonStr, TxType.SIGN_KRC20_TRANSFER, destAddr, 0.1);
 * ```
 */
export enum TxType {
  /** Generic transaction signing */
  SIGN_TX,
  /** Send native KAS */
  SEND_KASPA,
  /** Deploy a new KRC20 token */
  SIGN_KRC20_DEPLOY,
  /** Mint an existing KRC20 token */
  SIGN_KRC20_MINT,
  /** Transfer a KRC20 token */
  SIGN_KRC20_TRANSFER,
  /** Batch transfer KRC20 tokens (use {@link KaswareProvider.krc20BatchTransferTransaction} instead) */
  SIGN_KRC20_TRANSFER_BATCH,
  /** Batch mint KRC20 tokens */
  SIGN_KRC20_MINT_BATCH,
  /** Transfer a KNS domain name */
  SIGN_KNS_TRANSFER,
  /** Transfer a KSPR NFT (KRC721) */
  SIGN_KSPRNFT_TRANSFER,
}

/**
 * Kaspa Sighash types allowed by consensus.
 *
 * Determines which parts of the transaction are covered by the signature.
 * Used in {@link ISignPsktOptions} to specify how each input is signed.
 *
 * @see https://kaspa-mdbook.aspectron.com/transactions/sighashes.html
 */
export enum SighashBiType {
  /** Sign all inputs and outputs */
  All = 0b00000001, // 1
  /** Sign all inputs, no outputs */
  None = 0b00000010, // 2
  /** Sign all inputs, only the output at the same index */
  Single = 0b00000100, // 4
  /** Sign only the specified input, all outputs */
  AllAnyOneCanPay = 0b10000001, // 128 + 1 = 129
  /** Sign only the specified input, no outputs */
  NoneAnyOneCanPay = 0b10000010, // 128 + 2 = 130
  /** Sign only the specified input, only the output at the same index */
  SingleAnyOneCanPay = 0b10000100, // 128 + 4 = 132
}

/**
 * Signature algorithm used by {@link KaswareProvider.signMessage}.
 *
 * - `'schnorr'` — Schnorr signature (default for Kaspa addresses)
 * - `'ecdsa'` — ECDSA signature
 * - `'auto'` — Auto-detect based on address type
 */
export type TSignMessage = 'schnorr' | 'ecdsa' | 'auto';

/**
 * Inscription protocol type for {@link KaswareProvider.buildScript}.
 *
 * Determines which protocol rules are applied when constructing
 * the commit-reveal inscription script.
 */
export enum BuildScriptType {
  /** KRC-20 fungible token inscription */
  KRC20 = 'KRC20',
  /** Kaspa Name Service domain inscription */
  KNS = 'KNS',
  /** KSPR KRC-721 NFT inscription */
  KSPR_KRC721 = 'KSPR_KRC721',
}

/**
 * A single item in a KRC20 batch transfer.
 *
 * Used as the `list` parameter in {@link KaswareProvider.krc20BatchTransferTransaction}.
 *
 * @example
 * ```ts
 * const list: IBatchTransfer[] = [
 *   { tick: 'WARE', dec: '8', to: 'kaspatest:qz9...', amount: 1.5 },
 *   { tick: 'TESLA', dec: '8', to: 'kaspatest:qp2...', amount: 0.3 },
 * ];
 * ```
 */
export interface IBatchTransfer {
  /** KRC20 token ticker symbol (e.g. "WARE") */
  tick: string;
  /** Decimal places for the token (e.g. "8" means amount is in whole tokens, not sompi) */
  dec?: string;
  /** Recipient Kaspa address */
  to: string;
  /** Amount to transfer (in whole token units, not minimal units) */
  amount: number | string;
}

/**
 * Status of a single batch transfer item.
 *
 * - `'success'` — Transfer completed and confirmed
 * - `'failed'` — Transfer failed
 */
export type TBatchTransferStatus = 'failed' | 'success';

/**
 * Result of a single KRC20 batch transfer item.
 *
 * Emitted via the `'krc20BatchTransferChanged'` event as transfers are processed.
 */
export interface IBatchTransferResult {
  /** Zero-based index of this transfer within the batch */
  index: number;
  /** KRC20 token ticker symbol */
  tick: string;
  /** Recipient Kaspa address */
  to: string;
  /** Amount transferred */
  amount: number | string;
  /** Whether this individual transfer succeeded or failed */
  status: TBatchTransferStatus;
  /** Error message if the transfer failed, `undefined` if it succeeded */
  errorMsg: string | undefined;
  /** Transaction IDs for the commit and reveal phases, `undefined` if not yet submitted */
  txId: { commitId: string; revealId: string } | undefined;
}

/**
 * UTXO entry in JSON-serializable format.
 *
 * Returned by {@link KaswareProvider.getUtxoEntries}. Represents an unspent
 * transaction output that can be used as an input in a new transaction.
 *
 * BigInt values from the native UTXO format are converted to Number during serialization.
 */
export interface IUtxoEntryJson {
  /** Full UTXO entry data including nested address and outpoint info */
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
  /** Outpoint identifying this UTXO (transaction ID + output index) */
  outpoint: {
    transactionId: string;
    index: number;
  };
  /** Owner address of this UTXO */
  address: {
    version: string;
    prefix: string;
    payload: string;
  };
  /** Amount in sompi (1 KAS = 100,000,000 sompi) */
  amount: number;
  /** Whether this UTXO is a coinbase output (mining reward) */
  isCoinbase: boolean;
  /** DAA score of the block that contains this UTXO */
  blockDaaScore: number;
  /** Locking script that controls spending of this UTXO */
  scriptPublicKey: {
    version: number;
    script: string;
  };
}

/**
 * Parameters for {@link KaswareProvider.submitCommit}, the commit phase
 * of a commit-reveal inscription.
 *
 * The commit transaction sends KAS to a P2SH address derived from the
 * inscription script. The corresponding reveal transaction then spends
 * from that P2SH address, exposing the inscription data on-chain.
 */
export interface ISubmitCommitParams {
  /** UTXO entries to use first for the commit (e.g. P2SH UTXOs from a previous step) */
  priorityEntries?: IUtxoEntryJson[];
  /** UTXO entries available to fund the commit transaction */
  entries: IUtxoEntryJson[];
  /** Outputs for the commit transaction (typically the P2SH address + amount) */
  outputs: { address: string; amount: number }[];
  /** Address to receive any change from the commit transaction */
  changeAddress: string;
  /** Priority fee in KAS to incentivize faster inclusion (default: 0) */
  priorityFee?: number;
  /** Hex-encoded inscription script (from {@link KaswareProvider.buildScript}) */
  script: string;
  /** Network ID for the transaction (e.g. "mainnet", "testnet-11") */
  networkId?: string;
}

/**
 * Parameters for {@link KaswareProvider.submitReveal}, the reveal phase
 * of a commit-reveal inscription.
 *
 * The reveal transaction spends the P2SH output created by the commit,
 * exposing the inscription script on-chain. This is what makes the
 * inscription visible on the Kaspa network.
 */
export interface ISubmitRevealParams {
  /** P2SH UTXO entries from the commit transaction to spend in the reveal */
  priorityEntries: IUtxoEntryJson[];
  /** Additional UTXO entries to fund the reveal transaction (if needed) */
  entries: IUtxoEntryJson[];
  /** Optional outputs for the reveal transaction (e.g. to send to a revenue address) */
  outputs?: { address: string; amount: number }[];
  /** Address to receive any change from the reveal transaction */
  changeAddress: string;
  /** Priority fee in KAS to incentivize faster inclusion (default: 0) */
  priorityFee?: number;
  /** Hex-encoded inscription script (from {@link KaswareProvider.buildScript}) */
  script: string;
  /** Network ID for the transaction (e.g. "mainnet", "testnet-11") */
  networkId?: string;
}

/**
 * Parameters for {@link KaswareProvider.signPskt}.
 *
 * PSKT (Partially Signed Kaspa Transaction) is a format for passing
 * unsigned or partially signed transactions between parties, similar
 * to PSBT in Bitcoin.
 */
export interface ISignPsktOptions {
  /** JSON string of the PSKT/transaction object */
  txJsonString: string;
  /** Which inputs to sign and with what sighash type */
  options?: {
    signInputs: {
      /** Zero-based index of the transaction input to sign */
      index: number;
      /** Sighash type determining what the signature covers */
      sighashType: SighashBiType;
    }[];
  };
}

/**
 * Result of {@link KaswareProvider.buildScript}.
 *
 * Contains the raw inscription script and the P2SH commit address
 * derived from it.
 */
export interface IBuildScriptResult {
  /** Hex-encoded inscription script */
  script: string;
  /** P2SH address for the commit transaction (derived from the script + public key) */
  p2shAddress: string;
}

/**
 * Kaspa network identifier.
 *
 * Used in commit-reveal operations to specify which network the
 * transaction should be valid on.
 */
export type TNetworkId = 'mainnet' | 'testnet-10' | 'testnet-11' | 'testnet-12' | 'devnet' | 'testnet' | 'simnet';

/**
 * KAS balance response from {@link KaswareProvider.getBalance}.
 *
 * All amounts are in **sompi** (1 KAS = 100,000,000 sompi).
 * Note: The actual API returns amounts as strings (since they can exceed
 * JavaScript's safe integer range), but this type allows `number` for
 * backward compatibility with existing code.
 */
export interface IBalanceResponse {
  /** Confirmed balance in sompi */
  confirmed: string | number;
  /** Unconfirmed (pending) balance in sompi */
  unconfirmed: string | number;
  /** Total balance in sompi (confirmed + unconfirmed) */
  total: string | number;
}

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

/** Event names emitted by the Kasware provider */
export type KaswareEventName =
  | 'accountsChanged'
  | 'networkChanged'
  | 'krc20BatchTransferChanged'
  | 'connect'
  | 'disconnect'
  | 'close';

/** Handler for the `accountsChanged` event. Receives the new list of addresses. */
export type AccountsChangedHandler = (accounts: string[]) => void;

/** Handler for the `networkChanged` event. Receives the new network name. */
export type NetworkChangedHandler = (network: string) => void;

/** Handler for the `krc20BatchTransferChanged` event. Receives batch transfer progress updates. */
export type BatchTransferChangedHandler = (results: IBatchTransferResult[]) => void;

/** Handler for generic connection events (`connect`, `disconnect`, `close`). */
export type ConnectionEventHandler = (error?: { code: number; message: string }) => void;

// ---------------------------------------------------------------------------
// KaswareProvider interface
// ---------------------------------------------------------------------------

/**
 * The KasWare Wallet provider injected into dApp pages as `window.kasware`.
 *
 * This interface defines all API methods available to dApps that integrate
 * with the KasWare browser extension. Access it via `window.kasware` after
 * confirming the extension is installed.
 *
 * **Detection pattern:**
 * ```ts
 * const kasware = window.kasware;
 * if (!kasware) {
 *   // KasWare is not installed — prompt user to install
 *   window.open('https://kasware.xyz');
 * }
 * ```
 *
 * **Connection flow:**
 * 1. Call {@link requestAccounts} to prompt the user to connect their wallet
 * 2. Listen for `'accountsChanged'` and `'networkChanged'` events
 * 3. Use other API methods to read balances, sign transactions, etc.
 *
 * @example
 * ```ts
 * // Connect to the wallet
 * const accounts = await window.kasware.requestAccounts();
 * console.log('Connected:', accounts[0]);
 *
 * // Listen for account changes
 * window.kasware.on('accountsChanged', (accounts) => {
 *   console.log('Account changed:', accounts[0]);
 * });
 * ```
 */
export interface KaswareProvider {
  // -----------------------------------------------------------------------
  // Connection & Account Management
  // -----------------------------------------------------------------------

  /**
   * Request the user to connect their wallet to this dApp.
   *
   * Prompts the KasWare extension to show a connection approval dialog.
   * If the dApp has not been granted permission, throws an unauthorized error.
   * If already connected, returns the current account address.
   *
   * After a successful connection, the extension broadcasts
   * `'accountsChanged'` and `'networkChanged'` events.
   *
   * @returns Array containing the connected account address (usually one element)
   * @throws Throws if the user denies the connection request
   *
   * @example
   * ```ts
   * const accounts = await window.kasware.requestAccounts();
   * const address = accounts[0]; // e.g. "kaspatest:qz9d..."
   * ```
   */
  requestAccounts(): Promise<string[]>;

  /**
   * Get the currently connected account addresses without prompting the user.
   *
   * Unlike {@link requestAccounts}, this is a "safe" method that does not
   * require wallet unlock or trigger a connection prompt. Returns an empty
   * array if the dApp is not connected or the user has no account.
   *
   * @returns Array of connected account addresses, or `[]` if not connected
   *
   * @example
   * ```ts
   * const accounts = await window.kasware.getAccounts();
   * if (accounts.length === 0) {
   *   // Not connected — call requestAccounts()
   * }
   * ```
   */
  getAccounts(): Promise<string[]>;

  /**
   * Get the public key of the currently connected account.
   *
   * Returns an empty string if the dApp is not connected.
   *
   * @returns The hex-encoded public key, or `''` if not connected
   *
   * @example
   * ```ts
   * const pubKey = await window.kasware.getPublicKey();
   * // e.g. "203d47c7f78eca297598aceeb60009aba381cc39e1f46601bbcbade77df10c9a5fac"
   * ```
   */
  getPublicKey(): Promise<string>;

  /**
   * Disconnect this dApp from the KasWare wallet.
   *
   * Removes the dApp's permission to access the wallet. After calling this,
   * subsequent API calls will return empty/unauthorized results until the
   * user reconnects via {@link requestAccounts}.
   *
   * @param origin - The origin URL of the dApp (typically `window.location.origin`)
   *
   * @example
   * ```ts
   * await window.kasware.disconnect(window.location.origin);
   * ```
   */
  disconnect(origin: string): Promise<void>;

  /**
   * Get the current Kaspa network name.
   *
   * Returns a string like `"kaspa_mainnet"` or `"kaspa_testnet_11"`.
   * Returns an empty string if the dApp is not connected.
   *
   * @returns The network name, or `''` if not connected
   *
   * @example
   * ```ts
   * const network = await window.kasware.getNetwork();
   * // e.g. "kaspa_mainnet"
   * ```
   */
  getNetwork(): Promise<string>;

  /**
   * Switch the KasWare wallet to a different network.
   *
   * Prompts the user with a network switch approval dialog if the requested
   * network differs from the current one. If already on the same network type,
   * no approval is needed.
   *
   * @param network - Network name string. Supported values:
   *   - `"kaspa_mainnet"` — Mainnet
   *   - `"kaspa_testnet_12"` — Testnet 12
   *   - `"kaspa_testnet_11"` — Testnet 11
   *   - `"kaspa_testnet_10"` — Testnet 10
   *   - `"kaspa_devnet"` — Devnet
   * @returns The name of the new network after switching
   * @throws Throws if the network name is not recognized
   *
   * @example
   * ```ts
   * const newNetwork = await window.kasware.switchNetwork('kaspa_testnet_11');
   * console.log('Switched to:', newNetwork); // "kaspa_testnet_11"
   * ```
   */
  switchNetwork(network: string): Promise<string>;

  /**
   * Get the KasWare wallet extension version.
   *
   * @returns Version string (e.g. "0.13.5")
   */
  getVersion(): Promise<string>;

  // -----------------------------------------------------------------------
  // Balance Queries
  // -----------------------------------------------------------------------

  /**
   * Get the KAS balance for the currently connected account.
   *
   * All amounts are in **sompi** (1 KAS = 100,000,000 sompi).
   * Returns `null` if no account is found, or `{}` if not connected.
   *
   * @returns Balance object with confirmed, unconfirmed, and total amounts in sompi
   *
   * @example
   * ```ts
   * const balance = await window.kasware.getBalance();
   * console.log('Total:', balance.total, 'sompi');
   * console.log('Total:', Number(balance.total) / 1e8, 'KAS');
   * ```
   */
  getBalance(): Promise<{ confirmed: string; unconfirmed: string; total: string } | null | {}>;

  /**
   * Get the KRC20 token balances for the currently connected account.
   *
   * Returns an array of inscription objects representing the user's KRC20
   * token holdings, fetched from the Kasplex indexer. Returns `null` if no
   * account is found, or `[]` if not connected.
   *
   * @returns Array of KRC20 token inscription objects, `null`, or `[]`
   *
   * @example
   * ```ts
   * const tokens = await window.kasware.getKRC20Balance();
   * tokens.forEach(t => console.log(t.tick, t.amt));
   * ```
   */
  getKRC20Balance(): Promise<any[] | null | []>;

  // -----------------------------------------------------------------------
  // UTXO Queries
  // -----------------------------------------------------------------------

  /**
   * Get UTXO entries for a given address.
   *
   * Returns the unspent transaction outputs that can be used as inputs
   * for new transactions. If no address is provided, uses the currently
   * connected account's address.
   *
   * @param address - Kaspa address to query UTXOs for (optional, defaults to current account)
   * @returns Array of UTXO entry objects
   * @throws Throws if the dApp is not connected or no account is found
   *
   * @example
   * ```ts
   * const entries = await window.kasware.getUtxoEntries('kaspatest:qz9d...');
   * console.log('Available UTXOs:', entries.length);
   * ```
   */
  getUtxoEntries(address?: string): Promise<IUtxoEntryJson[]>;

  /**
   * Get the P2SH commit address for an inscription.
   *
   * Computes the pay-to-script-hash address that will receive funds
   * in the commit phase of a commit-reveal inscription. This address
   * is derived from the inscription JSON, the current account's public key,
   * and address type.
   *
   * @param inscribeJsonString - JSON string of the inscription data
   * @returns The P2SH commit address
   * @throws Throws if the dApp is not connected or no account is found
   *
   * @example
   * ```ts
   * const inscription = JSON.stringify({ p: "KRC-20", op: "mint", tick: "WARE" });
   * const p2shAddr = await window.kasware.getP2shAddress(inscription);
   * ```
   */
  getP2shAddress(inscribeJsonString: string): Promise<string>;

  // -----------------------------------------------------------------------
  // Message Signing & Verification
  // -----------------------------------------------------------------------

  /**
   * Sign an arbitrary message with the current account's private key.
   *
   * Prompts the user with a signing approval dialog. The signature can
   * later be verified with {@link verifyMessage} or {@link verifyMessageECDSA}.
   *
   * @param text - The message string to sign
   * @param params - Signing options:
   *   - `type` — Signature algorithm: `'schnorr'`, `'ecdsa'`, or `'auto'` (default).
   *     When `'auto'` or undefined, KasWare selects the appropriate algorithm
   *     based on the address type.
   *   - `noAuxRand` — If `true`, uses deterministic auxiliary randomness for
   *     Schnorr signatures. Recommended for reproducible signing.
   *     @see https://github.com/kaspanet/rusty-kaspa/pull/587
   *
   * @returns The signature string (hex-encoded)
   * @throws Throws if the user rejects the signing request
   *
   * @example
   * ```ts
   * // Schnorr signature with no auxiliary randomness
   * const sig = await window.kasware.signMessage('hello world', {
   *   type: 'schnorr',
   *   noAuxRand: true,
   * });
   *
   * // Auto-detect signature type
   * const sig2 = await window.kasware.signMessage('hello world', { noAuxRand: false });
   * ```
   */
  signMessage(
    text: string,
    params?: { type?: TSignMessage; noAuxRand?: boolean } | TSignMessage
  ): Promise<string>;

  /**
   * Verify a Schnorr-signed message against a public key.
   *
   * "Safe" method — does not require wallet unlock or approval.
   *
   * @param pubkey - The hex-encoded public key of the signer
   * @param message - The original message that was signed
   * @param sig - The Schnorr signature to verify
   * @returns `true` if the signature is valid, `false` otherwise
   *
   * @example
   * ```ts
   * const isValid = await window.kasware.verifyMessage(pubKey, 'hello world', signature);
   * console.log('Schnorr valid:', isValid);
   * ```
   */
  verifyMessage(pubkey: string, message: string, sig: string): Promise<boolean>;

  /**
   * Verify an ECDSA-signed message against a public key.
   *
   * "Safe" method — does not require wallet unlock or approval.
   *
   * @param pubkey - The hex-encoded public key of the signer
   * @param message - The original message that was signed
   * @param sig - The ECDSA signature to verify
   * @returns `true` if the signature is valid, `false` otherwise
   *
   * @example
   * ```ts
   * const isValid = await window.kasware.verifyMessageECDSA(pubKey, 'hello world', signature);
   * console.log('ECDSA valid:', isValid);
   * ```
   */
  verifyMessageECDSA(pubkey: string, message: string, sig: string): Promise<boolean>;

  // -----------------------------------------------------------------------
  // Send KAS
  // -----------------------------------------------------------------------

  /**
   * Send native KAS to an address.
   *
   * Prompts the user with a transaction approval dialog showing the
   * recipient, amount, and optional priority fee.
   *
   * @param toAddress - Recipient Kaspa address
   * @param sompi - Amount to send in **sompi** (1 KAS = 100,000,000 sompi).
   *   For example, to send 1 KAS, pass `100000000`.
   * @param options - Transaction options:
   *   - `priorityFee` — Priority fee in sompi to incentivize faster transaction inclusion
   *   - `payload` — Optional data payload to attach to the transaction
   * @returns The transaction ID of the sent transaction
   * @throws Throws if the user rejects the transaction or inputs are invalid
   *
   * @example
   * ```ts
   * // Send 1 KAS with a priority fee
   * const txId = await window.kasware.sendKaspa(
   *   'kaspatest:qz9d...',
   *   100000000,  // 1 KAS in sompi
   *   { priorityFee: 10000, payload: '' }
   * );
   * ```
   */
  sendKaspa(
    toAddress: string,
    sompi: number,
    options?: { priorityFee: number; payload?: string }
  ): Promise<string>;

  // -----------------------------------------------------------------------
  // KRC20 Token Operations
  // -----------------------------------------------------------------------

  /**
   * Sign and submit a KRC20 transaction (deploy, mint, or transfer).
   *
   * This is the primary method for KRC20 operations. The `type` parameter
   * determines the operation, and the `inscribeJsonString` must follow
   * the KRC20 JSON schema for that operation.
   *
   * Prompts the user with a transaction approval dialog.
   *
   * @param inscribeJsonString - JSON string of the KRC20 operation.
   *   Schema varies by operation type:
   *   - **Deploy**: `{ p: "KRC-20", op: "deploy", tick: "TICK", max: "21000000", lim: "1000" }`
   *   - **Mint**: `{ p: "KRC-20", op: "mint", tick: "TICK" }`
   *   - **Transfer**: `{ p: "KRC-20", op: "transfer", tick: "TICK", amt: "100000000", to: "kaspa:..." }`
   * @param type - The transaction type (see {@link TxType})
   * @param destAddr - Destination address for transfers (empty string for deploy/mint)
   * @param priorityFee - Priority fee in KAS (not sompi) to incentivize faster inclusion
   * @returns The transaction ID
   * @throws Throws if the user rejects the transaction or the JSON is invalid
   *
   * @example
   * ```ts
   * // Deploy a new KRC20 token
   * const deployJson = JSON.stringify({
   *   p: "KRC-20", op: "deploy", tick: "WARE",
   *   max: "21000000000000000000000000000000", lim: "100000000000000000000"
   * });
   * const txId = await window.kasware.signKRC20Transaction(
   *   deployJson, TxType.SIGN_KRC20_DEPLOY, '', 0.1
   * );
   *
   * // Transfer KRC20 tokens
   * const transferJson = JSON.stringify({
   *   p: "KRC-20", op: "transfer", tick: "WARE",
   *   amt: "100000000", to: "kaspatest:qz9d..."
   * });
   * const txId2 = await window.kasware.signKRC20Transaction(
   *   transferJson, TxType.SIGN_KRC20_TRANSFER, 'kaspatest:qz9d...', 0.1
   * );
   * ```
   */
  signKRC20Transaction(
    inscribeJsonString: string,
    type: TxType,
    destAddr?: string,
    priorityFee?: number
  ): Promise<string>;

  // -----------------------------------------------------------------------
  // KRC20 Marketplace Orders
  // -----------------------------------------------------------------------

  /**
   * Create a KRC20 sell order on the marketplace.
   *
   * Prompts the user with an order creation approval dialog.
   *
   * @param params - Order parameters:
   *   - `krc20Tick` — KRC20 token ticker to sell
   *   - `krc20Amount` — Amount of tokens to sell (in minimal units)
   *   - `kasAmount` — Asking price in KAS (in minimal units)
   *   - `psktExtraOutput` — Optional extra PSKT outputs for the order
   *   - `priorityFee` — Priority fee in KAS
   * @returns The order creation result
   *
   * @example
   * ```ts
   * const result = await window.kasware.createKRC20Order({
   *   krc20Tick: 'WARE',
   *   krc20Amount: 100000000,
   *   kasAmount: 500000000,
   *   priorityFee: 0.1,
   * });
   * ```
   */
  createKRC20Order(params: {
    krc20Tick: string;
    krc20Amount: number;
    kasAmount: number;
    psktExtraOutput?: [{ address: string; amount: number }];
    priorityFee?: number;
  }): Promise<any>;

  /**
   * Cancel an existing KRC20 sell order.
   *
   * Prompts the user with a cancellation approval dialog.
   *
   * @param params - Cancellation parameters:
   *   - `krc20Tick` — KRC20 token ticker of the order to cancel
   *   - `txJsonString` — JSON string of the order transaction (optional)
   *   - `sendCommitTxId` — Commit transaction ID of the order (optional)
   * @returns The cancellation transaction ID
   */
  cancelKRC20Order(params: {
    krc20Tick: string;
    txJsonString?: string;
    sendCommitTxId?: string;
  }): Promise<string>;

  /**
   * Sign (without broadcasting) a KRC20 order cancellation.
   *
   * Returns the signed transaction object instead of broadcasting it.
   * Useful for building custom workflows where you want to control
   * when the cancellation is submitted.
   *
   * @param params - Same as {@link cancelKRC20Order}
   * @returns The signed transaction object (not submitted to the network)
   */
  signCancelKRC20Order(params: {
    krc20Tick: string;
    txJsonString?: string;
    sendCommitTxId?: string;
  }): Promise<any>;

  /**
   * Buy a KRC20 token from an existing sell order.
   *
   * Prompts the user with a purchase approval dialog.
   *
   * @param params - Purchase parameters:
   *   - `txJsonString` — JSON string of the order to purchase
   *   - `extraOutput` — Optional extra outputs for the purchase transaction
   *   - `priorityFee` — Priority fee in KAS
   * @returns The purchase transaction ID
   */
  buyKRC20Token(params: {
    txJsonString: string;
    extraOutput?: [{ address: string; amount: number }];
    priorityFee?: number;
  }): Promise<string>;

  /**
   * Sign (without broadcasting) a KRC20 token purchase.
   *
   * Returns the signed transaction object instead of broadcasting it.
   *
   * @param params - Same as {@link buyKRC20Token}
   * @returns The signed transaction object (not submitted to the network)
   */
  signBuyKRC20Token(params: {
    txJsonString: string;
    extraOutput?: [{ address: string; amount: number }];
    priorityFee?: number;
  }): Promise<any>;

  // -----------------------------------------------------------------------
  // KRC20 Batch Transfer
  // -----------------------------------------------------------------------

  /**
   * Execute a batch of KRC20 token transfers.
   *
   * Initiates multiple KRC20 transfers in a single approval flow.
   * Progress is reported via the `'krc20BatchTransferChanged'` event.
   *
   * **Important:** The wallet must have sufficient KAS balance to cover
   * all transfers in the batch (typically ~2.5 KAS per transfer for
   * commit-reveal fees).
   *
   * @param list - Array of transfer items, each specifying ticker, recipient, and amount
   * @param priorityFee - Priority fee in KAS (optional)
   * @returns Initial batch result
   *
   * @example
   * ```ts
   * window.kasware.on('krc20BatchTransferChanged', (results) => {
   *   results.forEach(r => console.log(r.tick, r.status, r.txId?.revealId));
   * });
   *
   * await window.kasware.krc20BatchTransferTransaction([
   *   { tick: 'WARE', dec: '8', to: 'kaspatest:qz9...', amount: 1.5 },
   *   { tick: 'TESLA', dec: '8', to: 'kaspatest:qp2...', amount: 0.3 },
   * ]);
   * ```
   */
  krc20BatchTransferTransaction(list: IBatchTransfer[], priorityFee?: number): Promise<any>;

  /**
   * Cancel an in-progress KRC20 batch transfer.
   *
   * Stops processing remaining items in the current batch.
   * Already-submitted transfers cannot be undone.
   *
   * @example
   * ```ts
   * await window.kasware.cancelKRC20BatchTransfer();
   * ```
   */
  cancelKRC20BatchTransfer(): Promise<void>;

  // -----------------------------------------------------------------------
  // Commit-Reveal Inscriptions
  // -----------------------------------------------------------------------

  /**
   * Build an inscription script for the commit-reveal pattern.
   *
   * Constructs the script and derives the P2SH commit address from the
   * inscription data, the current account's public key, and address type.
   * This is the first step before calling {@link submitCommit},
   * {@link submitReveal}, or {@link submitCommitReveal}.
   *
   * @param params - Script build parameters:
   *   - `type` — The inscription protocol type (KRC20, KNS, or KSPR_KRC721)
   *   - `data` — JSON string of the inscription content
   * @returns Object containing the script hex and P2SH commit address
   *
   * @example
   * ```ts
   * // Build a KRC20 mint script
   * const inscription = JSON.stringify({ p: "krc-20", op: "mint", tick: "WARE" });
   * const { script, p2shAddress } = await window.kasware.buildScript({
   *   type: BuildScriptType.KRC20,
   *   data: inscription,
   * });
   * console.log('Script:', script);
   * console.log('P2SH address:', p2shAddress);
   * ```
   */
  buildScript(params: { type: BuildScriptType; data: string }): Promise<IBuildScriptResult>;

  /**
   * Submit the commit transaction for a commit-reveal inscription.
   *
   * The commit transaction sends KAS to the P2SH address derived from
   * the inscription script. After the commit is confirmed, call
   * {@link submitReveal} with the P2SH UTXOs to complete the inscription.
   *
   * For most use cases, {@link submitCommitReveal} is simpler as it
   * handles both phases in a single call.
   *
   * Prompts the user with a transaction approval dialog.
   *
   * @param params - Commit transaction parameters (see {@link ISubmitCommitParams})
   * @returns The commit transaction result
   * @throws Throws if the user rejects the transaction
   *
   * @example
   * ```ts
   * const { script, p2shAddress } = await window.kasware.buildScript({...});
   * const entries = await window.kasware.getUtxoEntries(address);
   *
   * const result = await window.kasware.submitCommit({
   *   priorityEntries: [],
   *   entries,
   *   outputs: [{ address: p2shAddress, amount: 2.5 }],
   *   changeAddress: address,
   *   priorityFee: 0,
   *   networkId: 'testnet-11',
   *   script,
   * });
   * ```
   */
  submitCommit(params: ISubmitCommitParams): Promise<any>;

  /**
   * Submit the reveal transaction for a commit-reveal inscription.
   *
   * The reveal transaction spends the P2SH output from the commit
   * transaction, exposing the inscription script on-chain. This is
   * what makes the inscription visible on the Kaspa network.
   *
   * Call this after the commit transaction has been submitted and
   * you have the P2SH UTXOs available.
   *
   * Prompts the user with a transaction approval dialog.
   *
   * @param params - Reveal transaction parameters (see {@link ISubmitRevealParams})
   * @returns The reveal transaction result
   * @throws Throws if the user rejects the transaction
   *
   * @example
   * ```ts
   * const p2shEntries = await window.kasware.getUtxoEntries(p2shAddress);
   * const entries = await window.kasware.getUtxoEntries(address);
   *
   * const result = await window.kasware.submitReveal({
   *   priorityEntries: [p2shEntries[0]],
   *   entries,
   *   outputs: [],
   *   changeAddress: address,
   *   priorityFee: 0,
   *   networkId: 'testnet-11',
   *   script,
   * });
   * ```
   */
  submitReveal(params: ISubmitRevealParams): Promise<any>;

  /**
   * Submit both commit and reveal transactions in a single call.
   *
   * This is the recommended way to perform commit-reveal inscriptions
   * for most use cases. It handles the entire flow: building the commit
   * transaction with the P2SH output, then immediately creating the
   * reveal transaction that spends it.
   *
   * Prompts the user with a transaction approval dialog.
   *
   * @param commit - Commit parameters (without `script` and `networkId`, which are separate arguments)
   * @param reveal - Reveal parameters (without `priorityEntries`, `entries`, `script`, and `networkId`)
   * @param script - The inscription script hex (from {@link buildScript})
   * @param networkId - The network ID (e.g. "mainnet", "testnet-11")
   * @returns The combined commit-reveal result
   * @throws Throws if the user rejects the transaction
   *
   * @example
   * ```ts
   * const { script, p2shAddress } = await window.kasware.buildScript({...});
   * const entries = await window.kasware.getUtxoEntries(address);
   *
   * const result = await window.kasware.submitCommitReveal(
   *   {
   *     entries,
   *     outputs: [{ address: p2shAddress, amount: 2.5 }],
   *     changeAddress: address,
   *     priorityFee: 0,
   *   },
   *   {
   *     changeAddress: address,
   *     priorityFee: 0,
   *   },
   *   script,
   *   'testnet-11'
   * );
   * ```
   */
  submitCommitReveal(
    commit: Omit<ISubmitCommitParams, 'script' | 'networkId'>,
    reveal: Omit<ISubmitRevealParams, 'priorityEntries' | 'entries' | 'script' | 'networkId'>,
    script: string,
    networkId?: string
  ): Promise<any>;

  // -----------------------------------------------------------------------
  // PSKT (Partially Signed Kaspa Transaction)
  // -----------------------------------------------------------------------

  /**
   * Sign a Partially Signed Kaspa Transaction (PSKT).
   *
   * Prompts the user with a signing approval dialog. PSKTs allow
   * multiple parties to collaboratively sign a transaction, similar
   * to PSBT in Bitcoin.
   *
   * After signing, use {@link pushTx} to broadcast the transaction.
   *
   * @param params - PSKT signing parameters (see {@link ISignPsktOptions})
   * @returns The signed transaction as a JSON string
   * @throws Throws if the user rejects the signing request
   *
   * @example
   * ```ts
   * const signedTx = await window.kasware.signPskt({
   *   txJsonString: psktJson,
   *   options: {
   *     signInputs: [
   *       { index: 0, sighashType: SighashBiType.All },
   *     ],
   *   },
   * });
   * const txId = await window.kasware.pushTx(signedTx);
   * ```
   */
  signPskt(params: ISignPsktOptions): Promise<string>;

  /**
   * Broadcast a signed transaction to the Kaspa network.
   *
   * "Safe" method — does not require wallet unlock or approval,
   * since the transaction is already signed.
   *
   * Typically used after {@link signPskt} to submit the signed PSKT.
   *
   * @param rawtx - The signed transaction as a JSON string (from {@link signPskt})
   * @returns The transaction ID of the broadcast transaction
   *
   * @example
   * ```ts
   * const signedTx = await window.kasware.signPskt({...});
   * const txId = await window.kasware.pushTx(signedTx);
   * console.log('Broadcast tx:', txId);
   * ```
   */
  pushTx(rawtx: string): Promise<string>;

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  /**
   * Register an event listener.
   *
   * KasWare emits events when the wallet state changes. Your dApp
   * should listen for these events to keep its state in sync.
   *
   * **Key events:**
   * - `'accountsChanged'` — Fired when the user switches accounts or
   *   connects/disconnects. Receives `string[]` of new account addresses.
   * - `'networkChanged'` — Fired when the user switches networks.
   *   Receives the new network name string (e.g. `"kaspa_mainnet"`).
   * - `'krc20BatchTransferChanged'` — Fired during batch transfer progress.
   *   Receives {@link IBatchTransferResult}[] with status updates.
   * - `'connect'` — Fired when the provider connects.
   * - `'disconnect'` — Fired when the provider disconnects.
   * - `'close'` — Same as disconnect.
   *
   * @param eventName - The event name to listen for
   * @param handler - The callback function
   *
   * @example
   * ```ts
   * window.kasware.on('accountsChanged', (accounts: string[]) => {
   *   if (accounts.length === 0) {
   *     // User disconnected
   *   } else {
   *     console.log('New account:', accounts[0]);
   *   }
   * });
   *
   * window.kasware.on('networkChanged', (network: string) => {
   *   console.log('Network changed to:', network);
   * });
   *
   * window.kasware.on('krc20BatchTransferChanged', (results: IBatchTransferResult[]) => {
   *   results.forEach(r => {
   *     console.log(`Transfer ${r.index}: ${r.status}`);
   *   });
   * });
   * ```
   */
  on(eventName: 'accountsChanged', handler: AccountsChangedHandler): void;
  on(eventName: 'networkChanged', handler: NetworkChangedHandler): void;
  on(eventName: 'krc20BatchTransferChanged', handler: BatchTransferChangedHandler): void;
  on(eventName: 'connect' | 'disconnect' | 'close', handler: ConnectionEventHandler): void;
  on(eventName: KaswareEventName, handler: (...args: any[]) => void): void;

  /**
   * Remove a previously registered event listener.
   *
   * Always call this when your component unmounts to prevent memory leaks.
   *
   * @param eventName - The event name to stop listening for
   * @param handler - The same handler function that was passed to {@link on}
   *
   * @example
   * ```ts
   * // Register
   * const handler = (accounts: string[]) => { ... };
   * window.kasware.on('accountsChanged', handler);
   *
   * // Cleanup on unmount
   * window.kasware.removeListener('accountsChanged', handler);
   * ```
   */
  removeListener(eventName: 'accountsChanged', handler: AccountsChangedHandler): void;
  removeListener(eventName: 'networkChanged', handler: NetworkChangedHandler): void;
  removeListener(eventName: 'krc20BatchTransferChanged', handler: BatchTransferChangedHandler): void;
  removeListener(eventName: 'connect' | 'disconnect' | 'close', handler: ConnectionEventHandler): void;
  removeListener(eventName: KaswareEventName, handler: (...args: any[]) => void): void;
}

// ---------------------------------------------------------------------------
// Window type augmentation
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    /** KasWare Wallet provider, injected by the KasWare browser extension */
    kasware: KaswareProvider;
  }
}
