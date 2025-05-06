import { toast } from "sonner";

export function errorToast(message: string) {
    toast.error(message, {
        style: {
          background: '#ef4444',
          color: 'white',
          border: '1px solid #dc2626'
        }
      });
}

export function successToast(message: string) {
    toast.success(message, {
        style: {
          background: '#22c55e',
          color: 'white',
          border: '1px solid #16a34a'
        }
      });
}


