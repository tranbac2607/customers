declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: {
        id: string;
        role: 'admin' | 'user';
        email?: string;
      };
    }
  }
}

export {};
