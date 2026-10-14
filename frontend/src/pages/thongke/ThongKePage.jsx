/**
 * ThongKePage - Hub tổng hợp 3 dashboard
 *
 *  - Tab 1: Tồn kho (All roles)
 *  - Tab 2: Hóa đơn (All roles)
 *  - Tab 3: Tài chính (Admin only - ẩn nếu không phải Admin)
 *
 * Note: API /tai-chinh enforce RBAC ở BE, nhưng FE ẩn tab để UX tốt hơn
 */
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Warehouse,
  Receipt,
  Wallet,
  BarChart3,
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import ThongKeKhoTab from './ThongKeKhoTab';
import ThongKeHoaDonTab from './ThongKeHoaDonTab';
import ThongKeTaiChinhTab from './ThongKeTaiChinhTab';

function ThongKePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const allTabs = [
    { key: 'kho', label: 'Tồn kho', icon: <Warehouse className="h-4 w-4" /> },
    { key: 'hoadon', label: 'Hóa đơn', icon: <Receipt className="h-4 w-4" /> },
    { key: 'taichinh', label: 'Tài chính', icon: <Wallet className="h-4 w-4" /> },
  ];
  const visibleTabs = isAdmin
    ? allTabs
    : allTabs.filter((t) => t.key !== 'taichinh');

  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.key || 'kho');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={<BarChart3 />}
        title="Thống kê & Báo cáo"
        subtitle="Tổng hợp dữ liệu vận hành nhà thuốc theo từng module"
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={visibleTabs}
        variant="underline"
      />

      <div role="tabpanel" id={`tabpanel-${activeTab}`} className="pt-2">
        {activeTab === 'kho' && <ThongKeKhoTab />}
        {activeTab === 'hoadon' && <ThongKeHoaDonTab />}
        {activeTab === 'taichinh' && isAdmin && <ThongKeTaiChinhTab />}
      </div>
    </div>
  );
}

export default ThongKePage;
