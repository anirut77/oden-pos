import React, { useState, useMemo, useEffect } from 'react';
import { 
  Flame, ShoppingCart, Box, RefreshCw, Settings, BarChart3, 
  ShoppingBag, CheckCircle, Info, Plus, Minus, Trash2, Cloud
} from 'lucide-react';

const APP_ID = "oden-pos-v4";

// วาง URL ของ Google Apps Script ที่นี่
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwd0f7sA3OIvnvbT_x6WS3eCaMH6LfMlP8tSMmLRtpn9IxJz-CEvKnSuZF4Dbwi_OQ/exec";

const App = () => {
  const [view, setView] = useState('pos');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showNotify, setShowNotify] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Database Initialization ---
  const [ingredients, setIngredients] = useState(() => {
    const saved = localStorage.getItem(`${APP_ID}-ing`);
    return saved ? JSON.parse(saved) : [
      { id: 'i1', name: 'ซาลาเปาไส้ครีมชีส TV', stock: 0, unit: 'ถุง', baseCost: 69 },
      { id: 'i2', name: 'ฟองเต้าหู้ซีฟู้ด PFP', stock: 0, unit: 'ถุง', baseCost: 79 },
      { id: 'i3', name: 'เต้าหู้ปลาแผ่น', stock: 0, unit: 'ถุง', baseCost: 35 },
      { id: 'i4', name: 'เต้าหู้ปลาลูกเต๋า', stock: 0, unit: 'ถุง', baseCost: 35 },
      { id: 'i5', name: 'ไม้เสียบอาหาร 8" (200g)', stock: 0, unit: 'ห่อ', baseCost: 11.25 },
      { id: 'i6', name: 'ถุงหูหิ้วแป้ง 60x56', stock: 0, unit: 'ใบ', baseCost: 16 },
      { id: 'i7', name: 'ไข่ไก่เบอร์ 3 (30ฟอง)', stock: 0, unit: 'แพ็ค', baseCost: 80 },
      { id: 'i8', name: 'น้ำจิ้มสุกี้กวางตุ้ง (900g)', stock: 0, unit: 'ถุง', baseCost: 55 },
      { id: 'i9', name: 'ถ้วยเหลี่ยม 1oz (50ชิ้น)', stock: 0, unit: 'ห่อ', baseCost: 20 },
      { id: 'i10', name: 'แก้วกระดาษขาว 16oz (50ใบ)', stock: 0, unit: 'แถว', baseCost: 58 },
      { id: 'i11', name: 'น้ำซุปขวด (ลิตร)', stock: 0, unit: 'ขวด', baseCost: 153 }
    ];
  });

  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem(`${APP_ID}-prod`);
    return saved ? JSON.parse(saved) : [
      { id: 'p1', name: 'ซาลาเปาไส้ครีมชีส', price: 10, stock: 0, recipe: { ingId: 'i1', ratio: 20 } },
      { id: 'p2', name: 'ฟองเต้าหู้', price: 10, stock: 0, recipe: { ingId: 'i2', ratio: 15 } },
      { id: 'p3', name: 'เต้าหู้ปลาแผ่น', price: 10, stock: 0, recipe: { ingId: 'i3', ratio: 10 } },
      { id: 'p4', name: 'เต้าหู้ปลาลูกเต๋า', price: 10, stock: 0, recipe: { id: 'i4', ratio: 12 } },
      { id: 'p5', name: 'ไข่นกกระทา', price: 10, stock: 0, recipe: { ingId: 'i7', ratio: 30 } },
      { id: 'p6', name: 'เส้นบุก', price: 10, stock: 0, recipe: { ingId: 'i11', ratio: 5 } }
    ];
  });

  const [sales, setSales] = useState(() => JSON.parse(localStorage.getItem(`${APP_ID}-sales`) || "[]"));
  const [stockLogs, setStockLogs] = useState(() => JSON.parse(localStorage.getItem(`${APP_ID}-logs`) || "[]"));
  const [cart, setCart] = useState([]);

  useEffect(() => {
    localStorage.setItem(`${APP_ID}-ing`, JSON.stringify(ingredients));
    localStorage.setItem(`${APP_ID}-prod`, JSON.stringify(products));
    localStorage.setItem(`${APP_ID}-sales`, JSON.stringify(sales));
    localStorage.setItem(`${APP_ID}-logs`, JSON.stringify(stockLogs));
  }, [ingredients, products, sales, stockLogs]);

  const notify = (msg) => {
    setShowNotify(msg);
    setTimeout(() => setShowNotify(null), 2500);
  };

  // --- API Sync Function ---
  const syncToCloud = async (type, data) => {
    if (!GOOGLE_SCRIPT_URL) return;
    setIsSyncing(true);
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, timestamp: new Date().toLocaleString('th-TH') })
      });
      console.log(`Cloud Sync Success: ${type}`);
    } catch (error) {
      console.error("Cloud Sync Error:", error);
    } finally {
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const order = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      items: cart.map(i => `${i.name} x${i.qty}`).join(', '),
      total
    };

    setProducts(prev => prev.map(p => {
      const sold = cart.find(c => c.id === p.id);
      return sold ? { ...p, stock: Math.max(0, p.stock - sold.qty) } : p;
    }));

    setSales(prev => [order, ...prev]);
    setCart([]);
    notify(`บันทึกการขายสำเร็จ ฿${total}`);
    syncToCloud('SALE', order);
  };

  const handleStockIn = (ingId, qty, actualCost) => {
    const ing = ingredients.find(i => i.id === ingId);
    const cost = Number(actualCost) || ing.baseCost;
    const amount = Number(qty);
    if (amount <= 0) return;

    const log = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      name: ing.name,
      amount,
      cost: cost * amount
    };

    setIngredients(prev => prev.map(i => i.id === ingId ? { ...i, stock: i.stock + amount, baseCost: cost } : i));
    setStockLogs(prev => [log, ...prev]);
    notify(`รับเข้า ${ing.name} จำนวน ${amount} ${ing.unit}`);
    syncToCloud('STOCK_IN', log);
  };

  const handleConversion = (prodId) => {
    const prod = products.find(p => p.id === prodId);
    if (!prod.recipe) return;
    const ing = ingredients.find(i => i.id === prod.recipe.ingId);
    const qtyToUse = prompt(`ใช้ ${ing.name} จำนวนกี่ ${ing.unit}? (1 ${ing.unit} = ${prod.recipe.ratio} ชิ้น)`, "1");
    if (!qtyToUse || isNaN(qtyToUse) || Number(qtyToUse) <= 0) return;
    const numQty = Number(qtyToUse);
    if (ing.stock < numQty) return notify("วัตถุดิบในคลังไม่เพียงพอ");
    const resultQty = Math.floor(numQty * prod.recipe.ratio);
    
    setIngredients(prev => prev.map(i => i.id === ing.id ? { ...i, stock: i.stock - numQty } : i));
    setProducts(prev => prev.map(p => p.id === prodId ? { ...p, stock: p.stock + resultQty } : p));
    
    const conversionLog = {
      type: 'CONVERSION',
      product: prod.name,
      amount: resultQty,
      date: new Date().toISOString().split('T')[0]
    };
    notify(`แปลงเป็น ${prod.name} จำนวน ${resultQty} ชิ้นสำเร็จ`);
    syncToCloud('CONVERSION', conversionLog);
  };

  const stats = useMemo(() => {
    const daySales = sales.filter(s => s.date === selectedDate).reduce((s, t) => s + t.total, 0);
    const dayStockCost = stockLogs.filter(l => l.date === selectedDate).reduce((s, t) => s + t.cost, 0);
    return { revenue: daySales, cost: dayStockCost, profit: daySales - dayStockCost };
  }, [sales, stockLogs, selectedDate]);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-['Kanit'] text-slate-900">
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r p-6 gap-2 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-orange-600 p-2 rounded-xl text-white"><Flame size={24} /></div>
          <h1 className="font-black text-2xl text-slate-800 tracking-tighter">ODEN ULTIMATE</h1>
        </div>
        <NavBtn active={view === 'pos'} icon={<ShoppingCart />} label="หน้าขาย (POS)" onClick={() => setView('pos')} />
        <NavBtn active={view === 'ingredients'} icon={<Box />} label="คลังวัตถุดิบ" onClick={() => setView('ingredients')} />
        <NavBtn active={view === 'conversion'} icon={<RefreshCw />} label="แปลงวัตถุดิบ" onClick={() => setView('conversion')} />
        <NavBtn active={view === 'settings'} icon={<Settings />} label="ตั้งค่าสินค้า" onClick={() => setView('settings')} />
        <NavBtn active={view === 'reports'} icon={<BarChart3 />} label="รายงานสรุป" onClick={() => setView('reports')} />
        
        <div className="mt-auto p-4 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col gap-2">
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
             <p className="text-[10px] font-bold text-orange-400 uppercase">Cloud Status: {isSyncing ? 'Syncing...' : 'Connected'}</p>
          </div>
          <p className="text-xs text-orange-700 font-medium italic truncate">{GOOGLE_SCRIPT_URL.substring(0, 30)}...</p>
        </div>
      </aside>

      <main className="flex-1 p-4 lg:p-10 pb-28 lg:pb-10 overflow-y-auto">
        {view === 'pos' && (
          <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <header className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">ขายหน้าร้าน</h2>
                  <p className="text-slate-400 text-sm">เลือกสินค้าเพื่อเพิ่มลงตะกร้า</p>
                </div>
                {isSyncing && <div className="flex items-center gap-2 text-orange-600 font-bold text-xs animate-pulse"><Cloud size={16}/> กำลังส่งข้อมูล...</div>}
              </header>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map(p => (
                  <button 
                    key={p.id} 
                    disabled={p.stock <= 0}
                    onClick={() => {
                      setCart(prev => {
                        const existing = prev.find(item => item.id === p.id);
                        if (existing) return prev.map(item => item.id === p.id ? { ...item, qty: item.qty + 1 } : item);
                        return [...prev, { ...p, qty: 1 }];
                      });
                    }}
                    className={`group bg-white p-5 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden ${p.stock > 0 ? 'border-white hover:border-orange-500 shadow-sm hover:shadow-xl' : 'opacity-50 grayscale cursor-not-allowed border-slate-100'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.stock > 10 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        สต็อก: {p.stock}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-700 group-hover:text-orange-600 transition-colors h-12 overflow-hidden">{p.name}</h4>
                    <p className="text-2xl font-black text-slate-900 mt-2">฿{p.price}</p>
                    <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-3 rounded-tl-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={16} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 flex flex-col h-fit sticky top-10 border border-slate-50">
              <h3 className="font-black text-xl mb-6 flex items-center gap-2 text-slate-800">
                <ShoppingBag className="text-orange-600" /> ตะกร้าสินค้า
              </h3>
              <div className="flex-1 space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><ShoppingCart size={24} /></div>
                    <p className="text-slate-400 font-medium text-sm italic">ยังไม่มีสินค้าในตะกร้า</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl group">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700">{item.name}</p>
                        <p className="text-xs text-slate-400 font-bold">฿{item.price} x {item.qty}</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, qty: Math.max(1, i.qty - 1)} : i))} className="w-8 h-8 flex items-center justify-center bg-white rounded-full border text-slate-400 hover:text-orange-500"><Minus size={14} /></button>
                        <span className="font-black w-4 text-center">{item.qty}</span>
                        <button onClick={() => setCart(prev => prev.map(i => i.id === item.id ? {...i, qty: i.qty + 1} : i))} className="w-8 h-8 flex items-center justify-center bg-white rounded-full border text-slate-400 hover:text-orange-500"><Plus size={14} /></button>
                        <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="ml-2 text-red-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t pt-6 space-y-5">
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-400 uppercase">ยอดรวมสุทธิ</span>
                  <span className="text-4xl font-black text-orange-600 tracking-tighter">฿{cart.reduce((s,i)=>s+(i.price*i.qty), 0)}</span>
                </div>
                <button 
                  onClick={handleCheckout} 
                  disabled={cart.length === 0}
                  className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-slate-200 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale"
                >
                  ยืนยันการขาย
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'ingredients' && (
          <div className="max-w-4xl mx-auto space-y-8 text-slate-800">
            <header>
              <h2 className="text-3xl font-black">คลังวัตถุดิบ (Raw Materials)</h2>
              <p className="text-slate-400 text-sm mt-1">จัดการการซื้อเข้าและสต็อกวัตถุดิบ</p>
            </header>
            <div className="grid gap-4">
              {ingredients.map(ing => (
                <div key={ing.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center gap-6 group hover:border-orange-200 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-slate-800">{ing.name}</h4>
                    <div className="flex gap-4 mt-2">
                      <p className="text-xs font-bold text-slate-400 uppercase">ในคลัง: <span className="text-blue-600 font-black">{ing.stock} {ing.unit}</span></p>
                      <p className="text-xs font-bold text-slate-400 uppercase">ราคาตั้งต้น: <span className="text-slate-600 font-black">฿{ing.baseCost}</span></p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-300 ml-2 uppercase">จำนวน</p>
                      <input id={`qty-${ing.id}`} type="number" className="w-24 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500 font-bold" placeholder="0" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-300 ml-2 uppercase">ราคาซื้อ</p>
                      <input id={`cost-${ing.id}`} type="number" className="w-28 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-500 font-black text-orange-600" defaultValue={ing.baseCost} />
                    </div>
                    <button onClick={() => {
                        const q = document.getElementById(`qty-${ing.id}`).value;
                        const c = document.getElementById(`cost-${ing.id}`).value;
                        handleStockIn(ing.id, q, c);
                        document.getElementById(`qty-${ing.id}`).value = '';
                      }} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm active:scale-95 shadow-md">รับเข้า</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'conversion' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <header><h2 className="text-3xl font-black text-slate-800">แปลงวัตถุดิบเป็นสินค้า</h2></header>
            <div className="grid md:grid-cols-2 gap-4">
              {products.map(p => {
                const ing = ingredients.find(i => i.id === p.recipe?.ingId);
                return (
                  <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col justify-between group hover:border-orange-500 transition-all">
                    <div>
                      <h4 className="text-xl font-black text-slate-800">{p.name}</h4>
                      <p className="text-sm text-slate-400 mt-2">ใช้วัตถุดิบ: <span className="text-slate-600 font-bold">{ing?.name}</span></p>
                    </div>
                    <div className="flex items-center justify-between border-t mt-4 pt-4">
                      <div><p className="text-[10px] font-bold text-slate-300 uppercase">สต็อก</p><p className="text-lg font-black">{ing?.stock} {ing?.unit}</p></div>
                      <button onClick={() => handleConversion(p.id)} className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 flex items-center gap-2"><RefreshCw size={16} /> แปลงสินค้า</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <header><h2 className="text-3xl font-black text-slate-800">ตั้งค่าราคาสินค้า</h2></header>
            <div className="bg-white rounded-[2.5rem] shadow-sm border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b"><tr><th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">สินค้า</th><th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">ราคาเดิม</th><th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest text-right">จัดการ</th></tr></thead>
                <tbody className="divide-y">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-6 font-black text-slate-700">{p.name}</td>
                      <td className="p-6 text-center"><span className="bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full font-black text-lg">฿{p.price}</span></td>
                      <td className="p-6 text-right"><button onClick={() => {
                            const newPrice = prompt(`ราคาใหม่สำหรับ ${p.name}:`, p.price);
                            if (newPrice && !isNaN(newPrice)) { setProducts(prev => prev.map(prod => prod.id === p.id ? {...prod, price: Number(newPrice)} : prod)); notify(`แก้ไขสำเร็จ`); }
                          }} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs">แก้ไข</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'reports' && (
          <div className="max-w-6xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">ANALYTICS</h2>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white font-black text-slate-700 border rounded-2xl p-3 outline-none shadow-sm" />
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatCard label="ยอดขายรวม" value={`฿${stats.revenue.toLocaleString()}`} color="text-green-600" />
              <StatCard label="ต้นทุนสต็อก" value={`฿${stats.cost.toLocaleString()}`} color="text-red-500" />
              <StatCard label="กำไรสุทธิ" value={`฿${stats.profit.toLocaleString()}`} color={stats.profit >= 0 ? "text-orange-500" : "text-red-400"} dark />
            </div>
          </div>
        )}
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t p-4 pb-8 flex justify-around items-center z-50">
        <MobBtn active={view === 'pos'} icon={<ShoppingCart size={20} />} label="POS" onClick={() => setView('pos')} />
        <MobBtn active={view === 'ingredients'} icon={<Box size={20} />} label="คลัง" onClick={() => setView('ingredients')} />
        <MobBtn active={view === 'conversion'} icon={<RefreshCw size={20} />} label="แปลง" onClick={() => setView('conversion')} />
        <MobBtn active={view === 'reports'} icon={<BarChart3 size={20} />} label="สรุป" onClick={() => setView('reports')} />
        <button onClick={() => setView('settings')} className={`p-2 rounded-full ${view === 'settings' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}><Settings size={20} /></button>
      </nav>

      {showNotify && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top fade-in">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-3"><CheckCircle className="text-green-400" size={20} /><span className="text-sm font-black uppercase">{showNotify}</span></div>
        </div>
      )}
    </div>
  );
};

const NavBtn = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-5 py-4 rounded-2xl font-black transition-all ${active ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>{React.cloneElement(icon, { size: 20 })}<span className="text-sm">{label}</span></button>
);

const MobBtn = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 px-4 transition-all ${active ? 'text-orange-600 scale-110' : 'text-slate-300'}`}>{icon}<span className="text-[10px] font-black uppercase">{label}</span></button>
);

const StatCard = ({ label, value, color, dark = false }) => (
  <div className={`${dark ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'} p-10 rounded-[3rem] shadow-xl border border-slate-50`}>
    <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-2">{label}</p>
    <h3 className={`text-5xl font-black tracking-tighter ${color}`}>{value}</h3>
  </div>
);

export default App;