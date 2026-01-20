import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { Button, Card, Row, Input, Radio, CollapseProps, Collapse } from "antd";
import { getKasNetworkId } from "./util";
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
 * @category Consensus https://kaspa-mdbook.aspectron.com/transactions/sighashes.html
 */
enum SighashType {
  All = 0b00000001, // 1
  None = 0b00000010, // 2
  Single = 0b00000100, // 4
  AllAnyOneCanPay = 0b10000001, // 128 + 1 = 129
  NoneAnyOneCanPay = 0b10000010, // 128 + 2 = 130
  SingleAnyOneCanPay = 0b10000100, // 128 + 4 = 132
}

type TSignMessage = "schnorr" | "ecdsa";

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
    setInterval(() => {
      kasware.getBalance().then((balance: any) => {
        console.log("balance", balance);
      });
    }, 1000 * 40);
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
  const handleKRC20BatchTransferChanged = (ress: BatchTransferRes[]) => {
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
      kasware.on("krc20BatchTransferChanged", handleKRC20BatchTransferChanged);

      return () => {
        kasware.removeListener("accountsChanged", handleAccountsChanged);
        kasware.removeListener("networkChanged", handleNetworkChanged);
        kasware.removeListener("krc20BatchTransferChanged", handleKRC20BatchTransferChanged);
      };
    }

    checkKasware().then();
  }, []);

  const items: CollapseProps["items"] = [
    {
      key: "sendKaspa",
      label: <div style={{ textAlign: "start" }}>kasware.sendKaspa</div>,
      children: <SendKaspa />,
    },
    {
      key: "signMessage",
      label: <div style={{ textAlign: "start" }}>kasware.signMessage</div>,
      children: <SignMessageCard />,
    },
    {
      key: "verifyMessage",
      label: <div style={{ textAlign: "start" }}>kasware.verifyMessage</div>,
      children: <VerifyMessageCard publicKey={publicKey} />,
    },
    {
      key: "signPskt",
      label: <div style={{ textAlign: "start" }}>kasware.signPskt</div>,
      children: <SignPSKTCard />,
    },
    {
      key: "build-script",
      label: <div style={{ textAlign: "start" }}>kasware.buildScript</div>,
      children: <BuildScriptCard />,
    },
    {
      key: "transferKRC20",

      label: <div style={{ textAlign: "start" }}>Transfer KRC20 Token</div>,
      children: <TransferKRC20 />,
    },
    {
      key: "mintKRC20",
      label: <div style={{ textAlign: "start" }}>Mint KRC20 Token</div>,
      children: <MintKRC20 />,
    },
    {
      key: "deployKRC20",
      label: <div style={{ textAlign: "start" }}>Deploy KRC20 Token</div>,
      children: <DeployKRC20 />,
    },
    {
      key: "commitreveal",
      label: <div style={{ textAlign: "start" }}>Commit&Reveal: support KRC20, KNS and KRC721</div>,
      children: <CommitReveal />,
    },
    {
      key: "batchTransferKRC20",
      label: <div style={{ textAlign: "start" }}>Batch Transfer KRC20 Token</div>,
      children: <BatchTransferKRC20V2 batchTransferProgress={batchTransferProgress} />,
    },
  ];

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
              marginBottom: 30,
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
            <Card size="small" title="Basic Info" style={{ margin: 10, maxWidth: 600 }}>
              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>Address:</div>
                <div style={{ wordWrap: "break-word" }}>{address}</div>
              </div>

              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>PublicKey:</div>
                <div style={{ wordWrap: "break-word" }}>{publicKey}</div>
              </div>

              <div style={{ textAlign: "left", marginTop: 10 }}>
                <div style={{ fontWeight: "bold" }}>Balance: (sompi unit)</div>
                <div style={{ wordWrap: "break-word" }}>{balance.total}</div>
              </div>
            </Card>

            <Card size="small" title="Switch Network" style={{ margin: 10, maxWidth: 600 }}>
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
            <Collapse
              style={{
                backgroundColor: "rgba(255,255,255,0.7)",
                width: "90%",
              }}
              items={items}
              defaultActiveKey={[]}
              onChange={() => {
                // todo
              }}
            />
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
const type: TSignMessage | undefined = undefined;
const noAuxRand = true;
function SignMessageCard() {
  const [message, setMessage] = useState("hello world~");
  const [signature, setSignature] = useState("");
  return (
    <Card size="small" title="Sign Message" style={{ margin: 10, maxWidth: 600 }}>
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
          /**
           * if type is undefined, kasware will try to sign with the correct type for the address.
           * you can also set the type to TSignMessage.Schnorr or TSignMessage.ECDSA
           *  For noAuxRand parameter details, see: https://github.com/kaspanet/rusty-kaspa/pull/587
           */
          const signature = await (window as any).kasware.signMessage(message, { type, noAuxRand });
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
  const [isVerifiedSchnorr, setIsVerifiedSchnorr] = useState(false);
  const [isVerifiedECDSA, setIsVerifiedECDSA] = useState(false);
  return (
    <Card size="small" title="Sign Message" style={{ margin: 10, maxWidth: 600 }}>
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
      <Row justify="space-between" style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>is verified(schnorr)?:</div>
        <div style={{ wordWrap: "break-word" }}>{isVerifiedSchnorr ? "true" : "false"}</div>
      </Row>
      <Row justify="space-between" style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>is verified(ECDSA)?:</div>
        <div style={{ wordWrap: "break-word" }}>{isVerifiedECDSA ? "true" : "false"}</div>
      </Row>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          const isVerifiedECDSA = await (window as any).kasware.verifyMessageECDSA(publicKey, message, signature);
          setIsVerifiedECDSA(isVerifiedECDSA);

          const isVerifiedSchnorr = await (window as any).kasware.verifyMessage(publicKey, message, signature);
          setIsVerifiedSchnorr(isVerifiedSchnorr);
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
  const doc_url = useMemo(() => "https://docs.kasware.xyz/wallet/dev-base/dev-integration#sendkaspa", []);

  return (
    <Card size="small" title="Send Kaspa" style={{ margin: 10, maxWidth: 600 }}>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>Docs:</div>
        <a href={doc_url} target="_blank">
          {doc_url}
        </a>
      </div>
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
    <Card size="small" title="Deploy KRC20" style={{ margin: 10, maxWidth: 600 }}>
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
    <Card size="small" title="Mint KRC20" style={{ margin: 10, maxWidth: 600 }}>
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
    <Card size="small" title="Transfer KRC20" style={{ margin: 10, maxWidth: 600 }}>
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
        tick: "decimn",
        dec: "9",
        to: "kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp",
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
        to: "kaspatest:qrpygfgeq45h68wz5pk4rtay02w7fwlhax09x4rsqceqq6s3mz6uctlh3a695",
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
        to: "kaspatest:qrr4vus08lgqvt8assshjguvnatrpqf43k4as2wmv8frwf5rz34eg63a8mcx0",
        amount: 2.9,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qrr4vus08lgqvt8assshjguvnatrpqf43k4as2wmv8frwf5rz34eg63a8mcx0",
        amount: 3,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qrr4vus08lgqvt8assshjguvnatrpqf43k4as2wmv8frwf5rz34eg63a8mcx0",
        amount: 3.1,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qrjsftdvrxhy0assk30hv5l40ejydfcskdl4z4ms4m4dg4e6e2fhgmav6vh97",
        amount: 3.2,
      },
      {
        tick: "tesla",
        dec: "8",
        to: "kaspatest:qra06rlekd5jsqzc29zguvvrkq8qflhdpsg3uyqw3xvth5ljf5ujs7l2q92ma",
        amount: 3.3,
      },
    ];

    //  the kas balance should be larger than 30 kas in order to start batch transfer.
    const result = await (window as any).kasware.krc20BatchTransferTransaction(list);
    // the function above should work with handleKRC20BatchTransferChanged event.
    // krc20BatchTransferTransaction() is called, handleKRC20BatchTransferChanged event will monitor activities and return any latest successful/failed result.
    setTxid(result);
  };
  return (
    <Card size="small" title="Batch Transfer KRC20 V2" style={{ margin: 10, maxWidth: 600 }}>
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
function SignPSKTCard() {
  // const str = `{
  //           "gas": "0",
  //           "id": "327d9aa1bd824fbf92dcb225d9ce8de74369b31d852d4ca8cdc046dbdf246d67",
  //           "inputs": [
  //               {
  //                   "index": 0,
  //                   "sequence": "0",
  //                   "sigOpCount": 1,
  //                   "signatureScript": "",
  //                   "transactionId": "9528544f210e32c550d5cdf32f5bf2258fab1211286cbd633143a61f5ace2e76",
  //                   "utxo": {
  //                       "address": "kaspatest:qrexqdvr9unte8eqvkn92eptns2l8vcuq2szrsmd7gq70x9fs3cqxare7k8w3",
  //                       "amount": "1000000000",
  //                       "blockDaaScore": "313096313",
  //                       "isCoinbase": false,
  //                       "scriptPublicKey": "20f26035832f26bc9f2065a655642b9c15f3b31c02a021c36df201e798a9847003ac"
  //                   }
  //               }
  //           ],
  //           "lockTime": "0",
  //           "mass": "0",
  //           "outputs": [
  //               {
  //                   "scriptPublicKey": "000020f26035832f26bc9f2065a655642b9c15f3b31c02a021c36df201e798a9847003ac",
  //                   "value": "100000000"
  //               },
  //               {
  //                   "scriptPublicKey": "000020f26035832f26bc9f2065a655642b9c15f3b31c02a021c36df201e798a9847003ac",
  //                   "value": "889998000"
  //               }
  //           ],
  //           "payload": "ac61760167747970655f696478403462306136356434323361626438653733323536386364393863376430613037396464323064643537306163376437623637623766623236306439373565613469747970655f6e616d65666372756d7034626964784030616631393732346232376434306435656533613161386366623330336539343938623231646461663630366337326662376533323130656266633865663433626d727840653234646163386531643235386566343065353235636566653164663864373133356130393032343936623964336162666438613564346430613334623061646473616c74784039383865633531333632316466633963316332356332353462626262623032623731333261363039323137626434663930333630646132623465613064323138686d616e696665737481a561687840353866616232653836376238633133316234326661666339353731626437316633626263643530303737353039306539626438356364383163366436323061326173076373657100636c6f63686b617370615f7478647265665f60646d657461a56863617465676f72796a746563686e6f6c6f6779686c616e677561676562656e687375627469746c65674c6576656e64696474616773816474657374657469746c65674c6576656e646966705f6861736878403031633262376439653139303362663938346537313331656231633365376335326161353564393633663566663433316138393861663265396435356537653962727601626564a26470726576f6637365710163656e63f6",
  //           "subnetworkId": "0000000000000000000000000000000000000000",
  //           "version": 0
  //       }`;
  const str = `{
  "id": "1e6fca120d0f2b81c32d49833b8ac35b6bcebedd052e2607683776b31055088f",
  "version": 0,
  "inputs": [
      {
          "index": 0,
          "sequence": "0",
          "sigOpCount": 1,
          "signatureScript": "",
          "transactionId": "6bc6a81a50e8d62a0c96ae6ae9f03dc79c251e9fde5b4fd3ce9ee65ddcadf0bd",
          "utxo": {
              "address": "kaspatest:qrexqdvr9unte8eqvkn92eptns2l8vcuq2szrsmd7gq70x9fs3cqxare7k8w3",
              "amount": "100000000000",
              "blockDaaScore": "313835007",
              "isCoinbase": false,
              "scriptPublicKey": "000020f26035832f26bc9f2065a655642b9c15f3b31c02a021c36df201e798a9847003ac"
          }
      }
  ],
  "outputs": [
      {
          "scriptPublicKey": "000020f26035832f26bc9f2065a655642b9c15f3b31c02a021c36df201e798a9847003ac",
          "value": "100000000"
      },
      {
          "scriptPublicKey": "000020f26035832f26bc9f2065a655642b9c15f3b31c02a021c36df201e798a9847003ac",
          "value": "99889998000"
      }
  ],
  "subnetworkId": "0000000000000000000000000000000000000000",
  "lockTime": "0",
  "gas": "0",
  "mass": "3154",
  "payload": ""
}`;
  const [pskt, setPskt] = useState(str);

  // const [pskt, setPskt] = useState(
  //   `{"id":"6664c0a75a041dd1f591c5ecc539875a99e5a49aaacb2e1ef04e354d0e69c271","version":0,"inputs":[{"transactionId":"006866a332181f4e3aab471af6435a645f5ca33697633fa20233af59ae4e8b2f","index":1,"sequence":"0","sigOpCount":1,"signatureScript":"","utxo":{"address":"kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp","amount":"99986271","scriptPublicKey":"0000208ad66334695581374bd6e1ba5b710d365690d7a758535852fe8223deecc541e7ac","blockDaaScore":"87857448","isCoinbase":false}},{"transactionId":"c46a6fcd4746bbe60a68bf2efb543a65685f81b72440fcaa271cf86b25720d31","index":0,"sequence":"0","sigOpCount":1,"signatureScript":"","utxo":{"address":"kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp","amount":"49100001963","scriptPublicKey":"0000208ad66334695581374bd6e1ba5b710d365690d7a758535852fe8223deecc541e7ac","blockDaaScore":"87513486","isCoinbase":false}}],"outputs":[{"value":"110000000","scriptPublicKey":"000020ab4b389073830cb400647fb8dc116e6b8a71c17e1c09ba7eaef2ddd78616f306ac"},{"value":"49089970826","scriptPublicKey":"0000208ad66334695581374bd6e1ba5b710d365690d7a758535852fe8223deecc541e7ac"}],"subnetworkId":"0000000000000000000000000000000000000000","lockTime":"0","gas":"0","mass":"3154","payload":""}`
  // );

  const [signature, setSignature] = useState("");
  return (
    <Card size="small" title="Sign Pskt" style={{ margin: 10, maxWidth: 600 }}>
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
          try {
            const signature = await (window as any).kasware.signPskt({
              txJsonString: pskt,
              options: {
                signInputs: [
                  {
                    index: 0,
                    sighashType: SighashType.All,
                  },
                  {
                    index: 1,
                    sighashType: SighashType.All,
                  },
                ],
              },
            });
            console.log("signed tx", signature);
            setSignature(signature);
            const txId = await (window as any).kasware.pushTx(signature);
            console.log("txId", txId);
          } catch (e) {
            setSignature((e as any).message);
          }
        }}
      >
        Sign PSKT
      </Button>
    </Card>
  );
}

