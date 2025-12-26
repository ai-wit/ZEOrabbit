// Shared verification store using database
// For development and production
import { prisma } from './prisma';

interface VerificationData {
  code: string;
  expiresAt: number;
  attempts: number;
}

class VerificationStore {
  async set(phone: string, data: Omit<VerificationData, 'attempts'>) {
    try {
      await prisma.verificationCode.upsert({
        where: { phone },
        update: {
          code: data.code,
          expiresAt: new Date(data.expiresAt),
          attempts: 0
        },
        create: {
          phone,
          code: data.code,
          expiresAt: new Date(data.expiresAt),
          attempts: 0
        }
      });
      console.log(`💾 Saved verification code for ${phone}`);
    } catch (error) {
      console.error('Failed to save verification code:', error);
      throw error;
    }
  }

  async get(phone: string): Promise<VerificationData | undefined> {
    try {
      const record = await prisma.verificationCode.findUnique({
        where: { phone }
      });

      if (!record) return undefined;

      // Clean up expired entries
      if (new Date() > record.expiresAt) {
        await this.delete(phone);
        return undefined;
      }

      return {
        code: record.code,
        expiresAt: record.expiresAt.getTime(),
        attempts: record.attempts
      };
    } catch (error) {
      console.error('Failed to get verification code:', error);
      return undefined;
    }
  }

  async incrementAttempts(phone: string): Promise<boolean> {
    try {
      const record = await prisma.verificationCode.findUnique({
        where: { phone }
      });

      if (!record) return false;

      const newAttempts = record.attempts + 1;

      // Allow maximum 5 attempts
      if (newAttempts >= 5) {
        await this.delete(phone);
        return false;
      }

      await prisma.verificationCode.update({
        where: { phone },
        data: { attempts: newAttempts }
      });

      return true;
    } catch (error) {
      console.error('Failed to increment attempts:', error);
      return false;
    }
  }

  async delete(phone: string) {
    try {
      await prisma.verificationCode.delete({
        where: { phone }
      });
      console.log(`🗑️ Deleted verification code for ${phone}`);
    } catch (error) {
      console.error('Failed to delete verification code:', error);
    }
  }

  // Clean up expired entries periodically
  async cleanup() {
    try {
      const result = await prisma.verificationCode.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
      if (result.count > 0) {
        console.log(`🧹 Cleaned up ${result.count} expired verification codes`);
      }
    } catch (error) {
      console.error('Failed to cleanup verification codes:', error);
    }
  }

  // Debug method for development
  async debug() {
    try {
      const records = await prisma.verificationCode.findMany({
        select: {
          phone: true,
          code: true,
          expiresAt: true,
          attempts: true
        }
      });
      console.log('📱 Current verification codes in DB:', records);
    } catch (error) {
      console.error('Failed to debug verification codes:', error);
    }
  }
}

// Global instance
const verificationStore = new VerificationStore();

// Clean up every 5 minutes
setInterval(() => {
  verificationStore.cleanup();
}, 5 * 60 * 1000);

export { verificationStore };
