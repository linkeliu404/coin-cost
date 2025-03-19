import React, { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FiRefreshCw, FiPlus, FiMinus, FiClock } from "react-icons/fi";
import { getHistoricalPrice } from "@/lib/api";

/**
 * @typedef {Object} TransactionFormDialogProps
 * @property {boolean} isOpen - 是否打开弹窗
 * @property {() => void} onClose - 关闭弹窗的回调函数
 * @property {Object} crypto - 加密货币数据
 * @property {(transaction: Object) => void} onSubmit - 提交交易的回调函数
 * @property {Object} [editTransaction] - 要编辑的交易记录，为null时表示新增
 */

/**
 * 交易表单弹窗组件
 * @param {TransactionFormDialogProps} props
 * @returns {JSX.Element}
 */
const TransactionFormDialog = ({
  isOpen,
  onClose,
  crypto,
  onSubmit,
  editTransaction,
}) => {
  const [activeTab, setActiveTab] = useState("buy");
  const [formData, setFormData] = useState({
    amount: "",
    price: crypto?.current_price?.toString() || "",
    dateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    reason: "",
  });
  const [reasonExpanded, setReasonExpanded] = useState(false);
  const [historicalPrice, setHistoricalPrice] = useState(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  const [errors, setErrors] = useState({});

  // 当编辑交易记录变化时，更新表单数据
  useEffect(() => {
    if (editTransaction) {
      const dateObj = new Date(editTransaction.date);

      setActiveTab(editTransaction.type);
      setFormData({
        amount: editTransaction.amount.toString(),
        price: editTransaction.price.toString(),
        dateTime: format(dateObj, "yyyy-MM-dd'T'HH:mm"),
        reason: editTransaction.reason || "",
      });

      setReasonExpanded(!!editTransaction.reason);

      // 当编辑交易记录时，尝试获取历史价格
      fetchHistoricalPrice(dateObj, crypto?.id);
    } else if (isOpen) {
      // 新增交易时重置表单
      const now = new Date();
      setFormData({
        amount: "",
        price: crypto?.current_price?.toString() || "",
        dateTime: format(now, "yyyy-MM-dd'T'HH:mm"),
        reason: "",
      });
      setReasonExpanded(false);
      setHistoricalPrice(null);
    }
  }, [editTransaction, isOpen, crypto]);

  // 获取历史价格
  const fetchHistoricalPrice = async (date, coinId) => {
    if (!coinId) return;

    const timestamp = date.getTime();
    const now = new Date().getTime();

    // 如果选择的时间是最近1小时内的，就使用当前价格
    if (now - timestamp < 60 * 60 * 1000) {
      setHistoricalPrice({
        price: crypto?.current_price,
        isEstimated: false,
      });
      return;
    }

    try {
      setIsLoadingPrice(true);

      // 使用API获取历史价格
      const price = await getHistoricalPrice(coinId, timestamp);

      if (price !== null) {
        // 判断是否为估算价格 (API返回的价格可能是估算的)
        // 我们简单判断：如果时间超过90天，认为是估算价格
        const isEstimated = now - timestamp > 90 * 24 * 60 * 60 * 1000;

        setHistoricalPrice({
          price,
          isEstimated,
          timestamp: date.toISOString(),
        });
      } else {
        setHistoricalPrice(null);
      }
    } catch (error) {
      console.error("Failed to fetch historical price:", error);
      setHistoricalPrice(null);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // 处理日期时间变化
  const handleDateTimeChange = (e) => {
    const newDateTime = e.target.value;
    setFormData((prev) => ({ ...prev, dateTime: newDateTime }));

    // 清除错误
    if (errors.dateTime) {
      setErrors((prev) => ({ ...prev, dateTime: null }));
    }

    // 获取历史价格
    if (newDateTime) {
      const dateObj = new Date(newDateTime);
      fetchHistoricalPrice(dateObj, crypto?.id);
    } else {
      setHistoricalPrice(null);
    }
  };

  // 使用历史价格
  const useHistoricalPrice = () => {
    if (historicalPrice && historicalPrice.price) {
      setFormData((prev) => ({
        ...prev,
        price: historicalPrice.price.toString(),
      }));

      // 清除价格错误
      if (errors.price) {
        setErrors((prev) => ({ ...prev, price: null }));
      }
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 清除错误
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleUseMarketPrice = () => {
    setFormData((prev) => ({
      ...prev,
      price: crypto?.current_price?.toString() || "",
    }));

    // 清除价格错误
    if (errors.price) {
      setErrors((prev) => ({ ...prev, price: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (
      !formData.amount ||
      isNaN(formData.amount) ||
      parseFloat(formData.amount) <= 0
    ) {
      newErrors.amount = "请输入有效的数量";
    }

    if (
      !formData.price ||
      isNaN(formData.price) ||
      parseFloat(formData.price) < 0
    ) {
      newErrors.price = "请输入有效的价格";
    }

    if (!formData.dateTime) {
      newErrors.dateTime = "请选择日期和时间";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const transaction = {
      type: activeTab,
      amount: parseFloat(formData.amount),
      price: parseFloat(formData.price),
      date: formData.dateTime, // 直接使用ISO格式的日期时间
      reason: formData.reason.trim(),
    };

    onSubmit(transaction);

    // 重置表单并关闭弹窗
    onClose();
  };

  const toggleReasonField = () => {
    setReasonExpanded(!reasonExpanded);
  };

  if (!crypto) {
    return null;
  }

  const isEditing = !!editTransaction;
  const dialogTitle = isEditing
    ? `编辑${crypto.name} (${crypto.symbol.toUpperCase()}) 交易记录`
    : `${crypto.name} (${crypto.symbol.toUpperCase()}) 交易记录`;

  const buttonText = isEditing
    ? "保存修改"
    : activeTab === "buy"
    ? "添加买入交易"
    : "添加卖出交易";
  const reasonPlaceholder =
    activeTab === "buy" ? "输入买入理由（可选）" : "输入卖出理由（可选）";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] w-full sm:max-w-[500px] p-4 sm:p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue="buy"
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
          disabled={isEditing}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">买入</TabsTrigger>
            <TabsTrigger value="sell">卖出</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm">
                  数量
                </Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder={`输入${crypto.symbol.toUpperCase()}数量`}
                  className={cn(
                    errors.amount && "border-destructive",
                    "text-sm"
                  )}
                  required
                  step="any"
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-sm">
                  价格 (USD)
                </Label>
                <div className="flex space-x-2">
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    inputMode="decimal"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="输入交易价格"
                    className={cn(
                      errors.price && "border-destructive",
                      "text-sm"
                    )}
                    required
                    step="any"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleUseMarketPrice}
                    title="使用当前市价"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {errors.price && (
                  <p className="text-xs text-destructive">{errors.price}</p>
                )}
              </div>

              {/* 日期和历史价格区域 */}
              {isLoadingPrice || (historicalPrice && historicalPrice.price) ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateTime" className="text-sm">
                      日期 & 时间
                    </Label>
                    <Input
                      id="dateTime"
                      name="dateTime"
                      type="datetime-local"
                      value={formData.dateTime}
                      onChange={handleDateTimeChange}
                      className={cn(
                        errors.dateTime && "border-destructive",
                        "text-sm"
                      )}
                      required
                    />
                    {errors.dateTime && (
                      <p className="text-xs text-destructive">
                        {errors.dateTime}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">当时价格</Label>

                    {isLoadingPrice ? (
                      <div className="flex items-center h-10 text-sm text-muted-foreground">
                        <FiClock className="mr-1 h-4 w-4" />
                        加载中...
                      </div>
                    ) : historicalPrice && historicalPrice.price ? (
                      <button
                        type="button"
                        onClick={useHistoricalPrice}
                        className="h-10 px-3 rounded border border-input bg-transparent text-sm flex items-center text-primary hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <FiClock className="mr-2 h-4 w-4" />$
                        {historicalPrice.price.toLocaleString()}
                        {historicalPrice.isEstimated && " (估)"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="dateTime" className="text-sm">
                    日期 & 时间
                  </Label>
                  <Input
                    id="dateTime"
                    name="dateTime"
                    type="datetime-local"
                    value={formData.dateTime}
                    onChange={handleDateTimeChange}
                    className={cn(
                      errors.dateTime && "border-destructive",
                      "text-sm"
                    )}
                    required
                  />
                  {errors.dateTime && (
                    <p className="text-xs text-destructive">
                      {errors.dateTime}
                    </p>
                  )}
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={toggleReasonField}
                  className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {reasonExpanded ? (
                    <FiMinus className="mr-1 h-4 w-4" />
                  ) : (
                    <FiPlus className="mr-1 h-4 w-4" />
                  )}
                  {activeTab === "buy" ? "买入理由" : "卖出理由"}（可选）
                </button>

                {reasonExpanded && (
                  <div className="mt-2">
                    <Textarea
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={handleChange}
                      placeholder={reasonPlaceholder}
                      className="resize-none text-sm mt-2"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                type="submit"
                variant={activeTab === "buy" ? "default" : "destructive"}
                className="w-full sm:w-auto"
              >
                {buttonText}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionFormDialog;
