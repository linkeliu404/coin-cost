"use client";

import React, { useState, useEffect } from "react";
import { getCryptocurrencyDetails } from "@/lib/api";
import { usePortfolio } from "@/hooks/usePortfolio";
import Header from "@/components/layout/Header";
import CryptoSearch from "@/components/features/CryptoSearch";
import PortfolioSummary from "@/components/features/PortfolioSummary";
import PortfolioCharts from "@/components/features/PortfolioCharts";
import CoinList from "@/components/features/CoinList";
import TransactionList from "@/components/features/TransactionList";
import TransactionFormDialog from "@/components/features/TransactionFormDialog";
import { Button, Spinner } from "@/components/ui";

export default function Home() {
  const {
    portfolio,
    isLoading: isPortfolioLoading,
    error: portfolioError,
    addTransaction,
    deleteTransaction,
    refreshPortfolio,
    updateTransaction,
  } = usePortfolio();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCoinId, setSelectedCoinId] = useState(null);
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [transactionAdded, setTransactionAdded] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  // 当选择的币种ID变化时，获取币种详情
  useEffect(() => {
    const fetchCryptoDetails = async () => {
      if (!selectedCoinId) {
        setSelectedCrypto(null);
        return;
      }

      try {
        const cryptoData = await getCryptocurrencyDetails(selectedCoinId);
        setSelectedCrypto(cryptoData);

        // 当选择新币种且不是编辑模式时，自动打开交易表单
        const selectedCoin = portfolio.coins.find(
          (coin) => coin.id === selectedCoinId
        );
        const hasNoTransactions =
          !selectedCoin ||
          !selectedCoin.transactions ||
          selectedCoin.transactions.length === 0;

        if (hasNoTransactions && !editingTransaction) {
          setIsTransactionFormOpen(true);
        }
      } catch (error) {
        console.error("Failed to fetch crypto details:", error);
      }
    };

    fetchCryptoDetails();
  }, [selectedCoinId, portfolio.coins, editingTransaction]);

  // 当交易添加后，刷新投资组合
  useEffect(() => {
    if (transactionAdded) {
      refreshPortfolio();
      setTransactionAdded(false);
    }
  }, [transactionAdded, refreshPortfolio]);

  // 打开搜索模态框
  const handleOpenSearchModal = () => {
    setIsSearchModalOpen(true);
  };

  // 关闭搜索模态框
  const handleCloseSearchModal = () => {
    setIsSearchModalOpen(false);
  };

  // 打开交易表单弹窗
  const handleOpenTransactionForm = () => {
    setEditingTransaction(null);
    setIsTransactionFormOpen(true);
  };

  // 关闭交易表单弹窗
  const handleCloseTransactionForm = () => {
    setIsTransactionFormOpen(false);
    setEditingTransaction(null);
  };

  // 刷新投资组合数据
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPortfolio();
    setIsRefreshing(false);
  };

  // 选择加密货币
  const handleSelectCrypto = (crypto) => {
    setSelectedCoinId(crypto.id);
    setSelectedCrypto(crypto);
  };

  // 选择投资组合中的币种
  const handleSelectCoin = (coinId) => {
    setSelectedCoinId(coinId);
  };

  // 编辑交易记录
  const handleEditTransaction = (transaction) => {
    // 如果transaction包含coinId，需要先设置selectedCoinId
    if (transaction.coinId) {
      setSelectedCoinId(transaction.coinId);
      // 获取对应的加密货币数据
      getCryptocurrencyDetails(transaction.coinId)
        .then((cryptoData) => {
          setSelectedCrypto(cryptoData);
          setEditingTransaction(transaction);
          setIsTransactionFormOpen(true);
        })
        .catch((error) => {
          console.error("Failed to fetch crypto details:", error);
        });
    } else {
      setEditingTransaction(transaction);
      setIsTransactionFormOpen(true);
    }
  };

  // 添加或更新交易记录
  const handleAddOrUpdateTransaction = async (transactionData) => {
    if (!selectedCoinId || !selectedCrypto) {
      console.error("No coin selected or crypto data missing");
      return;
    }

    try {
      let success;

      if (editingTransaction) {
        // 更新现有交易
        success = await updateTransaction(
          selectedCoinId,
          editingTransaction.id,
          transactionData
        );
      } else {
        // 添加新交易
        success = await addTransaction(selectedCoinId, transactionData);
      }

      if (success) {
        setTransactionAdded(true);
        setEditingTransaction(null);
        setIsTransactionFormOpen(false);
      } else {
        console.error("Failed to add/update transaction");
      }
    } catch (error) {
      console.error("Error in handleAddOrUpdateTransaction:", error);
    }
  };

  // 删除交易记录
  const handleDeleteTransaction = async (transactionId, coinId = null) => {
    // 如果提供了coinId，使用它，否则使用当前选中的币种ID
    const targetCoinId = coinId || selectedCoinId;

    if (!targetCoinId) return;

    const success = await deleteTransaction(targetCoinId, transactionId);
    if (success) {
      setTransactionAdded(true);
    }
  };

  // 获取选中币种的投资组合数据
  const getSelectedPortfolioCoin = () => {
    if (!portfolio || !selectedCoinId) return null;

    return portfolio.coins.find((coin) => coin.id === selectedCoinId);
  };

  const selectedPortfolioCoin = getSelectedPortfolioCoin();

  // 检查是否有任何交易记录
  const hasAnyTransactions =
    portfolio &&
    portfolio.coins &&
    portfolio.coins.some(
      (coin) => coin.transactions && coin.transactions.length > 0
    );

  return (
    <div className="min-h-screen bg-background">
      <Header
        onAddCrypto={handleOpenSearchModal}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="container mx-auto px-4 py-6">
        {isPortfolioLoading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner size="xl" />
          </div>
        ) : portfolioError ? (
          <div className="text-center py-8 text-destructive">
            加载投资组合数据失败
          </div>
        ) : (
          <>
            <PortfolioSummary portfolio={portfolio} />

            <PortfolioCharts portfolio={portfolio} />

            <CoinList
              coins={portfolio.coins}
              onSelectCoin={handleSelectCoin}
              onAddTransaction={(coinId) => {
                setSelectedCoinId(coinId);
                // 获取选中的加密货币数据
                const selectedCoin = portfolio.coins.find(
                  (coin) => coin.id === coinId
                );
                if (selectedCoin) {
                  // 使用API获取最新数据
                  getCryptocurrencyDetails(coinId)
                    .then((cryptoData) => {
                      setSelectedCrypto(cryptoData);
                      setIsTransactionFormOpen(true);
                    })
                    .catch((error) => {
                      console.error("Failed to fetch crypto details:", error);
                    });
                }
              }}
            />

            {/* 显示交易记录列表 */}
            {hasAnyTransactions && (
              <TransactionList
                crypto={selectedCrypto}
                transactions={selectedPortfolioCoin?.transactions || []}
                onDelete={handleDeleteTransaction}
                onEdit={handleEditTransaction}
                portfolio={portfolio}
              />
            )}
          </>
        )}
      </main>

      <CryptoSearch
        isOpen={isSearchModalOpen}
        onClose={handleCloseSearchModal}
        onSelect={handleSelectCrypto}
      />

      {selectedCrypto && (
        <TransactionFormDialog
          isOpen={isTransactionFormOpen}
          onClose={handleCloseTransactionForm}
          crypto={selectedCrypto}
          onSubmit={handleAddOrUpdateTransaction}
          editTransaction={editingTransaction}
        />
      )}
    </div>
  );
}
