const bcrypt = require('bcrypt');

/**
 * Verify transaction security via PIN or FaceID based on amount
 * @param {bigint} amount - Transaction amount in BigInt
 * @param {string} pin - User's PIN
 * @param {string} faceImagePath - Path to face image
 * @param {object} wallet - Wallet object (needs pin_locked_until, pin_hash, pin_failed_attempts, id)
 * @param {string} userId - User ID
 * @param {object} repo - Repository containing updatePinAttempts, resetPinAttempts, getUserKycFaceImage
 * @param {object} kycService - Service containing verifyFaceMatchFacePlusPlus
 */
async function verifyTransactionSecurity(amount, pin, faceImagePath, wallet, userId, repo, kycService) {
    if (!wallet) throw new Error('Wallet_Not_Found');

    // Verify based on amount (30,000,000 VND)
    if (amount < 30000000n) {
        if (!pin) throw new Error('PIN_Required');
        if (wallet.pin_locked_until) {
            const now = new Date();
            const lockedUntil = new Date(wallet.pin_locked_until);
            if (now < lockedUntil) {
                throw new Error('Wallet_Locked_PIN');
            } else {
                await repo.resetPinAttempts(wallet.id);
                wallet.pin_failed_attempts = 0;
            }
        }
        if (!wallet.pin_hash) throw new Error('Wallet_Not_Found');
        
        const pepper = process.env.PIN_PEPPER || '';
        let isPinMatch = await bcrypt.compare(pin + pepper, wallet.pin_hash);
        if (!isPinMatch && pepper !== '') {
            // Hỗ trợ tương thích ngược cho các ví cũ chưa có pepper
            isPinMatch = await bcrypt.compare(pin, wallet.pin_hash);
        }

        if (!isPinMatch) {
            const newAttempts = (wallet.pin_failed_attempts || 0) + 1;
            if (newAttempts >= 3) {
                const lockTime = new Date(Date.now() + 30 * 60000);
                await repo.updatePinAttempts(wallet.id, newAttempts, lockTime);
                throw new Error('Wallet_Locked_PIN');
            } else {
                await repo.updatePinAttempts(wallet.id, newAttempts, null);
                throw new Error(`Wrong_PIN_${3 - newAttempts}`);
            }
        }
        if (wallet.pin_failed_attempts > 0) {
            await repo.resetPinAttempts(wallet.id);
        }
    } else {
        if (!faceImagePath) throw new Error('Face_Verification_Required');
        const kycRecord = await repo.getUserKycFaceImage(userId);
        if (!kycRecord || !kycRecord.face_image) {
            throw new Error('No_KYC_Record_Found');
        }
        const matchResult = await kycService.verifyFaceMatchFptAi(kycRecord.face_image, faceImagePath);
        if (!matchResult.faceFound || !matchResult.isMatch) {
            throw new Error('Face_Verification_Failed');
        }
    }
}

module.exports = {
    verifyTransactionSecurity
};
