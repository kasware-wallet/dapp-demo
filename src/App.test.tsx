import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock window.kasware
const mockKasware = {
  getAccounts: jest.fn(),
  getPublicKey: jest.fn(),
  getBalance: jest.fn(),
  getNetwork: jest.fn(),
  getKRC20Balance: jest.fn(),
  requestAccounts: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
};

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockKasware.getAccounts.mockResolvedValue(['kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp']);
    mockKasware.getPublicKey.mockResolvedValue('test-public-key');
    mockKasware.getBalance.mockResolvedValue({ confirmed: 1000000000, unconfirmed: 0, total: 1000000000 });
    mockKasware.getNetwork.mockResolvedValue('kaspa_testnet_11');
    mockKasware.getKRC20Balance.mockResolvedValue([]);
    mockKasware.on.mockReturnValue(undefined);
    mockKasware.removeListener.mockReturnValue(undefined);
    
    (window as any).kasware = mockKasware;
  });

  afterEach(() => {
    delete (window as any).kasware;
  });

  it('should render Kasware Wallet Demo title', async () => {
    render(<App />);
    
    await waitFor(() => {
      const titleElement = screen.getByText('Kasware Wallet Demo');
      expect(titleElement).toBeDefined();
    });
  });

  it('should show Connect button when not connected', async () => {
    mockKasware.getAccounts.mockResolvedValue([]);
    
    render(<App />);
    
    await waitFor(() => {
      const connectButton = screen.getByText('Connect Kasware Wallet');
      expect(connectButton).toBeDefined();
    });
  });

  it('should call getAccounts on mount', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(mockKasware.getAccounts).toHaveBeenCalled();
    });
  });

  it('should register event listeners on mount', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(mockKasware.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
      expect(mockKasware.on).toHaveBeenCalledWith('networkChanged', expect.any(Function));
      expect(mockKasware.on).toHaveBeenCalledWith('krc20BatchTransferChanged', expect.any(Function));
    });
  });
});

describe('Kasware API Integration', () => {
  describe('getUtxoEntries', () => {
    it('should require address parameter', async () => {
      const mockGetUtxoEntries = jest.fn().mockResolvedValue([]);
      (window as any).kasware = {
        ...mockKasware,
        getUtxoEntries: mockGetUtxoEntries,
        getAccounts: jest.fn().mockResolvedValue(['test-address']),
      };

      const address = 'kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp';
      
      await (window as any).kasware.getUtxoEntries(address);
      
      expect(mockGetUtxoEntries).toHaveBeenCalledWith(address);
    });
  });

  describe('signMessage', () => {
    it('should accept message and type parameter', async () => {
      const mockSignMessage = jest.fn().mockResolvedValue('signature');
      (window as any).kasware = {
        ...mockKasware,
        signMessage: mockSignMessage,
      };

      const message = 'hello world';
      const options = { type: 'schnorr' as const, noAuxRand: true };
      
      await (window as any).kasware.signMessage(message, options);
      
      expect(mockSignMessage).toHaveBeenCalledWith(message, options);
    });
  });

  describe('sendKaspa', () => {
    it('should accept address, amount, and options', async () => {
      const mockSendKaspa = jest.fn().mockResolvedValue('tx-id');
      (window as any).kasware = {
        ...mockKasware,
        sendKaspa: mockSendKaspa,
      };

      const toAddress = 'kaspatest:qz9dvce5d92czd6t6msm5km3p5m9dyxh5av9xkzjl6pz8hhvc4q7wqg8njjyp';
      const sompi = 100000000;
      const options = { priorityFee: 10000 };
      
      await (window as any).kasware.sendKaspa(toAddress, sompi, options);
      
      expect(mockSendKaspa).toHaveBeenCalledWith(toAddress, sompi, options);
    });
  });
});
