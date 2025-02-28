import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import { Button, Card, Input, Radio } from "antd";
enum TxType {
  SIGN_TX,
  SEND_KASPA,
  SIGN_KRC20_DEPLOY,
  SIGN_KRC20_MINT,
  SIGN_KRC20_TRANSFER,
}

interface ICancelKRC20Order {
  krc20Tick: string;
  // txJsonString or sendCommitTxId must be set
  txJsonString?: string;
  sendCommitTxId?: string;
}

interface BatchTransferRes {
  index?: number;
  tick?: string;
  to?: string;
  amount?: number;
  status:
    | "success"
    | "failed"
    | "preparing 20%"
    | "preparing 40%"
    | "preparing 60%"
    | "preparing 80%"
    | "preparing 100%";

  errorMsg?: string;
  txId?: { commitId: string; revealId: string };
}

interface transactionReplacementResponse {
  transactionId: string;
  replacedTransactionId: string;
}

function App() {
  const [kaswareInstalled, setKaswareInstalled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [publicKey, setPublicKey] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState({
    confirmed: 0,
    unconfirmed: 0,
    total: 0,
  });
  const [network, setNetwork] = useState("kaspa_mainnet");
  const [batchTransferProgress, setBatchTransferProgress] = useState<BatchTransferRes | undefined>(undefined);

  const getBasicInfo = async () => {
    const kasware = (window as any).kasware;
    const [address] = await kasware.getAccounts();
    setAddress(address);

    const publicKey = await kasware.getPublicKey();
    setPublicKey(publicKey);

    const balance = await kasware.getBalance();
    setBalance(balance);
    const krc20Balances = await kasware.getKRC20Balance();
    console.log("krc20Balances", krc20Balances);

    const network = await kasware.getNetwork();
    setNetwork(network);
  };

  const selfRef = useRef<{ accounts: string[] }>({
    accounts: [],
  });
  const self = selfRef.current;
  const handleAccountsChanged = (_accounts: string[]) => {
    if (self.accounts[0] === _accounts[0]) {
      // prevent from triggering twice
      return;
    }
    self.accounts = _accounts;
    if (_accounts.length > 0) {
      setAccounts(_accounts);
      setConnected(true);

      setAddress(_accounts[0]);

      getBasicInfo();
    } else {
      setConnected(false);
    }
  };

  const handleNetworkChanged = (network: string) => {
    console.log("network", network);
    setNetwork(network);
    getBasicInfo();
  };

  const handleBalanceChanged = (balance: any) => {
    console.log("balance", balance);
    setNetwork(network);
    getBasicInfo();
  };
  const handleKRC20BatchTransferChangedChanged = (ress: BatchTransferRes[]) => {
    ress.forEach((res) => {
      console.log("result", res.status, res?.index, res?.txId?.revealId, res?.errorMsg);
      setBatchTransferProgress(res);
    });
  };

  useEffect(() => {
    async function checkKasware() {
      let kasware = (window as any).kasware;

      for (let i = 1; i < 10 && !kasware; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100 * i));
        kasware = (window as any).kasware;
      }

      if (kasware) {
        setKaswareInstalled(true);
      } else if (!kasware) return;

      kasware.getAccounts().then((accounts: string[]) => {
        handleAccountsChanged(accounts);
      });

      kasware.on("accountsChanged", handleAccountsChanged);
      kasware.on("networkChanged", handleNetworkChanged);
      kasware.on("balanceChanged", handleBalanceChanged);
      kasware.on("krc20BatchTransferChanged", handleKRC20BatchTransferChangedChanged);

      return () => {
        kasware.removeListener("accountsChanged", handleAccountsChanged);
        kasware.removeListener("networkChanged", handleNetworkChanged);
        kasware.removeListener("balanceChanged", handleBalanceChanged);
        kasware.removeListener("krc20BatchTransferChanged", handleKRC20BatchTransferChangedChanged);
      };
    }

    checkKasware().then();
  }, []);

  if (!kaswareInstalled) {
    return (
      <div className="App">
        <header className="App-header">
          <div>
            <Button
              onClick={() => {
                window.location.href = "https://kasware.xyz";
              }}
            >
              Install Kasware Wallet
            </Button>
          </div>
        </header>
      </div>
    );
  }
  const kasware = (window as any).kasware;
  return (
    <div className="App">
      <header className="App-header">
        <p>Kasware Wallet Demo</p>
        {connected ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Button
              onClick={async () => {
                const origin = window.location.origin;
                await kasware.disconnect(origin);
                handleAccountsChanged([]);
              }}
            >
              Disconnect Kasware Wallet
            </Button>
            <Card size="small" title="Basic Info" style={{ width: 300, margin: 10 }}>
              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>Address:</div>
                <div style={{ wordWrap: "break-word" }}>{address}</div>
              </div>

              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>PublicKey:</div>
                <div style={{ wordWrap: "break-word" }}>{publicKey}</div>
              </div>

              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>Balance: (kasAmount)</div>
                <div style={{ wordWrap: "break-word" }}>{balance.total}</div>
              </div>
            </Card>

            <Card size="small" title="Switch Network" style={{ width: 300, margin: 10 }}>
              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>Network:</div>
                <Radio.Group
                  onChange={async (e) => {
                    const network = await kasware.switchNetwork(e.target.value);
                    setNetwork(network);
                  }}
                  value={network}
                >
                  <Radio value={"kaspa_mainnet"}>mainnet</Radio>
                  <Radio value={"kaspa_testnet_11"}>testnet-11</Radio>
                  <Radio value={"kaspa_testnet_10"}>testnet-10</Radio>
                  <Radio value={"kaspa_devnet"}>devnet</Radio>
                </Radio.Group>
              </div>
            </Card>
            <KRC20MarketPlace />
          </div>
        ) : (
          <div>
            <Button
              onClick={async () => {
                const result = await kasware.requestAccounts();
                handleAccountsChanged(result);
              }}
            >
              Connect Kasware Wallet
            </Button>
          </div>
        )}
      </header>
    </div>
  );
}

