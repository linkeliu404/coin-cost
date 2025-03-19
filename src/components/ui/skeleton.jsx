import { cn } from "@/lib/utils";

/**
 * 骨架屏组件，用于加载状态显示
 * @param {Object} props - 组件属性
 * @param {string} [props.className] - 自定义类名
 * @returns {JSX.Element}
 */
const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
};

export { Skeleton };
