import { claimNeedsCertificate, inspectCertificate } from '../../src/lib/certificate-file.js';

test('a certificate claim takes a PDF and a referral does not', () => {
  expect(claimNeedsCertificate('general_cert')).toBe(true);
  expect(claimNeedsCertificate('brand:78ab4b97-206c-454f-89c8-160bff56c65c:cert')).toBe(true);
  expect(claimNeedsCertificate('insider_certificate')).toBe(true);
  expect(claimNeedsCertificate('brand:78ab4b97-206c-454f-89c8-160bff56c65c:referral')).toBe(false);
});

test('the file has to be a PDF under 8 MB', () => {
  expect(inspectCertificate({ type: 'application/pdf', name: 'a.pdf', byteLength: 12 }).ext).toBe('pdf');
  expect(inspectCertificate({ type: 'image/png', name: 'a.png', byteLength: 12 }).error).toMatch(/PDF/);
  expect(inspectCertificate({ type: 'application/pdf', name: 'a.pdf', byteLength: 0 }).error).toMatch(/Choose/);
  expect(inspectCertificate({ type: 'application/pdf', name: 'a.pdf', byteLength: 9 * 1024 * 1024 }).error).toMatch(/8 MB/);
});
