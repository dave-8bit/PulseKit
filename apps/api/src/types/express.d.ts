// Type augmentation for Express.
//
// This file extends Express' built-in Request type so that middleware can
// safely attach additional request-scoped values (like an API token)
// that controllers can later read without unsafe type assertions.

export {};

declare global {
  namespace Express {
    interface Request {
      /**
       * API token extracted and validated by api-token.middleware.ts.
       *
       * - Optional: only present after validateApiToken middleware runs.
       */
      apiToken?: string;
    }
  }
}

