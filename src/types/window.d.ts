interface EthereumProvider {
  isMetaMask?: boolean;
  selectedAddress?: string | null;
  chainId?: string;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (eventName: string, handler: (...args: any[]) => void) => void;
  removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
}

interface Window {
  ethereum?: EthereumProvider;
}

declare module '@metamask/sdk' {
  interface SDKProvider extends EthereumProvider {}
}
