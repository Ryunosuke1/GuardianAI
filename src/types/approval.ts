import { TransactionData } from './transaction';
import { TransactionEvaluationResult } from '../services/transaction/RuleProcessorService';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AUTO_APPROVED = 'auto_approved',
  EXPIRED = 'expired'
}

export interface ApprovalRequest {
  id: string;
  transaction: TransactionData;
  evaluationResult?: TransactionEvaluationResult;
  status: ApprovalStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  userComment?: string;
}

export type { ApprovalRequest as TransactionApproval };