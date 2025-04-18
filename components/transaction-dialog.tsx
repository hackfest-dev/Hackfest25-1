"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button, ButtonProps } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TransactionForm } from "@/components/transaction-form";
import { Transaction } from "@/hooks/use-transactions";

interface TransactionDialogProps {
  transaction?: Transaction;
  trigger?: React.ReactNode;
  title?: string;
  description?: string;
  onSuccess?: () => void;
  buttonProps?: ButtonProps;
  defaultValues?: {
    type?: 'income' | 'expense';
    amount?: number;
  };
}

export function TransactionDialog({
  transaction,
  trigger,
  title,
  description,
  onSuccess,
  buttonProps,
  defaultValues
}: TransactionDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    if (onSuccess) onSuccess();
  };

  const isIncome = defaultValues?.type === 'income';
  const defaultTitle = transaction 
    ? "Edit Transaction" 
    : `Add ${isIncome ? 'Income' : 'Expense'}`;
  const defaultDescription = transaction
    ? "Update the details of your transaction"
    : `Record a new ${isIncome ? 'income' : 'expense'} transaction in your account`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button {...buttonProps}>
            <Plus className="mr-2 h-4 w-4" />
            {defaultTitle}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title || defaultTitle}</DialogTitle>
          <DialogDescription>{description || defaultDescription}</DialogDescription>
        </DialogHeader>
        <TransactionForm
          transaction={transaction}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
          defaultValues={{
            amount: defaultValues?.amount || 0,
            type: defaultValues?.type || 'expense'
          }}
        />
      </DialogContent>
    </Dialog>
  );
}