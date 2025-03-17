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
  useEffect(() => {
    const fetchTopCryptos = async () => {
      try {
        setIsLoading(true);
        const data = await getTopCryptocurrencies(20);
        setTopCryptos(data);
      } catch (err) {
        setError("Failed to fetch top cryptocurrencies");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopCryptos();
  }, []);

  // 防抖搜索
  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

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
    }, 500),
    []
  );

  // 当搜索查询变化时执行搜索
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  /**
   * 更新搜索查询
   * @param {string} query - 搜索查询
   */
  const updateSearchQuery = (query) => {
    setSearchQuery(query);
  };

  /**
   * 清除搜索结果
   */
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  return {
    searchQuery,
    searchResults,
    topCryptos,
    isLoading,
    error,
    updateSearchQuery,
    clearSearch,
  };
};
