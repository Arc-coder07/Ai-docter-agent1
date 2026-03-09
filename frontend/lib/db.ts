// Prisma client stub - Database operations are handled by the Python backend
// This file exists to prevent import errors in legacy API routes

const dbStub = new Proxy({} as any, {
  get: (_target, prop) => {
    return new Proxy({} as any, {
      get: () => {
        return async () => {
          console.warn(`Prisma DB operation called (${String(prop)}). Database operations are handled by the Python backend.`);
          return null;
        };
      }
    });
  }
});

export const db = dbStub;