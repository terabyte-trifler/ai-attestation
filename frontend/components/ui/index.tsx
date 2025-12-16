"use client";

// ============================================================
// REUSABLE UI COMPONENTS
// ============================================================

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ============================================================
// BUTTON COMPONENT
// ============================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "gradient";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
      secondary:
        "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700",
      outline:
        "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20",
      ghost:
        "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
      danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
      gradient:
        "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
      xl: "px-8 py-4 text-lg",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);
Button.displayName = "Button";

// ============================================================
// CARD COMPONENTS
// ============================================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700",
        hover &&
          "hover:shadow-md transition-shadow duration-200 cursor-pointer",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "p-6 border-b border-gray-200 dark:border-gray-700",
      className
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

export const CardTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-600 dark:text-gray-400", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// ============================================================
// INPUT COMPONENTS
// ============================================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          "w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
          "transition-colors duration-200",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
);
Input.displayName = "Input";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={cn(
          "w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
          "transition-colors duration-200 min-h-[150px] resize-y",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
);
Textarea.displayName = "Textarea";

// ============================================================
// BADGE COMPONENT
// ============================================================

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "ai"
    | "human"
    | "mixed"
    | "success"
    | "warning"
    | "error";
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      ai: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      human:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      mixed:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      success:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      warning:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

// ============================================================
// PROGRESS COMPONENT
// ============================================================

interface ProgressProps {
  value: number;
  max?: number;
  color?: "default" | "ai" | "human" | "mixed";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Progress({
  value,
  max = 100,
  color = "default",
  showLabel = false,
  size = "md",
  className,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colors = {
    default: "bg-gradient-to-r from-indigo-500 to-purple-500",
    ai: "bg-red-500",
    human: "bg-green-500",
    mixed: "bg-yellow-500",
  };

  const sizes = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium">{percentage.toFixed(1)}%</span>
        </div>
      )}
      <div
        className={cn(
          "rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden",
          sizes[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            colors[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// SPINNER COMPONENT
// ============================================================

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600",
        sizes[size],
        className
      )}
    />
  );
}

// ============================================================
// EMPTY STATE COMPONENT
// ============================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-gray-400 dark:text-gray-500">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// ============================================================
// LOADING COMPONENT
// ============================================================

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function Loading({ size = "md", text, className }: LoadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className
      )}
    >
      <Spinner size={size} />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{text}</p>
      )}
    </div>
  );
}

// ============================================================
// SEPARATOR COMPONENT
// ============================================================

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical";
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-gray-200 dark:bg-gray-700",
        orientation === "horizontal" ? "h-px w-full" : "w-px h-full",
        className
      )}
      {...props}
    />
  )
);
Separator.displayName = "Separator";

// All components are already exported inline above
