import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as qs from 'qs';
import { PaymentsService } from './payments.service';
import { InvoicesService } from '../invoices/invoices.service';
import {
  InvoiceStatus,
  PaymentMethod,
} from '../invoices/schemas/invoice.schema';
import { VnpayParams } from 'src/common/interfaces/query.interface';

describe('PaymentsService', () => {
  let service: PaymentsService;

  let invoicesService: {
    findOne: jest.Mock;
  };

  let eventEmitter: {
    emit: jest.Mock;
  };

  let configService: {
    get: jest.Mock;
  };

  const invoiceId = '507f1f77bcf86cd799439011';
  const defaultConfig = {
    VNP_TMN_CODE: 'TMCODE123',
    VNP_HASH_SECRET: 'secret-key-123',
    VNP_URL: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    VNP_RETURN_URL: 'https://api.example.com/payments/vnpay_return',
  };

  const makeInvoice = (overrides: Partial<any> = {}) => ({
    _id: invoiceId,
    totalAmount: 70000,
    status: InvoiceStatus.PENDING,
    paymentMethod: undefined,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const signVnpPayload = (params: VnpayParams, secret: string) => {
    const sorted = (service as any).sortObject(params);
    const signData = qs.stringify(sorted, { encode: false });
    return crypto
      .createHmac('sha512', secret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');
  };

  beforeEach(async () => {
    invoicesService = {
      findOne: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    configService = {
      get: jest.fn((key: keyof typeof defaultConfig) => defaultConfig[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: InvoicesService,
          useValue: invoicesService,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);

    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('throws BadRequestException when invoice is already paid', async () => {
      invoicesService.findOne.mockResolvedValue(makeInvoice({ status: InvoiceStatus.PAID }));

      await expect(
        service.processPayment({ invoiceId, method: PaymentMethod.BANK }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.processPayment({ invoiceId, method: PaymentMethod.BANK }),
      ).rejects.toThrow('Invoice already paid');
    });

    it('returns VNPAY URL when method is VNPAY', async () => {
      const invoice = makeInvoice();
      invoicesService.findOne.mockResolvedValue(invoice);
      const createVnPayUrlSpy = jest
        .spyOn(service, 'createVnPayUrl')
        .mockReturnValue('https://vnpay-url');

      const result = await service.processPayment(
        { invoiceId, method: PaymentMethod.VNPAY },
        '10.0.0.1',
      );

      expect(createVnPayUrlSpy).toHaveBeenCalledWith(invoice, '10.0.0.1');
      expect(invoice.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(result).toEqual({ url: 'https://vnpay-url' });
    });

    it('completes non-VNPAY payment instantly and emits invoice.paid', async () => {
      const invoice = makeInvoice();
      invoicesService.findOne.mockResolvedValue(invoice);

      const result = await service.processPayment({
        invoiceId,
        method: PaymentMethod.MOMO,
      });

      expect(invoice.status).toBe(InvoiceStatus.PAID);
      expect(invoice.paymentMethod).toBe(PaymentMethod.MOMO);
      expect(invoice.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('invoice.paid', expect.any(Object));
      expect(result).toEqual({
        success: true,
        message: 'Payment successful',
        invoiceId,
      });
    });
  });

  describe('createVnPayUrl', () => {
    it('creates signed VNPAY URL with required params', () => {
      const invoice = makeInvoice({ _id: invoiceId, totalAmount: 12345 });

      const url = service.createVnPayUrl(invoice as any, '127.0.0.1');

      expect(url.startsWith(defaultConfig.VNP_URL + '?')).toBe(true);
      const queryString = url.split('?')[1];
      const parsed = qs.parse(queryString) as Record<string, string>;

      expect(parsed.vnp_TmnCode).toBe(defaultConfig.VNP_TMN_CODE);
      expect(parsed.vnp_TxnRef).toBe(invoiceId);
      expect(parsed.vnp_Amount).toBe(String(12345 * 100));
      expect(parsed.vnp_IpAddr).toBe('127.0.0.1');
      expect(parsed.vnp_ReturnUrl).toBe(defaultConfig.VNP_RETURN_URL);
      expect(parsed.vnp_SecureHash).toBeDefined();
      expect(parsed.vnp_SecureHash.length).toBeGreaterThan(0);
    });
  });

  describe('verifyReturnUrl', () => {
    it('completes payment when signature is valid and response code is 00', async () => {
      const baseParams: VnpayParams = {
        vnp_TxnRef: invoiceId,
        vnp_ResponseCode: '00',
        vnp_Amount: '7000000',
      };
      const secureHash = signVnpPayload(baseParams, defaultConfig.VNP_HASH_SECRET);
      const payload: VnpayParams = {
        ...baseParams,
        vnp_SecureHash: secureHash,
        vnp_SecureHashType: 'SHA512',
      };

      const completePaymentSpy = jest
        .spyOn(service as any, 'completePayment')
        .mockResolvedValue({ _id: invoiceId, status: InvoiceStatus.PAID });

      const result = await service.verifyReturnUrl({ ...payload });

      expect(completePaymentSpy).toHaveBeenCalledWith(invoiceId, PaymentMethod.VNPAY);
      expect(result).toEqual({ _id: invoiceId, status: InvoiceStatus.PAID });
    });

    it('returns Fail when signature is valid but response code is not 00', async () => {
      const baseParams: VnpayParams = {
        vnp_TxnRef: invoiceId,
        vnp_ResponseCode: '24',
      };
      const secureHash = signVnpPayload(baseParams, defaultConfig.VNP_HASH_SECRET);

      const result = await service.verifyReturnUrl({
        ...baseParams,
        vnp_SecureHash: secureHash,
      });

      expect(result).toEqual({ code: '97', message: 'Fail' });
    });

    it('returns invalid signature when checksum does not match', async () => {
      const result = await service.verifyReturnUrl({
        vnp_TxnRef: invoiceId,
        vnp_ResponseCode: '00',
        vnp_SecureHash: 'invalid-signature',
      });

      expect(result).toEqual({ code: '97', message: 'Invalid Signature' });
    });

    it('rethrows error when completePayment throws', async () => {
      const baseParams: VnpayParams = {
        vnp_TxnRef: invoiceId,
        vnp_ResponseCode: '00',
      };
      const secureHash = signVnpPayload(baseParams, defaultConfig.VNP_HASH_SECRET);

      jest
        .spyOn(service as any, 'completePayment')
        .mockRejectedValue(new Error('complete failed'));

      await expect(
        service.verifyReturnUrl({ ...baseParams, vnp_SecureHash: secureHash }),
      ).rejects.toThrow('complete failed');
    });
  });

  describe('vnpayIpn', () => {
    it('returns Invalid Checksum when signature is not valid', async () => {
      const result = await service.vnpayIpn({
        vnp_TxnRef: invoiceId,
        vnp_Amount: '7000000',
        vnp_ResponseCode: '00',
        vnp_SecureHash: 'invalid',
      });

      expect(result).toEqual({ RspCode: '97', Message: 'Invalid Checksum' });
    });

    it('returns Order not found when invoice does not exist', async () => {
      const baseParams: VnpayParams = {
        vnp_TxnRef: invoiceId,
        vnp_Amount: '7000000',
        vnp_ResponseCode: '00',
      };
      const secureHash = signVnpPayload(baseParams, defaultConfig.VNP_HASH_SECRET);
      invoicesService.findOne.mockResolvedValue(null);

      const result = await service.vnpayIpn({
        ...baseParams,
        vnp_SecureHash: secureHash,
      });

      expect(result).toEqual({ RspCode: '01', Message: 'Order not found' });
    });

    it('returns Invalid amount when paid amount does not match invoice amount', async () => {
      const baseParams: VnpayParams = {
        vnp_TxnRef: invoiceId,
        vnp_Amount: '100',
        vnp_ResponseCode: '00',
      };
      const secureHash = signVnpPayload(baseParams, defaultConfig.VNP_HASH_SECRET);
      invoicesService.findOne.mockResolvedValue(makeInvoice({ totalAmount: 70000 }));

      const result = await service.vnpayIpn({
        ...baseParams,
        vnp_SecureHash: secureHash,
      });

      expect(result).toEqual({ RspCode: '04', Message: 'Invalid amount' });
    });

    it('returns already confirmed when invoice status is PAID', async () => {
      const baseParams: VnpayParams = {
        vnp_TxnRef: invoiceId,
        vnp_Amount: String(70000 * 100),
        vnp_ResponseCode: '00',
      };
      const secureHash = signVnpPayload(baseParams, defaultConfig.VNP_HASH_SECRET);
      invoicesService.findOne.mockResolvedValue(makeInvoice({ status: InvoiceStatus.PAID }));

      const result = await service.vnpayIpn({ ...baseParams, vnp_SecureHash: secureHash });

      expect(result).toEqual({ RspCode: '02', Message: 'Order already confirmed' });
    });

    it('completes payment when signature is valid and response code is 00', async () => {
      const baseParams: VnpayParams = {
        vnp_TxnRef: invoiceId,
        vnp_Amount: String(70000 * 100),
        vnp_ResponseCode: '00',
      };
      const secureHash = signVnpPayload(baseParams, defaultConfig.VNP_HASH_SECRET);
      invoicesService.findOne.mockResolvedValue(makeInvoice({ status: InvoiceStatus.PENDING }));
      const completePaymentSpy = jest
        .spyOn(service as any, 'completePayment')
        .mockResolvedValue(makeInvoice({ status: InvoiceStatus.PAID }));

      const result = await service.vnpayIpn({ ...baseParams, vnp_SecureHash: secureHash });

      expect(completePaymentSpy).toHaveBeenCalledWith(invoiceId, PaymentMethod.VNPAY);
      expect(result).toEqual({ RspCode: '00', Message: 'Success' });
    });

    it('acknowledges callback when payment response code is not 00', async () => {
      const baseParams: VnpayParams = {
        vnp_TxnRef: invoiceId,
        vnp_Amount: String(70000 * 100),
        vnp_ResponseCode: '24',
      };
      const secureHash = signVnpPayload(baseParams, defaultConfig.VNP_HASH_SECRET);
      invoicesService.findOne.mockResolvedValue(makeInvoice({ status: InvoiceStatus.PENDING }));

      const result = await service.vnpayIpn({ ...baseParams, vnp_SecureHash: secureHash });

      expect(result).toEqual({ RspCode: '00', Message: 'Success' });
    });
  });

  describe('completePayment (private)', () => {
    it('throws NotFoundException when invoice does not exist', async () => {
      invoicesService.findOne.mockResolvedValue(null);

      await expect(
        (service as any).completePayment(invoiceId, PaymentMethod.VNPAY),
      ).rejects.toThrow(NotFoundException);
      await expect(
        (service as any).completePayment(invoiceId, PaymentMethod.VNPAY),
      ).rejects.toThrow(`Invoice ${invoiceId} not found`);
    });

    it('returns idempotent PAID response when invoice is already paid', async () => {
      const invoice = makeInvoice({ status: InvoiceStatus.PAID });
      invoicesService.findOne.mockResolvedValue(invoice);

      const result = await (service as any).completePayment(invoiceId, PaymentMethod.VNPAY);

      expect(invoice.save).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(result).toEqual({ _id: invoiceId, status: 'PAID' });
    });

    it('marks invoice as paid, saves, and emits event', async () => {
      const invoice = makeInvoice({ status: InvoiceStatus.PENDING });
      invoicesService.findOne.mockResolvedValue(invoice);

      const result = await (service as any).completePayment(invoiceId, PaymentMethod.VNPAY);

      expect(invoice.status).toBe(InvoiceStatus.PAID);
      expect(invoice.paymentMethod).toBe(PaymentMethod.VNPAY);
      expect(invoice.save).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('invoice.paid', expect.any(Object));
      expect(result).toBe(invoice);
    });

    it('rethrows underlying save errors', async () => {
      const invoice = makeInvoice({
        save: jest.fn().mockRejectedValue(new Error('save failed')),
      });
      invoicesService.findOne.mockResolvedValue(invoice);

      await expect(
        (service as any).completePayment(invoiceId, PaymentMethod.VNPAY),
      ).rejects.toThrow('save failed');
    });
  });

  describe('sortObject (private)', () => {
    it('sorts keys and URL-encodes values with spaces replaced by plus', () => {
      const sorted = (service as any).sortObject({
        b: 'value b',
        a: 'value a',
      });

      expect(Object.keys(sorted)).toEqual(['a', 'b']);
      expect(sorted.a).toBe('value+a');
      expect(sorted.b).toBe('value+b');
    });
  });

  describe('formatDate (private)', () => {
    it('formats Date to yyyyMMddHHmmss', () => {
      const date = new Date('2026-03-17T09:08:07.000Z');
      const formatted = (service as any).formatDate(date);

      expect(formatted).toMatch(/^\d{14}$/);
      expect(formatted.length).toBe(14);
    });
  });
});
