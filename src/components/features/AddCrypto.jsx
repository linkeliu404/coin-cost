import { useState } from "react";
import { useCryptoSearch } from "@/hooks/useCryptoSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { FiSearch, FiX, FiRefreshCw } from "react-icons/fi";

export const AddCrypto = ({ onSelect }) => {
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

  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (crypto) => {
    onSelect(crypto);
    setIsOpen(false);
    clearSearch();
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full"
      >
        {isOpen ? "关闭" : "添加加密货币"}
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索加密货币..."
                  value={searchQuery}
                  onChange={(e) => updateSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={retryFetchTopCryptos}
                disabled={isLoading}
              >
                <FiRefreshCw className={isLoading ? "animate-spin" : ""} />
              </Button>
            </div>

            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

            <div className="max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : searchQuery ? (
                searchResults.map((crypto) => (
                  <button
                    key={crypto.id}
                    onClick={() => handleSelect(crypto)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{crypto.name}</div>
                        <div className="text-sm text-gray-500">
                          {crypto.symbol.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          ${crypto.current_price.toLocaleString()}
                        </div>
                        <div
                          className={`text-sm ${
                            crypto.price_change_percentage_24h >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {crypto.price_change_percentage_24h >= 0 ? "+" : ""}
                          {crypto.price_change_percentage_24h.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                topCryptos.map((crypto) => (
                  <button
                    key={crypto.id}
                    onClick={() => handleSelect(crypto)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{crypto.name}</div>
                        <div className="text-sm text-gray-500">
                          {crypto.symbol.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          ${crypto.current_price.toLocaleString()}
                        </div>
                        <div
                          className={`text-sm ${
                            crypto.price_change_percentage_24h >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          {crypto.price_change_percentage_24h >= 0 ? "+" : ""}
                          {crypto.price_change_percentage_24h.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