function KRC20MarketPlace() {
  const [buyTxid, setBuyTxid] = useState("");
  const [cancelTxid, setCancelTxid] = useState("");
  const [sendCommitTxId, setSendCommitTxId] = useState("");
  const [txJsonString, setTxJsonString] = useState("");
  const [tick, setTick] = useState("ghoad");
  // txJsonString is pskt string
  const handleCreateOrder = async () => {
    try {
      const listJsonString = '{"p":"krc-20","op":"list","tick":"aaaa","amt":"1000000000"}';
      const listP2shAddress = await (window as any).kasware.getP2shAddress(listJsonString);
      console.log("listP2shAddress: ", listP2shAddress);

      const sendJsonString = '{"p":"krc-20","op":"send","tick":"aaaa"}';
      const sendP2shAddress = await (window as any).kasware.getP2shAddress(sendJsonString);
      console.log("sendP2shAddress: ", sendP2shAddress);
      // todo: check the token balance first. if balance is not enough, then return error

      const krc20Balances = await (window as any).kasware.getKRC20Balance();
      console.log("krc20Balances", krc20Balances);

      const { txJsonString, sendCommitTxId } = await (window as any).kasware.createKRC20Order({
        krc20Tick: tick,
        krc20Amount: 10,
        kasAmount: 490,
        // // you can use psktExtraOutput to create a service fee or other things
        // psktExtraOutput: [
        //   { address: "kaspatest:qrpygfgeq45h68wz5pk4rtay02w7fwlhax09x4rsqceqq6s3mz6uctlh3a695", amount: 0.2 },
        // ],
        priorityFee: 0,
      });
      setTxJsonString(txJsonString);
      setSendCommitTxId(sendCommitTxId);
      // to do: search sendCommitTxId on kasplex api to confirm if it is recongized by indexer or not.
      console.log("result: ", txJsonString, sendCommitTxId);
    } catch (e) {
      console.log("error: ", e);
    }
  };
  const handleBuy = async () => {
    try {
      // todo: check the kas balance first. if balance is not enough, then return error
      // todo: check the utxo in the txjsonstring on api.kaspa.org or use kaspa-wasm to see if it exists. if not, it means user has canceled this order.
      const txid = await (window as any).kasware.buyKRC20Token({
        txJsonString,
        // you can use extraOutput to create a service fee or other things
        extraOutput: [
          { address: "kaspatest:qra06rlekd5jsqzc29zguvvrkq8qflhdpsg3uyqw3xvth5ljf5ujs7l2q92ma", amount: 0.2 },
        ],
        // extraOutput: [],
        priorityFee: 0,
      });
      // when network is congested. users may want to speed up and add new tx fee, which causes the txid be replacd by a new one. you can use transactionReplacementResponse event to monitor this process
      /* There is also an api called signBuyKRC20Token() with the same params as buyKRC20Token(). it returns a seralized transaction.
       * You can use signBuyKRC20Token() to sign a transaction and broadcast it by yourself.
       */
      setBuyTxid(txid);
    } catch (e) {
      console.log("error: ", e);
    }
  };

  // when network is congested. users may want to speed up and add new tx fee, which causes the txid be replacd by a new one. you can use transactionReplacementResponse event to monitor this process

  const handleCancelOrder = async () => {
    try {
      const txid = await (window as any).kasware.cancelKRC20Order({
        krc20Tick: tick,
        // txJsonString or sendCommitTxId must be set one of them.
        // txJsonString,
        sendCommitTxId,
      });
      setCancelTxid(txid);
      /* There is also an api called signCancelKRC20Order() with the same params as cancelKRC20Order(). it returns seralized transaction.
       * You can use signCancelKRC20Order() to sign a transaction and broadcast it by yourself.
       */
    } catch (e) {
      console.log("error: ", e);
    }
  };

  const handleSubmitTransactionReplacementResponse = (res: transactionReplacementResponse) => {
    console.log("transactionId", res.transactionId);
    console.log("replacedTransaction", res.replacedTransactionId);
  };

  useEffect(() => {
    async function checkKasware() {
      let kasware = (window as any).kasware;
      for (let i = 1; i < 10 && !kasware; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100 * i));
        kasware = (window as any).kasware;
      }
      if (!kasware) return;
      kasware.on("transactionReplacementResponse", handleSubmitTransactionReplacementResponse);
      return () => {
        kasware.removeListener("transactionReplacementResponse", handleSubmitTransactionReplacementResponse);
      };
    }
    checkKasware().then();
  }, []);
  return (
    <Card size="small" title="KRC20 Market Place" style={{ width: 300, margin: 10 }}>
      {sendCommitTxId !== undefined && sendCommitTxId.length > 0 && (
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <div style={{ fontWeight: "bold" }}>data:</div>
          <div style={{ wordWrap: "break-word" }}>{sendCommitTxId}</div>
        </div>
      )}
      {txJsonString !== undefined && txJsonString.length > 0 && (
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <div style={{ fontWeight: "bold" }}>pskt:</div>
          <div style={{ wordWrap: "break-word" }}>{txJsonString}</div>
        </div>
      )}
      {buyTxid !== undefined && buyTxid.length > 0 && (
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <div style={{ fontWeight: "bold" }}>data:</div>
          <div style={{ wordWrap: "break-word" }}>{buyTxid}</div>
        </div>
      )}
      {cancelTxid !== undefined && cancelTxid.length > 0 && (
        <div style={{ textAlign: "left", marginTop: 10 }}>
          <div style={{ fontWeight: "bold" }}>data:</div>
          <div style={{ wordWrap: "break-word" }}>{cancelTxid}</div>
        </div>
      )}
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleCreateOrder();
          } catch (e) {
            console.log("error: ", e);
            setSendCommitTxId((e as any).message);
          }
        }}
      >
        Create KRC20 Order
      </Button>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleBuy();
          } catch (e) {
            console.log("error: ", e);
            setBuyTxid((e as any).message);
          }
        }}
      >
        Buy KRC20 Token
      </Button>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleCancelOrder();
          } catch (e) {
            console.log("error: ", e);
            setCancelTxid((e as any).message);
          }
        }}
      >
        Cancel KRC20 Order
      </Button>
    </Card>
  );
}

export default App;
