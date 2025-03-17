import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * @typedef {Object} SpinnerProps
 * @property {string} [size='md'] - 加载图标大小
 * @property {string} [color='primary'] - 加载图标颜色
 * @property {string} [className] - 额外的CSS类名
 */

const spinnerSizes = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
};

/**
 * 加载中组件
 * @param {SpinnerProps} props
 * @returns {JSX.Element}
 */
export function Spinner({ size = "md", className, ...props }) {
  return (
    <Loader2
      className={cn(
        "animate-spin text-muted-foreground",
        spinnerSizes[size],
        className
      )}
      {...props}
    />
  );
}
