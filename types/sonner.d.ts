declare module 'sonner' {
  import { ReactNode } from 'react';

  export interface ToasterProps {
    position?:
      | 'top-left'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-right'
      | 'top-center'
      | 'bottom-center';
    expand?: boolean;
    visibleToasts?: number;
    closeButton?: boolean;
    richColors?: boolean;
    theme?: 'light' | 'dark' | 'system';
    className?: string;
    toastOptions?: {
      classNames?: {
        toast?: string;
        title?: string;
        description?: string;
        loader?: string;
        closeButton?: string;
        actionButton?: string;
        cancelButton?: string;
      };
    };
  }

  export const Toaster: React.FC<ToasterProps>;

  interface ToastOptions {
    action?: {
      label: string;
      onClick: () => void;
    };
    cancel?: {
      label: string;
      onClick: () => void;
    };
    duration?: number;
    icon?: ReactNode;
    description?: ReactNode;
    promise?: Promise<any>;
  }

  export function toast(message: ReactNode, options?: ToastOptions): void;

  // Add variant methods
  export namespace toast {
    function success(message: ReactNode, options?: ToastOptions): void;
    function error(message: ReactNode, options?: ToastOptions): void;
    function warning(message: ReactNode, options?: ToastOptions): void;
    function info(message: ReactNode, options?: ToastOptions): void;
    function loading(message: ReactNode, options?: ToastOptions): void;
    function promise<T>(
      promise: Promise<T>,
      messages: {
        loading: ReactNode;
        success: ReactNode | ((data: T) => ReactNode);
        error: ReactNode | ((error: any) => ReactNode);
      },
      options?: ToastOptions
    ): Promise<T>;
    function dismiss(): void;
    function custom(message: ReactNode, options?: ToastOptions): void;
  }

  // Add other exports from sonner as needed
}
