"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function Error({ error, reset }) {
  useEffect(() => {
    // 记录错误到错误报告服务
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
      <h2 className="text-2xl font-bold mb-4">出错了</h2>
      <p className="text-muted-foreground mb-6">
        抱歉，应用程序遇到了一个错误。
      </p>
      <Button onClick={() => reset()} className="px-4 py-2">
        重试
      </Button>
    </div>
  );
}
