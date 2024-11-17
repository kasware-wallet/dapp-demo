import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { Button, Card, Input, Radio } from 'antd';
enum TxType {
  SIGN_TX,
  SEND_KASPA,
  SIGN_KRC20_DEPLOY,
  SIGN_KRC20_MINT,
  SIGN_KRC20_TRANSFER
}

interface BatchTransferRes {
  index?: number;
  tick?: string;
  to?: string;
  amount?: number;
  status:
    | 'success'
    | 'failed'
    | 'preparing 20%'
    | 'preparing 40%'
    | 'preparing 60%'
    | 'preparing 80%'
    | 'preparing 100%';

  errorMsg?: string;
  txId?: { commitId: string; revealId: string };
}

function App() {
  const [kaswareInstalled, setKaswareInstalled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [publicKey, setPublicKey] = useState('');
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState({
    confirmed: 0,
    unconfirmed: 0,
    total: 0
  });
  const [network, setNetwork] = useState('kaspa_mainnet');
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
    console.log('krc20Balances', krc20Balances);

    const network = await kasware.getNetwork();
    setNetwork(network);
  };

  const selfRef = useRef<{ accounts: string[] }>({
    accounts: []
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
    console.log('network', network);
    setNetwork(network);
    getBasicInfo();
  };
  const handleKRC20BatchTransferChangedChanged = (ress: BatchTransferRes[]) => {
    ress.forEach((res) => {
      console.log('result', res.status, res?.index, res?.txId?.revealId, res?.errorMsg);
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

      kasware.on('accountsChanged', handleAccountsChanged);
      kasware.on('networkChanged', handleNetworkChanged);
      kasware.on('krc20BatchTransferChanged', handleKRC20BatchTransferChangedChanged);

      return () => {
        kasware.removeListener('accountsChanged', handleAccountsChanged);
        kasware.removeListener('networkChanged', handleNetworkChanged);
        kasware.removeListener('krc20BatchTransferChanged', handleKRC20BatchTransferChangedChanged);
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
                window.location.href = 'https://kasware.xyz';
              }}>
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
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
            <Button
              onClick={async () => {
                const origin = window.location.origin;
                await kasware.disconnect(origin);
                handleAccountsChanged([]);
              }}>
              Disconnect Kasware Wallet
            </Button>
            <Card size="small" title="Basic Info" style={{ width: 300, margin: 10 }}>
              <div style={{ textAlign: 'left', marginTop: 10 }}>
                <div style={{ fontWeight: 'bold' }}>Address:</div>
                <div style={{ wordWrap: 'break-word' }}>{address}</div>
              </div>

              <div style={{ textAlign: 'left', marginTop: 10 }}>
                <div style={{ fontWeight: 'bold' }}>PublicKey:</div>
                <div style={{ wordWrap: 'break-word' }}>{publicKey}</div>
              </div>

              <div style={{ textAlign: 'left', marginTop: 10 }}>
                <div style={{ fontWeight: 'bold' }}>Balance: (kasAmount)</div>
                <div style={{ wordWrap: 'break-word' }}>{balance.total}</div>
              </div>
            </Card>

            <Card size="small" title="Switch Network" style={{ width: 300, margin: 10 }}>
              <div style={{ textAlign: 'left', marginTop: 10 }}>
                <div style={{ fontWeight: 'bold' }}>Network:</div>
                <Radio.Group
                  onChange={async (e) => {
                    const network = await kasware.switchNetwork(e.target.value);
                    setNetwork(network);
                  }}
                  value={network}>
                  <Radio value={'kaspa_mainnet'}>mainnet</Radio>
                  <Radio value={'kaspa_testnet_11'}>testnet-11</Radio>
                  <Radio value={'kaspa_testnet_10'}>testnet-10</Radio>
                  <Radio value={'kaspa_devnet'}>devnet</Radio>
                </Radio.Group>
              </div>
            </Card>
            <SignMessageCard />
            <VerifyMessageCard publicKey={publicKey} />
            <SendKaspa />
            <DeployKRC20 />
            <MintKRC20 />
            <TransferKRC20 />
            <KRC20MarketPlace />
          </div>
        ) : (
          <div>
            <Button
              onClick={async () => {
                const result = await kasware.requestAccounts();
                handleAccountsChanged(result);
              }}>
              Connect Kasware Wallet
            </Button>
          </div>
        )}
      </header>
    </div>
  );
}

