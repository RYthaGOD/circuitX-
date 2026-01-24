import { useState, useEffect, useRef } from 'react'
import './App.css'
import { ProofState, ProofStateData } from './types'
import { Noir } from "@noir-lang/noir_js";
import { DebugFileMap } from "@noir-lang/types";
import { UltraHonkBackend } from "@aztec/bb.js";
import { flattenFieldsAsArray } from "./helpers/proof";
import { getZKHonkCallData, init } from 'garaga';
import { bytecode, abi } from "./assets/circuit.json";
import { abi as verifierAbi } from "./assets/verifier.json";
import vkUrl from './assets/vk.bin?url';
import { RpcProvider, Contract } from 'starknet';
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
// import Faucet from './components/Faucet'; // Unused
import { TradingInterface } from './components/Trading/TradingInterface';
import { Portfolio } from './components/Portfolio/Portfolio';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useTradingStore } from './stores/tradingStore';
import { MARKET_INFO, CONTRACTS } from './config/contracts';
import { LandingPage } from './components/Landing/LandingPage';
import { DocsPage } from './components/Docs/DocsPage';

function App() {
  const [proofState, setProofState] = useState<ProofStateData>({
    state: ProofState.Initial
  });
  const [vk, setVk] = useState<Uint8Array | null>(null);
  const [inputX] = useState<number>(5);
  const [inputY] = useState<number>(10);
  // Use a ref to reliably track the current state across asynchronous operations
  const currentStateRef = useRef<ProofState>(ProofState.Initial);

  // Initialize WASM on component mount
  useEffect(() => {
    const initWasm = async () => {
      try {
        // This might have already been initialized in main.tsx,
        // but we're adding it here as a fallback
        if (typeof window !== 'undefined') {
          await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
          console.log('WASM initialization in App component complete');
        }
      } catch (error) {
        console.error('Failed to initialize WASM in App component:', error);
      }
    };

    const loadVk = async () => {
      const response = await fetch(vkUrl);
      const arrayBuffer = await response.arrayBuffer();
      const binaryData = new Uint8Array(arrayBuffer);
      setVk(binaryData);
      console.log('Loaded verifying key:', binaryData);
    };
    
    initWasm();
    loadVk();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _resetState = () => {
    currentStateRef.current = ProofState.Initial;
    setProofState({ 
      state: ProofState.Initial,
      error: undefined 
    });
  };

  const handleError = (error: unknown) => {
    console.error('Error:', error);
    let errorMessage: string;
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error !== null && error !== undefined) {
      // Try to convert any non-Error object to a string
      try {
        errorMessage = String(error);
      } catch {
        errorMessage = 'Unknown error (non-stringifiable object)';
      }
    } else {
      errorMessage = 'Unknown error occurred';
    }
    
    // Use the ref to get the most recent state
    setProofState({
      state: currentStateRef.current,
      error: errorMessage
    });
  };

  const updateState = (newState: ProofState) => {
    currentStateRef.current = newState;
    setProofState({ state: newState, error: undefined });
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const startProcess = async () => {
    try {
      // Start the process
      updateState(ProofState.GeneratingWitness);
      
      // Use input values from state
      const input = { x: inputX, y: inputY };
      
      // Generate witness
      let noir = new Noir({ bytecode, abi: abi as any, debug_symbols: '', file_map: {} as DebugFileMap });
      let execResult = await noir.execute(input);
      console.log(execResult);
      
      // Generate proof
      updateState(ProofState.GeneratingProof);

      // Use single thread to avoid worker issues in development
      // You can change to { threads: 2 } or more for production builds
      let honk = new UltraHonkBackend(bytecode, { threads: 1 });
      let proof = await honk.generateProof(execResult.witness, { starknetZK: true });
      honk.destroy();
      console.log(proof);
      
      // Prepare calldata
      updateState(ProofState.PreparingCalldata);

      await init();
      const callData = getZKHonkCallData(
        proof.proof,
        flattenFieldsAsArray(proof.publicInputs),
        vk as Uint8Array,
        1 // HonkFlavor.STARKNET
      );
      console.log(callData);
      
      // Connect wallet
      updateState(ProofState.ConnectingWallet);

      // Send transaction
      updateState(ProofState.SendingTransaction);

      const provider = new RpcProvider({ nodeUrl: 'https://ztarknet-madara.d.karnot.xyz' });
      // Use verifier address from config
      const verifierContract = new Contract({ abi: verifierAbi, address: CONTRACTS.VERIFIER, providerOrAccount: provider });
      
      // Check verification
      const res = await verifierContract.verify_ultra_starknet_zk_honk_proof(callData.slice(1));
      console.log(res);

      updateState(ProofState.ProofVerified);
    } catch (error) {
      handleError(error);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _renderStateIndicator = (state: ProofState, current: ProofState) => {
    let status = 'pending';
    
    // If this stage is current with an error, show error state
    if (current === state && proofState.error) {
      status = 'error';
    } 
    // If this is the current stage, show active state
    else if (current === state) {
      status = 'active';
    } 
    // If we're past this stage, mark it completed
    else if (getStateIndex(current) > getStateIndex(state)) {
      status = 'completed';
    }
    
    return (
      <div className={`state-indicator ${status}`}>
        <div className="state-dot"></div>
        <div className="state-label">{state}</div>
      </div>
    );
  };

  const getStateIndex = (state: ProofState): number => {
    const states = [
      ProofState.Initial,
      ProofState.GeneratingWitness,
      ProofState.GeneratingProof,
      ProofState.PreparingCalldata,
      ProofState.ConnectingWallet,
      ProofState.SendingTransaction,
      ProofState.ProofVerified
    ];
    
    return states.indexOf(state);
  };

  const [currentPage, setCurrentPage] = useState<'landing' | 'proof' | 'faucet' | 'trading' | 'portfolio' | 'docs'>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/trade')) {
        return 'trading';
      }
      if (window.location.pathname === '/docs' || window.location.pathname.startsWith('/docs')) {
        return 'docs';
      }
    }
    return 'landing';
  });
  
  // Update page title with current market price (real-time)
  const selectedMarket = useTradingStore((state) => state.selectedMarket);
  const markets = useTradingStore((state) => state.markets);
  
  useEffect(() => {
    if (currentPage !== 'trading') {
      if (currentPage === 'portfolio') {
        document.title = `Portfolio | CircuitX`;
      } else if (currentPage === 'docs') {
        document.title = `Documentation | CircuitX`;
      } else {
        document.title = `CircuitX - Private Perpetual DEX`;
      }
      return;
    }

    const updateTitle = async () => {
      const marketInfo = MARKET_INFO[selectedMarket as keyof typeof MARKET_INFO];
      const marketSymbol = marketInfo?.symbol?.split('/')[0] || 'BTC';
      
      // First try to get price from store
      const currentMarket = markets.find((m) => m.marketId === selectedMarket);
      if (currentMarket?.currentPrice) {
        const price = parseFloat(currentMarket.currentPrice);
        const formattedPrice = price.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
        document.title = `${formattedPrice} | ${marketSymbol} | Circuit`;
        return;
      }

      // If not in store, fetch directly from Pyth
      try {
        const { fetchPythPrice } = await import('./services/pythService');
        const priceData = await fetchPythPrice(selectedMarket);
        const price = priceData.price;
        const formattedPrice = price.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
        document.title = `${formattedPrice} | ${marketSymbol} | Circuit`;
      } catch (error) {
        console.warn('Failed to fetch price for title:', error);
        document.title = `91,168 | BTC | Circuit`;
      }
    };

    // Update immediately
    updateTitle();

    // Update every 10 seconds to keep title in sync with real-time prices
    const interval = setInterval(updateTitle, 10000);
    return () => clearInterval(interval);
  }, [currentPage, selectedMarket, markets]);

  const navigateToTrading = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/trade');
    }
    setCurrentPage('trading');
  };

  const navigateToDocs = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/docs');
    }
    setCurrentPage('docs');
  };

  const handleNavigate = (page: 'trading' | 'portfolio') => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/trade');
    }
    setCurrentPage(page);
  };

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/trade')) {
        setCurrentPage('trading');
      } else if (window.location.pathname === '/docs' || window.location.pathname.startsWith('/docs')) {
        setCurrentPage('docs');
      } else {
        setCurrentPage('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <>
      {currentPage === 'landing' ? (
        <LandingPage onStartTrading={navigateToTrading} onNavigateToDocs={navigateToDocs} />
      ) : currentPage === 'docs' ? (
        <DocsPage onNavigate={handleNavigate} />
      ) : currentPage === 'trading' ? (
        <ErrorBoundary>
          <TradingInterface onNavigate={handleNavigate} onNavigateToDocs={navigateToDocs} />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <Portfolio onNavigate={handleNavigate} onNavigateToDocs={navigateToDocs} />
        </ErrorBoundary>
      )}
    </>
  )
}

export default App
