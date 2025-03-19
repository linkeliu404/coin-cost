import React, { useState } from "react";
import { FiSearch, FiX, FiCheck } from "react-icons/fi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button, Spinner } from "@/components/ui";
import { useCryptoSearch } from "@/hooks/useCryptoSearch";

/**
 * @typedef {Object} CryptoSearchProps
 * @property {boolean} isOpen - 是否打开搜索模态框
 * @property {() => void} onClose - 关闭模态框的回调函数
 * @property {(crypto: Object) => void} onSelect - 选择加密货币的回调函数
 * @property {Array} [portfolio] - 当前投资组合，可选
 */

/**
 * 加密货币搜索组件
 * @param {CryptoSearchProps} props
 * @returns {JSX.Element}
 */
const CryptoSearch = ({
  isOpen,
  onClose,
  onSelect,
  portfolio = { coins: [] },
}) => {
  const {
    searchQuery,
    searchResults,
    topCryptos,
    isLoading,
    error,
    updateSearchQuery,
    clearSearch,
    retryFetchTopCryptos,
  } = useCryptoSearch();

  const handleSearch = (e) => {
    updateSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    clearSearch();
  };

  const handleSelect = (crypto) => {
    onSelect(crypto);
    onClose();
    clearSearch();
  };

  const displayResults = searchQuery ? searchResults : topCryptos;

  // 检查币种是否已添加到投资组合
  const isAlreadyAdded = (cryptoId) => {
    return (
      portfolio.coins && portfolio.coins.some((coin) => coin.id === cryptoId)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-[800px] p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            搜索加密货币
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Input
              placeholder="搜索加密货币名称、代码或合约地址..."
              value={searchQuery}
              onChange={handleSearch}
              className="pr-10 text-sm sm:text-base"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
                onClick={handleClearSearch}
              >
                <FiX className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
          </div>
          {error && (
            <p className="mt-2 text-xs sm:text-sm text-red-500">
              {error === "Failed to search cryptocurrencies"
                ? "搜索失败，请稍后重试"
                : error}
            </p>
          )}
        </div>

        <div>
          <h4 className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">
            {searchQuery ? "搜索结果" : "热门加密货币"}
          </h4>

          {isLoading ? (
            <div className="flex justify-center py-4 sm:py-8">
              <Spinner size="lg" />
            </div>
          ) : displayResults.length === 0 ? (
            <div className="text-center py-4 sm:py-8 text-muted-foreground text-sm">
              {searchQuery ? (
                "没有找到匹配的加密货币，请尝试其他关键词"
              ) : (
                <div className="flex flex-col items-center">
                  <p className="mb-3">无法加载热门加密货币</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryFetchTopCryptos}
                  >
                    重新加载
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      加密货币
                    </th>
                    <th
                      scope="col"
                      className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      价格
                    </th>
                    <th
                      scope="col"
                      className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell"
                    >
                      24小时变化
                    </th>
                    <th
                      scope="col"
                      className="px-3 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`bg-card divide-y divide-border ${
                    isLoading ? "opacity-70" : ""
                  }`}
                >
                  {displayResults.map((crypto) => {
                    const added = isAlreadyAdded(crypto.id);
                    return (
                      <tr key={crypto.id} className="hover:bg-muted/50">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={crypto.image}
                              alt={crypto.name}
                              className="h-6 w-6 sm:h-8 sm:w-8 rounded-full mr-2 sm:mr-3"
                              onError={(e) => {
                                e.target.src = "/placeholder.png";
                                e.target.onerror = null;
                              }}
                            />
                            <div>
                              <div className="font-medium text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                                {crypto.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {crypto.symbol.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm">
                          ${crypto.current_price.toLocaleString()}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium hidden sm:table-cell">
                          <span
                            className={
                              crypto.price_change_percentage_24h > 0
                                ? "text-green-600"
                                : crypto.price_change_percentage_24h < 0
                                ? "text-red-600"
                                : "text-muted-foreground"
                            }
                          >
                            {crypto.price_change_percentage_24h > 0 ? "+" : ""}
                            {crypto.price_change_percentage_24h.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-medium">
                          {added ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="text-muted-foreground text-xs h-7 sm:h-9"
                            >
                              <FiCheck className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                              已添加
                            </Button>
                          ) : (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSelect(crypto)}
                              className="text-xs h-7 sm:h-9"
                            >
                              添加
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CryptoSearch;