function SignMessageCard() {
  const [message, setMessage] = useState('hello world~');
  const [signature, setSignature] = useState('');
  return (
    <Card size="small" title="Sign Message" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Message:</div>
        <Input
          defaultValue={message}
          onChange={(e) => {
            setMessage(e.target.value);
          }}></Input>
      </div>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Signature:</div>
        <div style={{ wordWrap: 'break-word' }}>{signature}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          const signature = await (window as any).kasware.signMessage(message);
          setSignature(signature);
        }}>
        Sign Message
      </Button>
    </Card>
  );
}

function VerifyMessageCard({ publicKey }: { publicKey: string }) {
  const [message, setMessage] = useState('hello world~');
  const [signature, setSignature] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  return (
    <Card size="small" title="Sign Message" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Message:</div>
        <Input
          defaultValue={message}
          onChange={(e) => {
            setMessage(e.target.value);
          }}></Input>
      </div>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Signature:</div>
        <Input
          defaultValue={signature}
          onChange={(e) => {
            setSignature(e.target.value);
          }}></Input>
      </div>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>is verified?:</div>
        <div style={{ wordWrap: 'break-word' }}>{isVerified ? 'true' : 'false'}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          const isVerified = await (window as any).kasware.verifyMessage(publicKey, message, signature);
          setIsVerified(isVerified);
        }}>
        Verify Message
      </Button>
    </Card>
  );
}

function SendKaspa() {
  const [toAddress, setToAddress] = useState('kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp');
  const [kasAmount, setKasAmount] = useState(1);
  const [txid, setTxid] = useState('');
  return (
    <Card size="small" title="Send Kaspa" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Receiver Address:</div>
        <Input
          defaultValue={toAddress}
          onChange={(e) => {
            setToAddress(e.target.value);
          }}></Input>
      </div>

      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Amount: (KAS)</div>
        <Input
          defaultValue={kasAmount}
          onChange={(e) => {
            setKasAmount(parseInt(e.target.value));
          }}></Input>
      </div>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>txid:</div>
        <div style={{ wordWrap: 'break-word' }}>{txid}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            const txid = await (window as any).kasware.sendKaspa(toAddress, kasAmount * 100000000, {
              priorityFee: 10000
            });
            setTxid(txid);
          } catch (e) {
            setTxid((e as any).message);
          }
        }}>
        SendKaspa
      </Button>
    </Card>
  );
}

