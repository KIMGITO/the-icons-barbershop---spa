import React, { useState, useMemo } from 'react';
import { 
  ReceiptText, Search, Download, Filter, 
  ArrowUpDown, RefreshCw, TrendingUp, Clock, ArrowRightLeft
} from 'lucide-react';
import { useBookingStore } from '../../../stores/bookingStore';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import { StatCard } from '../../ui/StatCard';

export const TransactionsPage: React.FC = () => {
  const { bookings, loading } = useBookingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });

  const transactions = useMemo(() => {
    return bookings
      .filter(b => b.depositPaidKsh > 0 || b.paymentStatus === 'paid')
      .map(b => ({
        id: b.id,
        code: b.mpesaReceiptNumber || b.referenceNumber,
        customerName: b.customerName,
        amount: b.depositPaidKsh + (b.totalPriceKsh - b.remainingBalanceKsh - b.depositPaidKsh),
        total: b.totalPriceKsh,
        balance: b.remainingBalanceKsh,
        date: b.createdAt || new Date().toISOString(),
        status: b.paymentStatus,
        method: b.paymentMethod || 'mpesa',
        bookingRef: b.referenceNumber
      }));
  }, [bookings]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.bookingRef.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      const aValue = a[sortConfig.key as keyof typeof a];
      const bValue = b[sortConfig.key as keyof typeof b];
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, searchQuery, sortConfig]);

  const totalRevenue = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions]);
  const pendingBalance = useMemo(() => transactions.reduce((sum, t) => sum + t.balance, 0), [transactions]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Fully Paid</Badge>;
      case 'deposit-paid':
        return <Badge variant="primary">Partial</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-3.5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-base sm:text-2xl font-extrabold text-foreground tracking-tight truncate">
            Transaction <span className="text-primary">Summary</span>
          </h1>
          <p className="hidden sm:block text-xs text-muted-foreground">Financial ledger and payment tracking</p>
        </div>

       
      </div>

      {/* Metrics — reused StatCard component, 3 tight columns even on mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard
          label="Collected"
          value={`KSh ${totalRevenue.toLocaleString()}`}
          valueClassName="text-foreground"
        />
        <StatCard
          label="Pending"
          value={`KSh ${pendingBalance.toLocaleString()}`}
          valueClassName="text-warning"
        />
        <StatCard
          label="Transactions"
          value={transactions.length}
          valueClassName="text-success"
        />
      </div>

      {/* Filters */}
      <div className="rounded-xl flex gap-2">
        <Input
          placeholder="Search code, name, or ref..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 text-xs min-w-0"
          icon={<Search className="w-4 h-4" />}
        />
       
      </div>

      {/* ============ MOBILE: compact card list ============ */}
      <div className="sm:hidden bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">
            <ReceiptText className="w-7 h-7 mx-auto mb-2 opacity-20" />
            No transactions found.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredTransactions.map((t) => (
              <div key={t.id} className="p-3 flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-primary text-xs truncate">{t.code}</span>
                    {getStatusBadge(t.status)}
                  </div>
                  <div className="font-bold text-foreground text-xs truncate">{t.customerName}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatDate(t.date)} · {formatTime(t.date)} · <span className="uppercase">{t.method}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-foreground text-xs">
                    KSh {t.amount.toLocaleString()}
                  </div>
                  {t.balance > 0 && (
                    <div className="text-[10px] text-warning">Bal {t.balance.toLocaleString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ DESKTOP/TABLET: full table ============ */}
      <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider">
                  <button onClick={() => handleSort('code')} className="flex items-center gap-1 hover:text-foreground">
                    Code/Ref <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider">
                  <button onClick={() => handleSort('customerName')} className="flex items-center gap-1 hover:text-foreground">
                    Customer <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider text-right">
                  <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-foreground justify-end ml-auto">
                    Amount <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider">
                  <button onClick={() => handleSort('date')} className="flex items-center gap-1 hover:text-foreground">
                    Date <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading transactions...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    <ReceiptText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold text-primary">{t.code}</div>
                      <div className="text-[10px] text-muted-foreground">Ref: {t.bookingRef}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-foreground">{t.customerName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{t.method}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-mono font-bold text-foreground">KSh {t.amount.toLocaleString()}</div>
                      {t.balance > 0 && (
                        <div className="text-[10px] text-warning">Bal: KSh {t.balance.toLocaleString()}</div>
                      )}
                    </td>
                    <td className="p-4">{getStatusBadge(t.status)}</td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(t.date)}
                      <div className="text-[10px]">{formatTime(t.date)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};