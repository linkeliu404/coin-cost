import React from "react";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { Button } from "@/components/ui";
import Image from "next/image";
import CryptoCostLogo from "@/app/crypto-cost-logo.svg";
import { ThemeToggle } from "@/components/ui/theme-toggle";

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
  return (
    <header className="bg-black text-white p-4 shadow-md dark:bg-[#232325] dark:text-white">
      <div className="container mx-auto flex justify-between items-center">
        <Image
          src={CryptoCostLogo}
          alt="CryptoCost Logo"
          width={155}
          height={25}
          priority
        />
        <div className="flex space-x-2 items-center">
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:text-white hover:bg-gray-800"
            aria-label="刷新数据"
          >
            <FiRefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>

          <ThemeToggle />

          <Button
            onClick={onAddCrypto}
            variant="outline"
            size="sm"
            className="flex items-center bg-white text-black dark:bg-white dark:text-black"
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
