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
import { FiRefreshCw, FiPlus, FiMinus } from "react-icons/fi";

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
    date: format(new Date(), "yyyy-MM-dd"),
    time: format(new Date(), "HH:mm"),
    reason: "",
  });
  const [reasonExpanded, setReasonExpanded] = useState(false);

  const [errors, setErrors] = useState({});

  // 当编辑交易记录变化时，更新表单数据
  useEffect(() => {
    if (editTransaction) {
      const dateObj = new Date(editTransaction.date);

      setActiveTab(editTransaction.type);
      setFormData({
        amount: editTransaction.amount.toString(),
        price: editTransaction.price.toString(),
        date: format(dateObj, "yyyy-MM-dd"),
        time: format(dateObj, "HH:mm"),
        reason: editTransaction.reason || "",
      });

      setReasonExpanded(!!editTransaction.reason);
    } else if (isOpen) {
      // 新增交易时重置表单
      setFormData({
        amount: "",
        price: crypto?.current_price?.toString() || "",
        date: format(new Date(), "yyyy-MM-dd"),
        time: format(new Date(), "HH:mm"),
        reason: "",
      });
      setReasonExpanded(false);
    }
  }, [editTransaction, isOpen, crypto]);

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

    if (!formData.date) {
      newErrors.date = "请选择日期";
    }

    if (!formData.time) {
      newErrors.time = "请选择时间";
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
      date: `${formData.date}T${formData.time}`,
      reason: formData.reason.trim(),
    };

    onSubmit(transaction);

    // 重置表单
    setFormData({
      amount: "",
      price: crypto?.current_price?.toString() || "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: format(new Date(), "HH:mm"),
      reason: "",
    });

    // 关闭弹窗
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
                    title="使用市价"
                  >
                    <FiRefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                {errors.price && (
                  <p className="text-xs text-destructive">{errors.price}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm">
                    日期
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={cn(
                      errors.date && "border-destructive",
                      "text-sm"
                    )}
                    required
                  />
                  {errors.date && (
                    <p className="text-xs text-destructive">{errors.date}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm">
                    时间
                  </Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                    className={cn(
                      errors.time && "border-destructive",
                      "text-sm"
                    )}
                    required
                  />
                  {errors.time && (
                    <p className="text-xs text-destructive">{errors.time}</p>
                  )}
                </div>
              </div>

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
