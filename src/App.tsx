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
            <SignMessageCard />
            <VerifyMessageCard publicKey={publicKey} />
            <SendKaspa />
            <DeployKRC20 />
            <MintKRC20 />
            <TransferKRC20 />
            <BatchTransferKRC20V2 batchTransferProgress={batchTransferProgress} />
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

function SignMessageCard() {
  const [message, setMessage] = useState("hello world~");
  const [signature, setSignature] = useState("");
  return (
    <Card size="small" title="Sign Message" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Message:</div>
        <Input
          defaultValue={message}
          onChange={(e) => {
            setMessage(e.target.value);
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Signature:</div>
        <div style={{ wordWrap: "break-word" }}>{signature}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          const signature = await (window as any).kasware.signMessage(message);
          setSignature(signature);
        }}
      >
        Sign Message
      </Button>
    </Card>
  );
}

function VerifyMessageCard({ publicKey }: { publicKey: string }) {
  const [message, setMessage] = useState("hello world~");
  const [signature, setSignature] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  return (
    <Card size="small" title="Sign Message" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Message:</div>
        <Input
          defaultValue={message}
          onChange={(e) => {
            setMessage(e.target.value);
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Signature:</div>
        <Input
          defaultValue={signature}
          onChange={(e) => {
            setSignature(e.target.value);
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>is verified?:</div>
        <div style={{ wordWrap: "break-word" }}>{isVerified ? "true" : "false"}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          const isVerified = await (window as any).kasware.verifyMessage(publicKey, message, signature);
          setIsVerified(isVerified);
        }}
      >
        Verify Message
      </Button>
    </Card>
  );
}

function SendKaspa() {
  const [toAddress, setToAddress] = useState("kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp");
  const [kasAmount, setKasAmount] = useState(1);
  const [txid, setTxid] = useState("");
  return (
    <Card size="small" title="Send Kaspa" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Receiver Address:</div>
        <Input
          defaultValue={toAddress}
          onChange={(e) => {
            setToAddress(e.target.value);
          }}
        ></Input>
      </div>

      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Amount: (KAS)</div>
        <Input
          defaultValue={kasAmount}
          onChange={(e) => {
            setKasAmount(parseInt(e.target.value));
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>txid:</div>
        <div style={{ wordWrap: "break-word" }}>{txid}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            const txid = await (window as any).kasware.sendKaspa(toAddress, kasAmount * 100000000, {
              priorityFee: 10000,
            });
            setTxid(txid);
          } catch (e) {
            setTxid((e as any).message);
          }
        }}
      >
        SendKaspa
      </Button>
    </Card>
  );
}

function DeployKRC20() {
  // let deployJsonString ='{"p":"KRC-20","op":"deploy","tick":"BBBB","max":"21000000000000000000000000000000","lim":"100000000000000000000"}';
  const [ticker, setTicker] = useState("");
  const [supply, setSupply] = useState(100000000);
  const [lim, setLim] = useState(1000);

  const [txid, setTxid] = useState("");
  const handleDeployment = async () => {
    const deployOjj = {
      p: "KRC-20",
      op: "deploy",
      tick: ticker,
      max: (supply * 100000000).toString(),
      lim: (lim * 100000000).toString(),
    };
    const jsonStr = JSON.stringify(deployOjj);
    // kas unit
    const priorityFee = 0.1;
    const destAddr = "";
    const txids = await (window as any).kasware.signKRC20Transaction(
      jsonStr,
      TxType.SIGN_KRC20_DEPLOY,
      destAddr,
      priorityFee
    );
    setTxid(txids);
  };

  useEffect(() => {
    const tempTick = randomString();
    console.log("temptick", tempTick);
    setTicker(tempTick);
  }, []);
  return (
    <Card size="small" title="Deploy KRC20" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Ticker:</div>
        <Input
          defaultValue={ticker}
          onChange={(e) => {
            setTicker(e.target.value);
          }}
        ></Input>
      </div>

      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Max Supply: </div>
        <Input
          defaultValue={supply}
          onChange={(e) => {
            setSupply(parseInt(e.target.value));
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Amount per mint: </div>
        <Input
          defaultValue={lim}
          onChange={(e) => {
            setLim(parseInt(e.target.value));
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>txid:</div>
        <div style={{ wordWrap: "break-word" }}>{txid}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleDeployment();
          } catch (e) {
            setTxid((e as any).message);
          }
        }}
      >
        Deploy
      </Button>
    </Card>
  );
}
function MintKRC20() {
  // let mintJsonString = '{\"p\":\"KRC-20\",\"op\":\"mint\",\"tick\":\"RBMV\"}'
  const [ticker, setTicker] = useState("RBMV");

  const [txid, setTxid] = useState("");
  const handleMint = async () => {
    const deployOjj = {
      p: "KRC-20",
      op: "mint",
      tick: ticker,
    };
    const jsonStr = JSON.stringify(deployOjj);
    console.log(jsonStr);
    // kas unit
    const priorityFee = 1.1;
    const destAddr = "";
    const txid = await (window as any).kasware.signKRC20Transaction(
      jsonStr,
      TxType.SIGN_KRC20_MINT,
      destAddr,
      priorityFee
    );
    setTxid(txid);
  };
  return (
    <Card size="small" title="Mint KRC20" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Ticker:</div>
        <Input
          defaultValue={ticker}
          onChange={(e) => {
            setTicker(e.target.value);
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>txid:</div>
        <div style={{ wordWrap: "break-word" }}>{txid}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleMint();
          } catch (e) {
            setTxid((e as any).message);
          }
        }}
      >
        Mint
      </Button>
    </Card>
  );
}
function TransferKRC20() {
  // let transferJsonString = '{\"p\":\"KRC-20\",\"op\":\"transfer\",\"tick\":\"RBMV\",\"amt\":\"50000000000\"}'
  const [ticker, setTicker] = useState("RBMV");
  const [amount, setAmount] = useState(1);
  const [toAddress, setToAddress] = useState("kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp");

  const [txid, setTxid] = useState("");
  const handleTransfer = async () => {
    const deployOjj = {
      p: "KRC-20",
      op: "transfer",
      tick: ticker,
      amt: (amount * 100000000).toString(),
      to: toAddress,
    };
    const jsonStr = JSON.stringify(deployOjj);
    console.log(jsonStr);
    // kas unit
    const priorityFee = 0.1;
    const txid = await (window as any).kasware.signKRC20Transaction(
      jsonStr,
      TxType.SIGN_KRC20_TRANSFER,
      toAddress,
      priorityFee
    );
    setTxid(txid);
  };
  return (
    <Card size="small" title="Transfer KRC20" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Receiver Address:</div>
        <Input
          defaultValue={toAddress}
          onChange={(e) => {
            setToAddress(e.target.value);
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Ticker:</div>
        <Input
          defaultValue={ticker}
          onChange={(e) => {
            setTicker(e.target.value);
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Amount:</div>
        <Input
          defaultValue={amount}
          onChange={(e) => {
            setAmount(Number(e.target.value));
          }}
        ></Input>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>txid:</div>
        <div style={{ wordWrap: "break-word" }}>{txid}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleTransfer();
          } catch (e) {
            setTxid((e as any).message);
          }
        }}
      >
        Send KRC20 Token
      </Button>
    </Card>
  );
}

function BatchTransferKRC20V2({ batchTransferProgress }: { batchTransferProgress: BatchTransferRes | undefined }) {
  const [txid, setTxid] = useState("");

  const handleBatchTransfer2 = async () => {
    let list = [
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.1,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.2,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.3,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.4,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.5,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.6,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.7,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.8,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.9,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.1,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.2,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.3,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.4,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.5,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.6,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.7,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.8,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.9,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.1,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.2,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.3,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.4,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.5,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.6,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.7,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.8,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.9,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.1,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.2,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.3,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.4,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.5,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.6,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.7,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.8,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.9,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 4,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 4.1,
      },
      {
        tick: "tesla",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 4.2,
      },
    ];

    //  the kas balance should be larger than 30 kas in order to start batch transfer.
    const result = await (window as any).kasware.krc20BatchTransferTransaction(list);
    // the function above should work with handleKRC20BatchTransferChangedChanged event.
    // krc20BatchTransferTransaction() is called, handleKRC20BatchTransferChangedChanged event will monitor activities and return any latest successful/failed result.
    setTxid(result);
  };
  return (
    <Card size="small" title="Batch Transfer KRC20 V2" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>status:</div>
        <div style={{ wordWrap: "break-word" }}>{batchTransferProgress?.status}</div>
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: "bold" }}>index:</div>
        <div style={{ wordWrap: "break-word" }}>{batchTransferProgress?.index}</div>
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: "bold" }}>tick:</div>
        <div style={{ wordWrap: "break-word" }}>{batchTransferProgress?.tick}</div>
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: "bold" }}>to:</div>
        <div style={{ wordWrap: "break-word" }}>{batchTransferProgress?.to}</div>
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: "bold" }}>amount:</div>
        <div style={{ wordWrap: "break-word" }}>{batchTransferProgress?.amount}</div>
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: "bold" }}>errorMsg:</div>
        <div style={{ wordWrap: "break-word" }}>{batchTransferProgress?.errorMsg}</div>
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontWeight: "bold" }}>txId:</div>
        <div style={{ wordWrap: "break-word" }}>{batchTransferProgress?.txId?.revealId}</div>
      </div>

      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleBatchTransfer2();
          } catch (e) {
            setTxid((e as any).message);
          }
        }}
      >
        Batch Transfer KRC20 Token V2
      </Button>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          await (window as any).kasware.cancelKRC20BatchTransfer();
        }}
      >
        Cancel
      </Button>
    </Card>
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
        const revenueAddress = 'kaspatest:qrpygfgeq45h68wz5pk4rtay02w7fwlhax09x4rsqceqq6s3mz6uctlh3a695'
      const commit = {
      priorityEntries: [],
      entries,
      outputs,
      changeAddress: address,
      priorityFee: 0.01,
    };

    const reveal = {
      outputs:  [{ address: revenueAddress, amount: 0.5 }],
      changeAddress: address,
      priorityFee: 0.02,
    };

    const results = await (window as any).kasware.submitCommitReveal(commit, reveal, script, networkId);
    console.log("results: ", results);
    return results;
  };

  return (
    <Card size="small" title="Batch Transfer KRC20 V2" style={{ width: 300, margin: 10 }}>
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
