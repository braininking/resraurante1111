/**
 * Utility to generate official EMV BRCode (Pix Copia e Cola) standard
 * Compliant with Banco Central do Brasil specifications.
 * Used on the client for live QR Code preview and testing in merchant settings.
 */

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function calculateCRC16(payload: string): string {
  // CRC16-CCITT (polynomial 0x1021, init 0xFFFF)
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function generatePixPayloadClient(params: {
  key: string;
  beneficiaryName: string;
  city: string;
  amount?: number;
  txId?: string;
}): string {
  const { key, beneficiaryName, city, amount, txId = 'TESTE123' } = params;

  if (!key || !key.trim()) return '';

  const cleanName = (beneficiaryName || 'LOJISTA CARDAPIO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .substring(0, 25)
    .toUpperCase();

  const cleanCity = (city || 'SAO PAULO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .substring(0, 15)
    .toUpperCase();

  // Field 00: Payload Format Indicator
  let payload = formatField('00', '01');

  // Field 26: Merchant Account Information
  const gui = formatField('00', 'br.gov.bcb.pix');
  const chave = formatField('01', key.trim());
  payload += formatField('26', `${gui}${chave}`);

  // Field 52: Merchant Category Code
  payload += formatField('52', '0000');

  // Field 53: Transaction Currency (986 = BRL)
  payload += formatField('53', '986');

  // Field 54: Transaction Amount
  if (amount && amount > 0) {
    payload += formatField('54', amount.toFixed(2));
  }

  // Field 58: Country Code
  payload += formatField('58', 'BR');

  // Field 59: Merchant Name
  payload += formatField('59', cleanName);

  // Field 60: Merchant City
  payload += formatField('60', cleanCity);

  // Field 62: Additional Data Field Template (txId)
  const txField = formatField('05', txId.substring(0, 25));
  payload += formatField('62', txField);

  // Field 63: CRC16 calculation placeholder
  const payloadWithCRCId = payload + '6304';
  const checksum = calculateCRC16(payloadWithCRCId);

  return `${payloadWithCRCId}${checksum}`;
}

export function validatePixKey(key: string, keyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'): { valid: boolean; message?: string } {
  const clean = key.trim();
  if (!clean) return { valid: false, message: 'Chave Pix não informada' };

  if (keyType === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) return { valid: false, message: 'E-mail inválido para chave Pix' };
  } else if (keyType === 'cpf') {
    const nums = clean.replace(/\D/g, '');
    if (nums.length !== 11) return { valid: false, message: 'CPF deve conter 11 dígitos' };
  } else if (keyType === 'cnpj') {
    const nums = clean.replace(/\D/g, '');
    if (nums.length !== 14) return { valid: false, message: 'CNPJ deve conter 14 dígitos' };
  } else if (keyType === 'phone') {
    const nums = clean.replace(/\D/g, '');
    if (nums.length < 10 || nums.length > 13) return { valid: false, message: 'Telefone deve ter DDD + número (ex: 11988887777)' };
  } else if (keyType === 'random') {
    if (clean.length < 20) return { valid: false, message: 'Chave aleatória EVP deve ter 32 ou 36 caracteres' };
  }

  return { valid: true };
}