export enum BuildScriptType {
  KRC20 = "KRC20",
  KNS = "KNS",
  KSPR_KRC721 = "KSPR_KRC721",
}
function BuildScriptCard() {
  const [script, setScript] = useState("");
  const [p2shAddress, setP2shAddress] = useState("");

  const handleBuildScript = async () => {
    // const json = {
    //   p: "KRC-20",
    //   op: "transfer",
    //   tick: "TQAWS",
    //   amt: "112300000",
    //   to: "kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp",
    // };
    // const json = {
    //   op: "transfer",
    //   p: "domain",
    //   id: "fb70ef0725ac6e5d4d70bcab94eb6a66a1835516ffba59ee7b6a7ae1a9110a5ai0",
    //   to: "kaspatest:qp2vyqkuanrqn38362wa5ja93e3se4cv3zqa8yhjalrj24n3g2t52kgq32m8c",
    // };
    const json = {
      p: "krc-20",
      op: "mint",
      tick: "ware",
    };

    const data = JSON.stringify(json, null, 0);
    const { script, p2shAddress } = await (window as any).kasware.buildScript({
      type: BuildScriptType.KRC20,
      data: data,
    });
    setScript(script);
    setP2shAddress(p2shAddress);

    console.log("script: ", script);
    console.log("p2sh address: ", p2shAddress);
  };

  return (
    <Card size="small" title="Build inscription script" style={{ margin: 10, maxWidth: 600 }}>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          await handleBuildScript();
        }}
      >
        Build script
      </Button>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>script:</div>
        <div style={{ wordWrap: "break-word" }}>{script}</div>
      </div>
      <div style={{ textAlign: "left", marginTop: 10 }}>
        <div style={{ fontWeight: "bold" }}>p2sh address:</div>
        <div style={{ wordWrap: "break-word" }}>{p2shAddress}</div>
      </div>
    </Card>
  );
}

