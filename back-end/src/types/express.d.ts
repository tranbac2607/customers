declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      user?: {
        id: string;
        role: 'admin' | 'user';
        email: string;
      };
    }
  }
}

export {};
