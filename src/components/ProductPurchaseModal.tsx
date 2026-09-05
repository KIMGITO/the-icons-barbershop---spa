import { SafeImage } from './ui/SafeImage';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  ShoppingBag, 
  CheckCircle2, 
  MapPin, 
  Truck, 
  Phone, 
  MessageSquare, 
  ArrowRight, 
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { ProductItem } from '../types';
import { Button, Input, Price } from './ui';

export const ProductPurchaseModal: React.FC = () => {
  const { 
    isPurchaseModalOpen, 
    closePurchaseModal, 
    selectedProductForPurchase, 
    products, 
    createOrder,
    businessInfo 
  } = useApp();

  const [selectedProduct, setSelectedProduct] = useState<ProductItem | undefined>(selectedProductForPurchase);
  const [quantity, setQuantity] = useState<number>(1);
  const [deliveryMethod, setDeliveryMethod] = useState<'studio-pickup' | 'nairobi-delivery'>('studio-pickup');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+254 ');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmedOrderCode, setConfirmedOrderCode] = useState<string | null>(null);

  // Sync state if selectedProductForPurchase changes
  React.useEffect(() => {
    if (selectedProductForPurchase) {
      setSelectedProduct(selectedProductForPurchase);
      setQuantity(1);
      setConfirmedOrderCode(null);
    } else if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0]);
    }
  }, [selectedProductForPurchase, products]);

  if (!isPurchaseModalOpen) return null;

  const activeProduct = selectedProduct || products[0];
  const unitPrice = activeProduct?.priceKsh || 0;
  const deliveryFee = deliveryMethod === 'nairobi-delivery' ? 350 : 0;
  const totalPrice = unitPrice * quantity + deliveryFee;

  const formatKsh = (amount: number) => `KSh ${amount.toLocaleString()}`;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) return;

    const newOrder = createOrder({
      items: [
        {
          productId: activeProduct.id,
          productName: activeProduct.name,
          quantity,
          priceKsh: activeProduct.priceKsh
        }
      ],
      totalPriceKsh: totalPrice,
      customerName,
      customerPhone,
      customerEmail: customerEmail || 'guest@client.theiconsbarber.co.ke',
      deliveryMethod,
      deliveryAddress: deliveryMethod === 'nairobi-delivery' ? deliveryAddress : undefined,
      notes: notes || undefined,
      status: 'pending'
    });

    setConfirmedOrderCode(newOrder.orderNumber);
  };

  const handleWhatsAppOrder = () => {
    const text = `Hello The Icons Barber & Spa Concierge, I would like to order:
- Product: ${activeProduct.name}
- Quantity: ${quantity}
- Total: ${formatKsh(totalPrice)}
- Fulfillment: ${deliveryMethod === 'studio-pickup' ? 'Studio Pickup (Nairobi)' : `Nairobi Delivery to: ${deliveryAddress || 'Nairobi'}`}
- Name: ${customerName || 'Client'}
- Phone: ${customerPhone || ''}`;

    const url = `https://wa.me/254712345678?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      id="product-purchase-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePurchaseModal();
      }}
    >
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-2xl my-8 text-left text-white">
        
        {/* Close Button */}
        <button
          onClick={closePurchaseModal}
          className="absolute top-5 right-5 p-2 rounded-full bg-secondary border border-border text-muted-foreground hover:text-white hover:border-white/40 focus:outline-none transition-colors cursor-pointer"
          aria-label="Close order modal"
        >
          <X className="w-5 h-5" />
        </button>

        {confirmedOrderCode ? (
          /* Order Confirmation Screen */
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary text-primary flex items-center justify-center mx-auto mb-4">
              <PackageCheck className="w-8 h-8" />
            </div>

            <h3 className="font-heading text-2xl font-bold text-white mb-2">Order Confirmed!</h3>
            <p className="text-sm text-muted-foreground-light mb-6">
              Thank you, <strong className="text-white">{customerName}</strong>. Your product reservation has been received.
            </p>

            <div className="bg-secondary border border-border rounded-xl p-5 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b border-white/5">
                <span>Order Reference</span>
                <span className="font-mono text-primary font-bold text-sm">{confirmedOrderCode}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white font-medium">{activeProduct.name} (x{quantity})</span>
                <span className="text-white font-bold">
                  <Price amount={totalPrice} />
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Fulfillment</span>
                <span className="capitalize">{deliveryMethod.replace('-', ' ')}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Our concierge will contact you via WhatsApp or phone ({customerPhone}) within 30 minutes to confirm dispatch or schedule your studio collection.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                size="md"
                onClick={handleWhatsAppOrder}
                className="flex-1 uppercase tracking-wider text-xs font-bold gap-2 text-emerald-400"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message on WhatsApp</span>
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={closePurchaseModal}
                className="flex-1 uppercase tracking-wider text-xs font-bold"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          /* Order Form */
          <div>
            <div className="flex items-center gap-3 pb-5 border-b border-white/10 mb-6">
              <div className="w-10 h-10 rounded-lg bg-secondary border border-primary/40 flex items-center justify-center text-primary">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-white">
                  Order & Reserve Product
                </h3>
                <p className="text-xs text-primary tracking-wide">
                  The Icons Luxury Grooming Collection
                </p>
              </div>
            </div>

            {/* Selected Product Summary Card */}
            <div className="flex items-center gap-4 bg-secondary border border-white/10 rounded-xl p-3.5 mb-6">
              <div className="w-16 h-16 rounded-lg bg-product-surface p-1.5 flex items-center justify-center shrink-0">
                <SafeImage 
                  src={activeProduct.imageUrl} 
                  alt={activeProduct.name} 
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="text-sm font-semibold text-white truncate">{activeProduct.name}</h4>
                <div className="text-xs text-muted-foreground">{activeProduct.specifications.volume}</div>
                <div className="text-sm font-bold text-primary mt-0.5">
                  <Price amount={activeProduct.priceKsh} />
                </div>
              </div>
              {/* Quantity Controls */}
              <div className="flex items-center border border-white/20 rounded-lg bg-black/40 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-2.5 py-1 text-sm text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                >
                  -
                </button>
                <span className="px-2 text-xs font-bold text-white">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-2.5 py-1 text-sm text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              
              {/* Fulfillment Method Toggle */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground-light uppercase tracking-wider mb-2">
                  Fulfillment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('studio-pickup')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      deliveryMethod === 'studio-pickup'
                        ? 'border-primary bg-primary/10 text-white'
                        : 'border-white/10 bg-secondary text-muted-foreground hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className={`w-4 h-4 ${deliveryMethod === 'studio-pickup' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs font-bold text-white">Studio Pickup</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Nairobi Studio Pickup (Free)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('nairobi-delivery')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      deliveryMethod === 'nairobi-delivery'
                        ? 'border-primary bg-primary/10 text-white'
                        : 'border-white/10 bg-secondary text-muted-foreground hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className={`w-4 h-4 ${deliveryMethod === 'nairobi-delivery' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-xs font-bold text-white">Nairobi Delivery</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">Courier (+KSh 350)</span>
                  </button>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Full Name *</label>
                  <Input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. David Kiprono"
                    className="py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Phone Number (M-Pesa) *</label>
                  <Input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+254 700 000 000"
                    className="py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {deliveryMethod === 'nairobi-delivery' && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Delivery Address & Landmark in Nairobi *</label>
                  <Input
                    type="text"
                    required={deliveryMethod === 'nairobi-delivery'}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="e.g. Westlands, Delta Corner Towers, 5th Floor"
                    className="py-2 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Order Notes (Optional)</label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please pack in gift wrapping"
                  className="py-2 text-xs"
                />
              </div>

              {/* Total & Action */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Amount</div>
                  <div className="text-xl font-bold text-primary">
                    <Price amount={totalPrice} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleWhatsAppOrder}
                    className="text-xs font-semibold gap-1.5"
                    title="Order via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span>WhatsApp</span>
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="font-bold text-xs uppercase tracking-wider shadow-md gap-1.5"
                  >
                    <span>Place Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
};
