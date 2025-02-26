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

/**
 * Kaspa Sighash types allowed by consensus
 * @category Consensus
 */
enum SighashType {
  All = 0,
  None = 1,
  Single = 2,
  AllAnyOneCanPay = 3,
  NoneAnyOneCanPay = 4,
  SingleAnyOneCanPay = 5,
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
            <SignPSKTCard />

            <BatchTransferKRC20V2 batchTransferProgress={batchTransferProgress} />
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
  const [payload, setPayload] = useState("");
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
        <div style={{ fontWeight: "bold" }}>Payload:</div>
        <Input
          defaultValue={payload}
          onChange={(e) => {
            setPayload(e.target.value);
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
              payload,
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

function SignPSKTCard() {
  const [pskt, setPskt] = useState(
    `{"id":"6664c0a75a041dd1f591c5ecc539875a99e5a49aaacb2e1ef04e354d0e69c271","version":0,"inputs":[{"transactionId":"006866a332181f4e3aab471af6435a645f5ca33697633fa20233af59ae4e8b2f","index":1,"sequence":"0","sigOpCount":1,"signatureScript":"","utxo":{"address":"kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp","amount":"99986271","scriptPublicKey":"0000208ad66334695581374bd6e1ba5b710d365690d7a758535852fe8223deecc541e7ac","blockDaaScore":"87857448","isCoinbase":false}},{"transactionId":"c46a6fcd4746bbe60a68bf2efb543a65685f81b72440fcaa271cf86b25720d31","index":0,"sequence":"0","sigOpCount":1,"signatureScript":"","utxo":{"address":"kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp","amount":"49100001963","scriptPublicKey":"0000208ad66334695581374bd6e1ba5b710d365690d7a758535852fe8223deecc541e7ac","blockDaaScore":"87513486","isCoinbase":false}}],"outputs":[{"value":"110000000","scriptPublicKey":"000020ab4b389073830cb400647fb8dc116e6b8a71c17e1c09ba7eaef2ddd78616f306ac"},{"value":"49089970826","scriptPublicKey":"0000208ad66334695581374bd6e1ba5b710d365690d7a758535852fe8223deecc541e7ac"}],"subnetworkId":"0000000000000000000000000000000000000000","lockTime":"0","gas":"0","mass":"3154","payload":""}`
  );
  const [signature, setSignature] = useState("");
  return (
    <Card size="small" title="Sign Message" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>PSKT Json string:</div>
        <Input
          defaultValue={pskt}
          onChange={(e) => {
            setPskt(e.target.value);
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
          const signature = await (window as any).kasware.signPskt({
            txJsonString: pskt,
            options: {
              signInputs: [
                {
                  index: 0,
                  sighashType: 0,
                },
                {
                  index: 1,
                  sighashType: 0,
                },
              ],
            },
          });
          const txId = await (window as any).kasware.pushTx(signature);
          console.log("txId", txId);
          setSignature(signature);
        }}
      >
        Sign PSKT
      </Button>
    </Card>
  );
}

function BatchTransferKRC20V2({ batchTransferProgress }: { batchTransferProgress: BatchTransferRes | undefined }) {
  const [txid, setTxid] = useState("");

  const handleBatchTransfer2 = async () => {
    let list = [
      {
        tick: "decimn",
        dec: "9",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.111111,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.2,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.3,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.4,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.5,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.6,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.7,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.8,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 0.9,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.1,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.2,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.3,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.4,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.5,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.6,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.7,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.8,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 1.9,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.1,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.2,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.3,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.4,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.5,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.6,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.7,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.8,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 2.9,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.1,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.2,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx",
        amount: 3.3,
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