function DeployKRC20() {
  // let deployJsonString ='{"p":"KRC-20","op":"deploy","tick":"BBBB","max":"21000000000000000000000000000000","lim":"100000000000000000000"}';
  const [ticker, setTicker] = useState('');
  const [supply, setSupply] = useState(100000000);
  const [lim, setLim] = useState(1000);

  const [txid, setTxid] = useState('');
  const handleDeployment = async () => {
    const deployOjj = {
      p: 'KRC-20',
      op: 'deploy',
      tick: ticker,
      max: (supply * 100000000).toString(),
      lim: (lim * 100000000).toString()
    };
    const jsonStr = JSON.stringify(deployOjj);
    // kas unit
    const priorityFee = 0.1;
    const destAddr = '';
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
    console.log('temptick', tempTick);
    setTicker(tempTick);
  }, []);
  return (
    <Card size="small" title="Deploy KRC20" style={{ width: 300, margin: 10 }}>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Ticker:</div>
        <Input
          defaultValue={ticker}
          onChange={(e) => {
            setTicker(e.target.value);
          }}></Input>
      </div>

      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Max Supply: </div>
        <Input
          defaultValue={supply}
          onChange={(e) => {
            setSupply(parseInt(e.target.value));
          }}></Input>
      </div>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Amount per mint: </div>
        <Input
          defaultValue={lim}
          onChange={(e) => {
            setLim(parseInt(e.target.value));
          }}></Input>
      </div>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>txid:</div>
        <div style={{ wordWrap: 'break-word' }}>{txid}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleDeployment();
          } catch (e) {
            setTxid((e as any).message);
          }
        }}>
        Deploy
      </Button>
    </Card>
  );
}
function MintKRC20() {
  // let mintJsonString = '{\"p\":\"KRC-20\",\"op\":\"mint\",\"tick\":\"RBMV\"}'
  const [ticker, setTicker] = useState('RBMV');

  const [txid, setTxid] = useState('');
  const handleMint = async () => {
    const deployOjj = {
      p: 'KRC-20',
      op: 'mint',
      tick: ticker
    };
    const jsonStr = JSON.stringify(deployOjj);
    console.log(jsonStr);
    // kas unit
    const priorityFee = 1.1;
    const destAddr = '';
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
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Ticker:</div>
        <Input
          defaultValue={ticker}
          onChange={(e) => {
            setTicker(e.target.value);
          }}></Input>
      </div>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>txid:</div>
        <div style={{ wordWrap: 'break-word' }}>{txid}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleMint();
          } catch (e) {
            setTxid((e as any).message);
          }
        }}>
        Mint
      </Button>
    </Card>
  );
}
function TransferKRC20() {
  // let transferJsonString = '{\"p\":\"KRC-20\",\"op\":\"transfer\",\"tick\":\"RBMV\",\"amt\":\"50000000000\"}'
  const [ticker, setTicker] = useState('RBMV');
  const [amount, setAmount] = useState(1);
  const [toAddress, setToAddress] = useState('kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp');

  const [txid, setTxid] = useState('');
  const handleTransfer = async () => {
    const deployOjj = {
      p: 'KRC-20',
      op: 'transfer',
      tick: ticker,
      amt: (amount * 100000000).toString(),
      to: toAddress
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
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Receiver Address:</div>
        <Input
          defaultValue={toAddress}
          onChange={(e) => {
            setToAddress(e.target.value);
          }}></Input>
      </div>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Ticker:</div>
        <Input
          defaultValue={ticker}
          onChange={(e) => {
            setTicker(e.target.value);
          }}></Input>
      </div>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>Amount:</div>
        <Input
          defaultValue={amount}
          onChange={(e) => {
            setAmount(Number(e.target.value));
          }}></Input>
      </div>
      <div style={{ textAlign: 'left', marginTop: 10 }}>
        <div style={{ fontWeight: 'bold' }}>txid:</div>
        <div style={{ wordWrap: 'break-word' }}>{txid}</div>
      </div>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleTransfer();
          } catch (e) {
            setTxid((e as any).message);
          }
        }}>
        Send KRC20 Token
      </Button>
    </Card>
  );
}

