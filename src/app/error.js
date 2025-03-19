"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { FiAlertTriangle } from "react-icons/fi";

export default function Error({ error, reset }) {
  const [errorInfo, setErrorInfo] = useState({
    message: error?.message || "未知错误",
    stack: error?.stack || "",
    cause: error?.cause?.message || "",
  });

  // 显示API错误信息
  const handleShowApiErrors = () => {
    if (typeof window !== "undefined" && window.showApiErrors) {
      window.showApiErrors();
    } else {
      alert("API错误跟踪未初始化");
    }
  };

  useEffect(() => {
    // 记录错误到错误报告服务
    console.error("应用程序级别错误:", error);

    // 记录到API错误跟踪
    if (typeof window !== "undefined" && window.trackApiError) {
      window.trackApiError("App-Level-Error", error);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-4">
      <div className="w-full max-w-xl bg-destructive/10 p-6 rounded-lg border border-destructive">
        <div className="flex items-center mb-4">
          <FiAlertTriangle className="h-6 w-6 text-destructive mr-2" />
          <h2 className="text-2xl font-bold text-destructive">应用程序错误</h2>
        </div>

        <div className="mb-6">
          <p className="text-destructive font-medium mb-2">错误信息:</p>
          <p className="bg-background p-3 rounded text-sm mb-4 whitespace-pre-wrap">
            {errorInfo.message}
          </p>

          {errorInfo.cause && (
            <>
              <p className="text-destructive font-medium mb-2">原因:</p>
              <p className="bg-background p-3 rounded text-sm mb-4">
                {errorInfo.cause}
              </p>
            </>
          )}

          <details className="mb-4">
            <summary className="text-destructive font-medium cursor-pointer">
              堆栈跟踪
            </summary>
            <p className="bg-background p-3 rounded text-xs mt-2 whitespace-pre-wrap overflow-auto max-h-60">
              {errorInfo.stack}
            </p>
          </details>

          <p className="text-muted-foreground text-sm">
            请尝试刷新页面或查看API错误记录以获取更多信息。
            如果问题持续存在，请联系技术支持。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button
            onClick={handleShowApiErrors}
            variant="outline"
            className="flex items-center"
          >
            <FiAlertTriangle className="h-4 w-4 mr-2" />
            查看API错误记录
          </Button>

          <Button onClick={() => reset()} className="flex items-center">
            重试
          </Button>
        </div>
      </div>
    </div>
  );
}
