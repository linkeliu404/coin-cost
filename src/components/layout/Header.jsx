import React from "react";
import { FiPlus, FiRefreshCw, FiAlertTriangle } from "react-icons/fi";
import { Button } from "@/components/ui";

/**
 * @typedef {Object} HeaderProps
 * @property {() => void} onAddCrypto - 添加加密货币的回调函数
 * @property {() => void} onRefresh - 刷新数据的回调函数
 * @property {boolean} isRefreshing - 是否正在刷新
 */

/**
 * 页面头部组件
 * @param {HeaderProps} props
 * @returns {JSX.Element}
 */
const Header = ({ onAddCrypto, onRefresh, isRefreshing }) => {
  // 显示API错误信息
  const handleShowApiErrors = () => {
    if (typeof window !== "undefined" && window.showApiErrors) {
      window.showApiErrors();
    } else {
      alert("API错误跟踪未初始化");
    }
  };

  return (
    <header className="bg-primary text-primary-foreground p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">CryptoCost</h1>
        <div className="flex space-x-2">
          <Button
            onClick={handleShowApiErrors}
            variant="outline"
            size="sm"
            className="flex items-center text-yellow-500"
            title="显示API错误信息"
          >
            <FiAlertTriangle className="h-4 w-4" />
          </Button>
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            variant="secondary"
            size="sm"
            className="hidden md:flex items-center"
          >
            <FiRefreshCw
              className={`mr-1 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
          <Button
            onClick={onAddCrypto}
            variant="default"
            size="sm"
            className="flex items-center"
          >
            <FiPlus className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">添加加密货币</span>
            <span className="sm:hidden">添加</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
