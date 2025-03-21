export enum TransactionType {
  TRANSFER = 'TRANSFER',
  SWAP = 'SWAP',
  APPROVAL = 'APPROVAL',
  MINT = 'MINT',
  BURN = 'BURN',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
  CLAIM = 'CLAIM',
  CONTRACT_INTERACTION = 'CONTRACT_INTERACTION',
  UNKNOWN = 'UNKNOWN'
}

export interface TransactionData {
  hash: string;
  type: TransactionType;
  from: string;
  to: string;
  value: string;
  gasPrice?: string;
  gasLimit?: number;
  nonce?: number;
  data?: string;
  timestamp: number;
  status?: 'pending' | 'confirmed' | 'failed';
  chainId?: string;
  decodedData?: {
    method: string;
    args: any[];
    path?: string[];
    [key: string]: any;
  };
}

export interface TransactionAnalysisResult {
  requiresApproval: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  warnings: string[];
}