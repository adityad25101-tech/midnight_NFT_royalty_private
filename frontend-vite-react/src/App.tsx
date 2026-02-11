import { BrowserRouter, Route, Routes } from "react-router-dom";
import * as pino from "pino";
import { MainLayout } from "./layouts/layout";
import { Home } from "./pages/home/";
import { Counter } from "./pages/counter";
import { NftPage } from "./pages/nft";
import { WalletUI } from "./pages/wallet-ui";
import { ThemeProvider } from "./components/theme-provider";
import { MidnightMeshProvider } from "./modules/midnight/wallet-widget/contexts/wallet";
import { CounterAppProvider } from "./modules/midnight/counter-sdk/contexts";
import { NftAppProvider } from "./modules/midnight/nft-sdk/contexts";
import { ErrorBoundary } from "./components/error-boundary";

export const logger = pino.pino({
  level: "trace",
});

const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS || "";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <ErrorBoundary>
        <MidnightMeshProvider logger={logger}>
          <CounterAppProvider logger={logger} contractAddress={contractAddress}>
            <NftAppProvider logger={logger} contractAddress={contractAddress}>
              <BrowserRouter basename="/">
                <Routes>
                  <Route element={<MainLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/wallet-ui" element={<WalletUI />} />
                    <Route path="/counter" element={<Counter />} />
                    <Route path="/nft" element={<NftPage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </NftAppProvider>
          </CounterAppProvider>
        </MidnightMeshProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
