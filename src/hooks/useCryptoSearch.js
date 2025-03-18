import { useState, useEffect, useCallback } from "react";
import { searchCryptocurrencies, getTopCryptocurrencies } from "@/lib/api";
import { debounce } from "@/utils/debounce";

/**
 * 加密货币搜索的自定义钩子
 * @returns {Object} 搜索相关的状态和方法
 */
export const useCryptoSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [topCryptos, setTopCryptos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 获取热门加密货币
  const fetchTopCryptos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTopCryptocurrencies(50);
      setTopCryptos(data);
    } catch (error) {
      console.error("Failed to fetch top cryptocurrencies:", error);
      setError("Failed to fetch top cryptocurrencies");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 重试获取热门加密货币
  const retryFetchTopCryptos = useCallback(() => {
    fetchTopCryptos();
  }, [fetchTopCryptos]);

  // 搜索加密货币
  const searchCrypto = useCallback(async (query) => {
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const results = await searchCryptocurrencies(query);
      setSearchResults(results);
    } catch (error) {
      console.error("Failed to search cryptocurrencies:", error);
      setError("Failed to search cryptocurrencies");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 更新搜索查询
  const updateSearchQuery = useCallback(
    (query) => {
      setSearchQuery(query);
      searchCrypto(query);
    },
    [searchCrypto]
  );

  // 清除搜索
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  // 初始加载热门加密货币
  useEffect(() => {
    fetchTopCryptos();
  }, [fetchTopCryptos]);

  /**
   * 防抖搜索
   */
  const debouncedSearch = useCallback((query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      try {
        setIsLoading(true);
        const results = await searchCryptocurrencies(query);
        setSearchResults(results);
      } catch (err) {
        setError("Failed to search cryptocurrencies");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    debounce(performSearch, 500)();
  }, []);

  // 当搜索查询变化时执行搜索
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  return {
    searchQuery,
    searchResults,
    topCryptos,
    isLoading,
    error,
    updateSearchQuery,
    clearSearch,
    retryFetchTopCryptos,
  };
};