function CommitReveal() {
  const [txid, setTxid] = useState("");
  const [entries, setEntries] = useState([]);

  const handleCommit = async () => {
    const network = await (window as any).kasware.getNetwork();
    const networkId = getKasNetworkId(network);
    const data = {
      p: "krc-20",
      op: "mint",
      tick: "ware",
    };
    const jsonStr = JSON.stringify(data, null, 0);
    const { script, p2shAddress } = await (window as any).kasware.buildScript({
      type: BuildScriptType.KRC20,
      data: jsonStr,
    });
    const entries = await (window as any).kasware.getUtxoEntries();
    console.log("entries: ", entries);
    const entries2 = await (window as any).kasware.getUtxoEntries(p2shAddress);
    console.log("p2sh address: ", entries2);
    const [address] = await (window as any).kasware.getAccounts();
    const outputs = [{ address: p2shAddress, amount: 2.5 }];
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
    const network = await (window as any).kasware.getNetwork();
    const networkId = getKasNetworkId(network);
    const data = {
      p: "krc-20",
      op: "mint",
      tick: "ware",
    };
    const jsonStr = JSON.stringify(data, null, 0);
    const { script, p2shAddress } = await (window as any).kasware.buildScript({
      type: BuildScriptType.KRC20,
      data: jsonStr,
    });
    const entries = await (window as any).kasware.getUtxoEntries();
    console.log("entries: ", entries);
    const entries2 = await (window as any).kasware.getUtxoEntries(p2shAddress);
    console.log("p2sh address: ", entries2);
    const [address] = await (window as any).kasware.getAccounts();

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
    const [address] = await (window as any).kasware.getAccounts();
    const network = await (window as any).kasware.getNetwork();
    let networkId = getKasNetworkId(network);

    // const data = {
    //   p: "KRC-20",
    //   op: "transfer",
    //   tick: "TQAWS",
    //   amt: "112300000",
    //   to: "kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp",
    // };
    // const data = {
    //   op: "transfer",
    //   p: "domain",
    //   id: "fb70ef0725ac6e5d4d70bcab94eb6a66a1835516ffba59ee7b6a7ae1a9110a5ai0",
    //   to: "kaspatest:qp2vyqkuanrqn38362wa5ja93e3se4cv3zqa8yhjalrj24n3g2t52kgq32m8c",
    // };
    const data = {
      p: "krc-20",
      op: "mint",
      tick: "ware",
    };
    // const data = {
    //   p: "krc-721",
    //   op: "mint",
    //   tick: "nacho", // ticker symbol 1..10 alphanumeric characters
    // };
    // const data = {
    //   p: "krc-20",
    //   op: "deploy",
    //   mod: "issue",
    //   name: "tsixb",
    //   max: "10000000000000000",
    //   pre: "100000000000",
    //   dec: "6",
    // };
    // const data = { p: "krc-20", op: "burn", ca: "4e756639821c7fae9020804e4671130a4d58941fd0f6df1bef25a1a43a796cea", amt: "6600000000" };
    // const data = {"p":"krc-20","op":"blacklist","ca":"4e756639821c7fae9020804e4671130a4d58941fd0f6df1bef25a1a43a796cea","mod":"add","to":"kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx"}
    // const data = {"p":"krc-20","op":"issue","ca":"4e756639821c7fae9020804e4671130a4d58941fd0f6df1bef25a1a43a796cea","amt":"100000000000","to":"kaspatest:qz45kwyswwpsedqqv3lm3hq3de4c5uwp0cwqnwn74medm4uxzmesvksw9fuyx"}
    // const data = {"p":"krc-20","op":"chown","ca":"4e756639821c7fae9020804e4671130a4d58941fd0f6df1bef25a1a43a796cea","to":"kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp"}
    // const data = {
    //   p: "krc-20",
    //   op: "transfer",
    //   ca: "bafda700676bcc34a5058efdf46e628821f55da0365b4f462a12fd3f869936da",
    //   amt: "100000000000000000",
    //   to: "kaspatest:qp2vyqkuanrqn38362wa5ja93e3se4cv3zqa8yhjalrj24n3g2t52kgq32m8c",
    // };
    const jsonStr = JSON.stringify(data, null, 0);
    const { script, p2shAddress } = await (window as any).kasware.buildScript({
      type: BuildScriptType.KRC20,
      data: jsonStr,
    });
    // const script =
    //   "203d47c7f78eca297598aceeb60009aba381cc39e1f46601bbcbade77df10c9a5fac0063046b737072514c68b9000461760161631a0003173b616c54aef33e76972c08b8ac19221cb6e7d2fa4054af436173584086f6d618cc35d422287f1aede1435fbfd327309909b46db80944900963af863569f6a2011ab0436194cb793da6484c7b775ef57590cabd49bca17623d3285d15004c8a7b2270223a226b72632d373231222c226f70223a227472616e73666572222c22746f6b656e4964223a2233343933222c22746f223a226b617370613a71706c6676776e74367977776a7a37366433333538616e68306b75796d6d616d667238656338363930377270666a79677a703065783464323833713364222c227469636b223a224e4143484f227d68";
    // const p2shAddress = "kaspa:qplfvwnt6ywwjz76d3358anh0kuymmamfr8ec86907rpfjygzp0ex4d283q3d";
    console.log("script", script);
    const commitPriorityFee = 0;
    const revealPriorityFee = 0;
    const commit = {
      priorityEntries: [],
      entries,
      outputs: [{ address: p2shAddress, amount: 2.5 + commitPriorityFee + revealPriorityFee }],
      changeAddress: address,
      priorityFee: commitPriorityFee, // unit is kas
    };
    // const revenueAddress = "kaspatest:qqryrzckeeyn2m6hlazx0p0qjjdnk909x4glzs4scqlqsrdfn5k2q4n495sea";
    const revenueAddress = "";
    const outputAmount = 0.5; // unit is kas
    const reveal = {
      outputs:
        revenueAddress?.length > 0 && outputAmount > 0
          ? [{ address: revenueAddress, amount: outputAmount }]
          : undefined,
      changeAddress: address,
      priorityFee: revealPriorityFee, // unit is kas
    };

    const results = await (window as any).kasware.submitCommitReveal(commit, reveal, script, networkId);
    console.log("results: ", results);
    return results;
  };

  return (
    <Card size="small" title="Commit & Reveal" style={{ margin: 10, maxWidth: 600 }}>
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

export default App;
