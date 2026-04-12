import { TxType, SighashBiType, BuildScriptType } from './types';
import { getKasNetworkId } from './util';

describe('Types definitions', () => {
  describe('TxType enum', () => {
    it('should have all required transaction types', () => {
      expect(TxType.SIGN_TX).toBe(0);
      expect(TxType.SEND_KASPA).toBe(1);
      expect(TxType.SIGN_KRC20_DEPLOY).toBe(2);
      expect(TxType.SIGN_KRC20_MINT).toBe(3);
      expect(TxType.SIGN_KRC20_TRANSFER).toBe(4);
      expect(TxType.SIGN_KRC20_TRANSFER_BATCH).toBe(5);
      expect(TxType.SIGN_KRC20_MINT_BATCH).toBe(6);
      expect(TxType.SIGN_KNS_TRANSFER).toBe(7);
      expect(TxType.SIGN_KSPRNFT_TRANSFER).toBe(8);
    });
  });

  describe('SighashBiType enum', () => {
    it('should have correct values matching Kaspa consensus', () => {
      expect(SighashBiType.All).toBe(1);
      expect(SighashBiType.None).toBe(2);
      expect(SighashBiType.Single).toBe(4);
      expect(SighashBiType.AllAnyOneCanPay).toBe(129);
      expect(SighashBiType.NoneAnyOneCanPay).toBe(130);
      expect(SighashBiType.SingleAnyOneCanPay).toBe(132);
    });
  });

  describe('BuildScriptType enum', () => {
    it('should have all protocol types', () => {
      expect(BuildScriptType.KRC20).toBe('KRC20');
      expect(BuildScriptType.KNS).toBe('KNS');
      expect(BuildScriptType.KSPR_KRC721).toBe('KSPR_KRC721');
    });
  });
});

describe('Utility functions', () => {
  describe('getKasNetworkId', () => {
    it('should convert kaspa_mainnet to mainnet', () => {
      expect(getKasNetworkId('kaspa_mainnet')).toBe('mainnet');
    });

    it('should convert kaspa_testnet_11 to testnet-11', () => {
      expect(getKasNetworkId('kaspa_testnet_11')).toBe('testnet-11');
    });

    it('should convert kaspa_testnet_10 to testnet-10', () => {
      expect(getKasNetworkId('kaspa_testnet_10')).toBe('testnet-10');
    });

    it('should convert kaspa_devnet to devnet', () => {
      expect(getKasNetworkId('kaspa_devnet')).toBe('devnet');
    });

    it('should return testnet-10 as default for unknown network', () => {
      expect(getKasNetworkId('unknown')).toBe('testnet-10');
    });
  });
});
