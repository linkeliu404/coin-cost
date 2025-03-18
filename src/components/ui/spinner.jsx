import React from "react";
import { cn } from "@/lib/utils";

/**
 * 加载中旋转组件
 * @param {Object} props - 组件属性
 * @param {string} [props.size="md"] - 尺寸，可选值：sm, md, lg, xl
 * @param {string} [props.className] - 自定义类名
 * @returns {JSX.Element}
 */
const Spinner = ({ size = "md", className }) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
    xl: "h-12 w-12 border-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-solid border-primary border-t-transparent",
        sizeClasses[size],
        className
      )}
    />
  );
};

export default Spinner;
