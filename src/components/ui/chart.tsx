import React from "react";

interface ChartContainerProps {
  className?: string;
}

export function ChartContainer({
  children,
  className,
}: React.PropsWithChildren<ChartContainerProps>) {
  return <div className={className}>{children}</div>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col">
          <span className="text-[0.70rem] uppercase text-muted-foreground">
            {label}
          </span>
          <span className="font-bold text-muted-foreground">
            {payload[0].value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ChartTooltipContent({ children }: React.PropsWithChildren) {
  return <div className="flex flex-col gap-1">{children}</div>;
}
