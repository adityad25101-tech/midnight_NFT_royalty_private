import { useEffect, useState } from "react";
import { InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import { MidnightBrowserWallet } from "../api/walletController";

export const useWalletList = () => {
  const [wallets, setWallets] = useState<InitialAPI[]>([]);
  useEffect(() => {
    // Lace injects window.midnight asynchronously; poll until found
    let attempts = 0;
    const maxAttempts = 30; // try for ~3 seconds

    const check = () => {
      const found = MidnightBrowserWallet.getAvailableWallets();
      if (found.length > 0 || attempts >= maxAttempts) {
        setWallets(found);
        return;
      }
      attempts++;
      setTimeout(check, 100);
    };

    check();
  }, []);

  return wallets;
};
