import React from "react";

export const ChartContainer = ({ children, className }) => (
  <div className={className}>{children}</div>
);

export const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          $
          {payload[0].value.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
    );
  }
  return null;
};

export const ChartTooltipContent = ({ children }) => (
  <div className="bg-background border rounded-lg shadow-lg p-2">
    {children}
  </div>
);
