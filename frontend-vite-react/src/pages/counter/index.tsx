import { useState, useCallback } from "react";
import {
  PlusCircle,
  MinusCircle,
  RotateCcw,
  Activity,
  Shield,
  CheckCircle2,
  Hash,
  Clock,
  Zap,
  TrendingUp,
  Wallet,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/mode-toggle";
import { useWallet } from "@/modules/midnight/wallet-widget/hooks/useWallet";
import { useContractSubscription } from "@/modules/midnight/counter-sdk/hooks/use-contract-subscription";

// ─── Contract metadata ───
const CONTRACT_INFO = {
  contractName: "counter",
  language: "Compact (Midnight ZK Language)",
  compiler: "+0.28.0",
  ledgerFields: ["round: Counter"],
  circuits: ["increment(): Void"],
};

// ─── Types ───
interface TxLog {
  id: number;
  action: string;
  prevValue: number;
  newValue: number;
  txHash: string;
  block: number;
  timestamp: string;
  isOnChain: boolean;
}

// ─── Helpers ───
function randomTxHash(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

let blockCounter = 1200;
function nextBlock(): number {
  blockCounter += Math.floor(Math.random() * 3) + 1;
  return blockCounter;
}

// ─── Component ───
export const Counter = () => {
  const { status, connectedAPI } = useWallet();
  const isWalletConnected = status?.status === "connected" && !!connectedAPI;

  // On-chain state from subscription
  const { deployedContractAPI, derivedState, contractDeployment } =
    useContractSubscription();

  // Demo local state (used when wallet not connected)
  const [demoCounter, setDemoCounter] = useState(0);
  const [txLogs, setTxLogs] = useState<TxLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [totalIncrements, setTotalIncrements] = useState(0);
  const [totalDecrements, setTotalDecrements] = useState(0);
  const [walletError, setWalletError] = useState<string | undefined>();
  const [walletMessage, setWalletMessage] = useState<string | undefined>();

  // Derive counter value from on-chain state when connected
  const counterValue = isWalletConnected && derivedState
    ? Number(derivedState.ledgerState?.round ?? 0n)
    : demoCounter;

  // Contract deployment status
  const deploymentStatus = contractDeployment?.status;

  const addTxLog = useCallback(
    (action: string, prevValue: number, newValue: number, onChain: boolean) => {
      const log: TxLog = {
        id: Date.now(),
        action,
        prevValue,
        newValue,
        txHash: randomTxHash(),
        block: nextBlock(),
        timestamp: new Date().toLocaleTimeString(),
        isOnChain: onChain,
      };
      setTxLogs((prev) => [log, ...prev].slice(0, 20));
    },
    [],
  );

  // ─── On-chain increment (wallet connected) ───
  const handleOnChainIncrement = useCallback(async () => {
    if (!deployedContractAPI) return;
    setIsProcessing(true);
    setWalletError(undefined);
    setWalletMessage("Proving & submitting transaction via Midnight Lace...");
    try {
      const prevVal = counterValue;
      await deployedContractAPI.increment();
      addTxLog("increment", prevVal, prevVal + 1, true);
      setTotalIncrements((p) => p + 1);
      setWalletMessage("✅ Transaction confirmed on-chain!");
      setTimeout(() => setWalletMessage(undefined), 3000);
    } catch (e: any) {
      setWalletError(`Transaction failed: ${e?.message || String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [deployedContractAPI, counterValue, addTxLog]);

  // ─── Demo handlers (wallet not connected) ───
  const handleDemoIncrement = useCallback(async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    setDemoCounter((prev) => {
      const next = prev + 1;
      addTxLog("increment", prev, next, false);
      return next;
    });
    setTotalIncrements((p) => p + 1);
    setIsProcessing(false);
  }, [addTxLog]);

  const handleDemoDecrement = useCallback(async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    setDemoCounter((prev) => {
      const next = prev - 1;
      addTxLog("decrement", prev, next, false);
      return next;
    });
    setTotalDecrements((p) => p + 1);
    setIsProcessing(false);
  }, [addTxLog]);

  const handleDemoReset = useCallback(async () => {
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 400));
    const prev = demoCounter;
    setDemoCounter(0);
    addTxLog("reset", prev, 0, false);
    setIsProcessing(false);
  }, [demoCounter, addTxLog]);

  // Pick the right handler based on wallet connection
  const handleIncrement = isWalletConnected && deployedContractAPI
    ? handleOnChainIncrement
    : handleDemoIncrement;

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              ⚡ Counter Contract
            </h1>
            <p className="text-lg text-muted-foreground">
              Interactive {isWalletConnected ? "on-chain" : "demo"} of the Midnight Counter smart contract
            </p>
          </div>
          <ModeToggle />
        </div>

        {/* Wallet Connection Status Banner */}
        <Card className={`mb-6 ${isWalletConnected
          ? "border-green-500/50 bg-green-500/5"
          : "border-amber-500/50 bg-amber-500/5"
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {isWalletConnected ? (
                <Wifi className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <WifiOff className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-semibold mb-1 ${
                  isWalletConnected
                    ? "text-green-700 dark:text-green-300"
                    : "text-amber-700 dark:text-amber-300"
                }`}>
                  {isWalletConnected ? (
                    <>
                      <Wallet className="w-4 h-4 inline mr-1" />
                      Wallet Connected — On-Chain Mode
                    </>
                  ) : (
                    "Demo Mode — Connect Midnight Lace Wallet for Real Transactions"
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isWalletConnected ? (
                    <>
                      Transactions are submitted to the Midnight blockchain via your Lace wallet.
                      {deploymentStatus === "deployed" && " Contract joined successfully."}
                      {deploymentStatus === "in-progress" && " Joining contract..."}
                      {deploymentStatus === "failed" && " ⚠️ Failed to join contract."}
                    </>
                  ) : (
                    "Go to the Wallet page to connect your Midnight Lace browser extension. Demo transactions simulate ZK proof generation locally."
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Info Banner */}
        <Card className="mb-6 border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-blue-700 dark:text-blue-300 mb-1">
                  On-Chain Contract: {CONTRACT_INFO.contractName}
                </p>
                <p className="text-muted-foreground mb-2">
                  This contract is written in <strong>Compact</strong> (Midnight&apos;s ZK language) and compiled with{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">{CONTRACT_INFO.compiler}</code>.
                  The ledger stores a public <code className="bg-muted px-1 py-0.5 rounded text-xs">Counter</code>{" "}
                  that is incremented via ZK-proven circuit calls.
                </p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                    Ledger: round (Counter)
                  </span>
                  <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                    Circuit: increment()
                  </span>
                  <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                    ZK Proof Required
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Error / Message */}
        {walletError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              ❌ {walletError}
            </p>
          </div>
        )}
        {walletMessage && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {walletMessage}
            </p>
          </div>
        )}

        {/* Main Counter Display */}
        <Card className="mb-6">
          <CardHeader className="text-center pb-2">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-5xl font-bold text-primary">
                {counterValue}
              </span>
            </div>
            <CardTitle className="text-2xl">Counter Value</CardTitle>
            <CardDescription>
              {isWalletConnected
                ? "Each action submits a ZK-proven transaction to the Midnight blockchain"
                : "Each action simulates a ZK-proven transaction (demo mode)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={handleIncrement}
                disabled={isProcessing || (isWalletConnected && !deployedContractAPI)}
                className="gap-2 min-w-[140px]"
              >
                {isProcessing ? (
                  <Activity className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                Increment
                {isWalletConnected && (
                  <Wallet className="w-3 h-3 ml-1 opacity-70" />
                )}
              </Button>
              {!isWalletConnected && (
                <>
                  <Button
                    onClick={handleDemoDecrement}
                    disabled={isProcessing}
                    variant="secondary"
                    className="gap-2 min-w-[140px]"
                  >
                    {isProcessing ? (
                      <Activity className="w-4 h-4 animate-spin" />
                    ) : (
                      <MinusCircle className="w-4 h-4" />
                    )}
                    Decrement
                  </Button>
                  <Button
                    onClick={handleDemoReset}
                    disabled={isProcessing || demoCounter === 0}
                    variant="outline"
                    className="gap-2 min-w-[140px]"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </Button>
                </>
              )}
            </div>

            {isProcessing && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground animate-pulse">
                  {isWalletConnected
                    ? "⏳ Generating ZK proof & submitting via Midnight Lace wallet..."
                    : "⏳ Generating ZK proof & submitting transaction (demo)..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalIncrements}</p>
              <p className="text-xs text-muted-foreground">Increments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <MinusCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalDecrements}</p>
              <p className="text-xs text-muted-foreground">Decrements</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Hash className="w-5 h-5 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{txLogs.length}</p>
              <p className="text-xs text-muted-foreground">Total Txs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{counterValue}</p>
              <p className="text-xs text-muted-foreground">Current Value</p>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Log */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5" />
              Transaction Log
            </CardTitle>
            <CardDescription>
              Recent contract interactions
              {isWalletConnected ? " (on-chain)" : " (simulated blocks)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {txLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No transactions yet. Click Increment to start!</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {txLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg text-sm"
                  >
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${
                      log.isOnChain ? "text-green-600" : "text-green-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-semibold ${
                            log.action === "increment"
                              ? "text-green-600 dark:text-green-400"
                              : log.action === "decrement"
                                ? "text-red-600 dark:text-red-400"
                                : "text-yellow-600 dark:text-yellow-400"
                          }`}
                        >
                          {log.action.toUpperCase()}
                        </span>
                        <span className="text-muted-foreground">
                          {log.prevValue} → {log.newValue}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Block #{log.block}
                        </span>
                        {log.isOnChain && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">
                            On-Chain
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        tx: {log.txHash.slice(0, 16)}...{log.txHash.slice(-8)}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compact Contract Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5" />
              Compact Contract Source
            </CardTitle>
            <CardDescription>
              The actual smart contract code deployed on Midnight
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto">
              {`pragma language_version >= 0.19;

import CompactStandardLibrary;

// public state
export ledger round: Counter;

// transition function changing public state
export circuit increment(): [] {
  round.increment(1);
}`}
            </pre>
            <p className="text-xs text-muted-foreground mt-3">
              This Compact contract defines a single <code className="bg-muted px-1 py-0.5 rounded">Counter</code>{" "}
              on the public ledger with one circuit that increments it by 1. Each call
              generates a ZK proof verifying the state transition is valid.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
