/// <reference types="mocha" />
import { expect } from 'chai';
import { classifySecurityKeyVerification, parseServiceErrors } from './serviceErrors';

describe('parseServiceErrors', () => {
    it('reads serviceErrors and service_errors', () => {
        const body = JSON.stringify({
            serviceErrors: [{ code: '-27962', message: 'Failed to verify security key' }],
            service_errors: [{ code: '-21669' }],
        });
        expect(parseServiceErrors(body).map(e => e.code)).to.deep.equal(['-27962', '-21669']);
    });

    it('returns [] for non-JSON, empty bodies and non-array fields', () => {
        expect(parseServiceErrors('')).to.deep.equal([]);
        expect(parseServiceErrors('<html>')).to.deep.equal([]);
        expect(parseServiceErrors('null')).to.deep.equal([]);
        expect(parseServiceErrors('{"serviceErrors":"x"}')).to.deep.equal([]);
    });
});

describe('classifySecurityKeyVerification', () => {
    it('accepts 200 and 204', () => {
        expect(classifySecurityKeyVerification(200, '{}')).to.equal('ok');
        expect(classifySecurityKeyVerification(204, '')).to.equal('ok');
    });

    it('treats 409 without service errors as conflict (continue with trust flow)', () => {
        // Real body observed after a valid assertion on an account with two security keys.
        const body = JSON.stringify({
            cancelled: false,
            accountName: 'user@example.com',
            keyNames: ['YubiKey 5 Series with NFC', 'Security Key'],
            requirePrf: false,
            passkeyAutofill: false,
        });
        expect(classifySecurityKeyVerification(409, body)).to.equal('conflict');
        expect(classifySecurityKeyVerification(409, '')).to.equal('conflict');
    });

    it('rejects 409 with serviceErrors or service_errors', () => {
        expect(
            classifySecurityKeyVerification(
                409,
                JSON.stringify({ serviceErrors: [{ code: '-27962', message: 'Failed to verify security key' }] }),
            ),
        ).to.equal('rejected');
        expect(classifySecurityKeyVerification(409, JSON.stringify({ service_errors: [{ code: '-27962' }] }))).to.equal(
            'rejected',
        );
    });

    it('rejects other error statuses', () => {
        expect(classifySecurityKeyVerification(400, '{}')).to.equal('rejected');
        expect(classifySecurityKeyVerification(401, '')).to.equal('rejected');
        expect(classifySecurityKeyVerification(500, '')).to.equal('rejected');
    });
});
