// Augment Express Request type to include `user` populated by JWT middleware
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export {};
