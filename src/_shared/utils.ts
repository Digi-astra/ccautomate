export class CustomError extends Error {
  success: boolean;
  status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'CustomError';
    this.success = false;
    this.status = status;
    this.message = message;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}




