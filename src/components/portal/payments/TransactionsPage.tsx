import React, { useState, useMemo } from 'react';
import { 
  ReceiptText, Search, Download, Filter, 
  ArrowUpDown, CheckCircle2, Clock, XCircle,
  TrendingUp, Wallet, ArrowRightLeft
} from 'lucide-react';
import { useBookingStore } from '../../../stores/bookingStore';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';

export const TransactionsPage: React.FC = () => {
  const { bookings, loading } = useBookingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt',
    direction: 'desc'
  });

  // Extract transactions from bookings
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

  const totalRevenue = useMemo(() => 
    transactions.reduce((sum, t) => sum + t.amount, 0), 
  [transactions]);

  const pendingBalance = useMemo(() => 
    transactions.reduce((sum, t) => sum + t.balance, 0), 
  [transactions]);

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

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            Transaction <span className="text-primary">Summary</span>
          </h1>
          <p className="text-xs text-muted-foreground">Financial ledger and payment tracking</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Collected</span>
          </div>
          <div className="text-2xl font-mono font-extrabold text-foreground">
            KSh {totalRevenue.toLocaleString()}
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-warning">
            <Clock className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Balance</span>
          </div>
          <div className="text-2xl font-mono font-extrabold text-foreground">
            KSh {pendingBalance.toLocaleString()}
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-2xl space-y-1">
          <div className="flex items-center gap-2 text-success">
            <ArrowRightLeft className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Transactions</span>
          </div>
          <div className="text-2xl font-mono font-extrabold text-foreground">
            {transactions.length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border p-3.5 rounded-xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Input
            placeholder="Search by code, name or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        <Button variant="outline" size="sm" className="text-xs">
          <Filter className="w-3.5 h-3.5 mr-1" />
          More Filters
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
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
                  <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-foreground justify-end">
                    Amount <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
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
                    <td className="p-4">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(t.date).toLocaleDateString('en-KE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                      <div className="text-[10px]">
                        {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
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
