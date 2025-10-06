declare module 'react-hot-toast' {
  export interface ToastOptions {
    duration?: number;
    position?: string;
    style?: React.CSSProperties;
    className?: string;
    icon?: string | React.ReactNode;
    iconTheme?: {
      primary?: string;
      secondary?: string;
    };
    ariaProps?: {
      role?: string;
      'aria-live'?: string;
    };
  }

  export interface Toast {
    id: string;
    message: string | React.ReactNode;
    type: 'success' | 'error' | 'loading' | 'blank' | 'custom';
    createdAt: number;
    visible: boolean;
    height?: number;
    duration?: number;
    position?: string;
    style?: React.CSSProperties;
    className?: string;
    icon?: string | React.ReactNode;
    iconTheme?: {
      primary?: string;
      secondary?: string;
    };
    ariaProps?: {
      role?: string;
      'aria-live'?: string;
    };
  }

  export const toast: {
    (message: string | React.ReactNode, options?: ToastOptions): string;
    success: (message: string | React.ReactNode, options?: ToastOptions) => string;
    error: (message: string | React.ReactNode, options?: ToastOptions) => string;
    loading: (message: string | React.ReactNode, options?: ToastOptions) => string;
    blank: (message: string | React.ReactNode, options?: ToastOptions) => string;
    custom: (jsx: (t: Toast) => React.ReactNode, options?: ToastOptions) => string;
    dismiss: (toastId?: string) => void;
    remove: (toastId?: string) => void;
    promise: <T>(
      promise: Promise<T>,
      msgs: {
        loading: string | React.ReactNode;
        success: string | React.ReactNode | ((val: T) => React.ReactNode);
        error: string | React.ReactNode | ((err: any) => React.ReactNode);
      },
      options?: ToastOptions
    ) => Promise<T>;
  };

  export const Toaster: React.FC<{
    position?: string;
    reverseOrder?: boolean;
    gutter?: number;
    containerClassName?: string;
    containerStyle?: React.CSSProperties;
    toastOptions?: ToastOptions;
  }>;

  export default toast;
}