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
      kasware.on("krc20BatchTransferChanged", handleKRC20BatchTransferChangedChanged);

      return () => {
        kasware.removeListener("accountsChanged", handleAccountsChanged);
        kasware.removeListener("networkChanged", handleNetworkChanged);
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
            <CommitReveal />
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

function CommitReveal() {
  const [txid, setTxid] = useState("");
  const [entries, setEntries] = useState([]);

  const handleCommit = async () => {
    const entries = await (window as any).kasware.getUtxoEntries();
    console.log("entries: ", entries);
    const p2shAddress = "kaspatest:pzchcdxny03nds4jck4manfpk887jrll6r75s64fcn85th8dp7eqw5yapl0kd";
    const entries2 = await (window as any).kasware.getUtxoEntries(p2shAddress);
    console.log("p2sh address: ", entries2);
    const [address] = await (window as any).kasware.getAccounts();
    const network = await (window as any).kasware.getNetwork();
    const outputs = [{ address: p2shAddress, amount: 2.5 }];
    let networkId = "testnet-10";
    switch (network) {
      case "kaspa_mainnet":
        networkId = "mainnet";
        break;
      case "kaspa_testnet_11":
        networkId = "testnet-11";
        break;
      case "kaspa_testnet_10":
        networkId = "testnet-10";
        break;
      case "kaspa_devnet":
        networkId = "devnet";
        break;
      default:
        networkId = "testnet-10";
        break;
    }

    const script =
      "208ad66334695581374bd6e1ba5b710d365690d7a758535852fe8223deecc541e7ac0063076b6173706c657800287b2270223a224b52432d3230222c226f70223a226d696e74222c227469636b223a2257415245227d68";
    const results = await (window as any).kasware.submitCommit({
      priorityEntries: [],
      entries: entries,
      outputs,
      changeAddress: address,
      priorityFee: 0,
      networkId,
      script,
    });
    console.log("results: ", results);
    return results;
  };
  const handleReveal = async () => {
    const entries = await (window as any).kasware.getUtxoEntries();
    console.log("entries: ", entries);
    const p2shAddress = "kaspatest:pzchcdxny03nds4jck4manfpk887jrll6r75s64fcn85th8dp7eqw5yapl0kd";
    const entries2 = await (window as any).kasware.getUtxoEntries(p2shAddress);
    console.log("p2sh address: ", entries2);
    const [address] = await (window as any).kasware.getAccounts();
    const network = await (window as any).kasware.getNetwork();
    const outputs = [{ address: p2shAddress, amount: 2.5 }];
    let networkId = "testnet-10";
    switch (network) {
      case "kaspa_mainnet":
        networkId = "mainnet";
        break;
      case "kaspa_testnet_11":
        networkId = "testnet-11";
        break;
      case "kaspa_testnet_10":
        networkId = "testnet-10";
        break;
      case "kaspa_devnet":
        networkId = "devnet";
        break;
      default:
        networkId = "testnet-10";
        break;
    }

    const script =
      "208ad66334695581374bd6e1ba5b710d365690d7a758535852fe8223deecc541e7ac0063076b6173706c657800287b2270223a224b52432d3230222c226f70223a226d696e74222c227469636b223a2257415245227d68";
    const results = await (window as any).kasware.submitReveal({
      priorityEntries: [entries2[0]],
      entries,
      outputs: [],
      changeAddress: address,
      priorityFee: 0,
      networkId,
      script,
    });
    console.log("results: ", results);
    return results;
  };

  const handleCommitReveal = async () => {
    const entries = await (window as any).kasware.getUtxoEntries();
    console.log("entries: ", entries);
    const p2shAddress = "kaspatest:pzchcdxny03nds4jck4manfpk887jrll6r75s64fcn85th8dp7eqw5yapl0kd";
    const entries2 = await (window as any).kasware.getUtxoEntries(p2shAddress);
    console.log("p2sh address: ", entries2);
    const [address] = await (window as any).kasware.getAccounts();
    const network = await (window as any).kasware.getNetwork();
    const outputs = [{ address: p2shAddress, amount: 2.5 }];
    let networkId = "testnet-10";
    switch (network) {
      case "kaspa_mainnet":
        networkId = "mainnet";
        break;
      case "kaspa_testnet_11":
        networkId = "testnet-11";
        break;
      case "kaspa_testnet_10":
        networkId = "testnet-10";
        break;
      case "kaspa_devnet":
        networkId = "devnet";
        break;
      default:
        networkId = "testnet-10";
        break;
    }

    const script =
      "208ad66334695581374bd6e1ba5b710d365690d7a758535852fe8223deecc541e7ac0063076b6173706c657800287b2270223a224b52432d3230222c226f70223a226d696e74222c227469636b223a2257415245227d68";
    const revenueAddress = "kaspatest:qrpygfgeq45h68wz5pk4rtay02w7fwlhax09x4rsqceqq6s3mz6uctlh3a695";
    const commit = {
      priorityEntries: [],
      entries,
      outputs,
      changeAddress: address,
      priorityFee: 0.01,
    };

    const reveal = {
      outputs: [{ address: revenueAddress, amount: 0.5 }],
      changeAddress: address,
      priorityFee: 0.02,
    };

    const results = await (window as any).kasware.submitCommitReveal(commit, reveal, script, networkId);
    console.log("results: ", results);
    return results;
  };

  return (
    <Card size="small" title="Commit & Reveal" style={{ width: 300, margin: 10 }}>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleCommit();
          } catch (e) {
            setTxid((e as any).message);
          }
        }}
      >
        Commit
      </Button>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          await handleReveal();
        }}
      >
        Reveal
      </Button>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          await handleCommitReveal();
        }}
      >
        Commit and Reveal
      </Button>
    </Card>
  );
}

function randomString(len = 4) {
  var $chars = "ABCDEFGHJKMNPQRSTWXYZ";
  var maxPos = $chars.length;
  var pwd = "";
  for (let i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}

export default App;