function KRC20MarketPlace() {
  const [buyTxid, setBuyTxid] = useState('');
  const [cancelTxid, setCancelTxid] = useState('');
  const [sendCommitTxId, setSendCommitTxId] = useState('');
  const [txJsonString, setTxJsonString] = useState('');
  // txJsonString is pskt string
  const handleCreateOrder = async () => {
    try {
      // todo: check the token balance first. if balance is not enough, then return error

      const krc20Balances = await (window as any).kasware.getKRC20Balance();
      console.log('krc20Balances', krc20Balances);

      const { txJsonString, sendCommitTxId } = await (window as any).kasware.createKRC20Order({
        krc20Tick: 'ware',
        krc20Amount: 10,
        kasAmount: 1,
        priorityFee: 0.1
      });
      setTxJsonString(txJsonString);
      setSendCommitTxId(sendCommitTxId);
      // to do search sendCommitTxId on kasplex api to confirm it is recongized by indexer or not.
      console.log('result: ', txJsonString, sendCommitTxId);
    } catch (e) {
      console.log('error: ', e);
    }
  };
  const handleBuy = async () => {
    try {
      // todo: check the kas balance first. if balance is not enough, then return error
      // todo: check the utxo in the txjsonstring on api.kaspa.org or use  to see if it exists. if not, it means user has canceled this order.
      const txid = await (window as any).kasware.buyKRC20Token({
        txJsonString,
        // you can use extraOutput to create a service fee or other things
        extraOutput: [
          { address: 'kaspatest:qrpygfgeq45h68wz5pk4rtay02w7fwlhax09x4rsqceqq6s3mz6uctlh3a695', amount: 10 }
        ],
        priorityFee: 0.1
      });

      setBuyTxid(txid);
    } catch (e) {
      console.log('error: ', e);
    }
  };

  //  kasware will provide a event to monitor the create krc20 order process in case it's failed in the middle.
  // kasware will also provide a api to monitor rbf event in case any transaction id is replace by rbf.

  const handleCancelOrder = async () => {
    try {
      const txid = await (window as any).kasware.cancelKRC20Order({
        krc20Tick: 'ware',
        txJsonString
      });
      setCancelTxid(txid);
    } catch (e) {
      console.log('error: ', e);
    }
  };
  return (
    <Card size="small" title="KRC20 Market Place" style={{ width: 300, margin: 10 }}>
      {sendCommitTxId !== undefined && sendCommitTxId.length > 0 && (
        <div style={{ textAlign: 'left', marginTop: 10 }}>
          <div style={{ fontWeight: 'bold' }}>data:</div>
          <div style={{ wordWrap: 'break-word' }}>{sendCommitTxId}</div>
        </div>
      )}
      {txJsonString !== undefined && txJsonString.length > 0 && (
        <div style={{ textAlign: 'left', marginTop: 10 }}>
          <div style={{ fontWeight: 'bold' }}>pskt:</div>
          <div style={{ wordWrap: 'break-word' }}>{txJsonString}</div>
        </div>
      )}
      {buyTxid !== undefined && buyTxid.length > 0 && (
        <div style={{ textAlign: 'left', marginTop: 10 }}>
          <div style={{ fontWeight: 'bold' }}>data:</div>
          <div style={{ wordWrap: 'break-word' }}>{buyTxid}</div>
        </div>
      )}
      {cancelTxid !== undefined && cancelTxid.length > 0 && (
        <div style={{ textAlign: 'left', marginTop: 10 }}>
          <div style={{ fontWeight: 'bold' }}>data:</div>
          <div style={{ wordWrap: 'break-word' }}>{cancelTxid}</div>
        </div>
      )}
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleCreateOrder();
          } catch (e) {
            console.log('error: ', e);
            setSendCommitTxId((e as any).message);
          }
        }}>
        Create Order
      </Button>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleBuy();
          } catch (e) {
            console.log('error: ', e);
            setBuyTxid((e as any).message);
          }
        }}>
        Buy
      </Button>
      <Button
        style={{ marginTop: 10 }}
        onClick={async () => {
          try {
            await handleCancelOrder();
          } catch (e) {
            console.log('error: ', e);
            setCancelTxid((e as any).message);
          }
        }}>
        Cancel Order
      </Button>
    </Card>
  );
}

function randomString(len = 4) {
  var $chars = 'ABCDEFGHJKMNPQRSTWXYZ';
  var maxPos = $chars.length;
  var pwd = '';
  for (let i = 0; i < len; i++) {
    pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
  }
  return pwd;
}

export default App;
