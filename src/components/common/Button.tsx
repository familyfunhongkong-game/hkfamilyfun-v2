import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variantStyles = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 border-transparent',
  secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 border-transparent',
  outline: 'bg-transparent text-primary-600 border border-primary-600 hover:bg-primary-50',
  danger: 'bg-danger text-white hover:bg-danger/90 border-transparent',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm font-medium rounded',
  md: 'px-4 py-2 text-base font-medium rounded-lg',
  lg: 'px-6 py-3 text-lg font-semibold rounded-lg',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`
        transition-colors font-medium
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center space-x-2">
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
