/**
 * SystemConfigPage — Không gian cấu hình runtime dành cho Quản lý.
 * Các bí mật hạ tầng (JWT_SECRET, DB_PASSWORD...) không hiển thị ở đây.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
    Settings, Save, RefreshCw, Pencil, X, Store, BellRing,
    Briefcase, SlidersHorizontal, ShieldCheck, Database,
    Clock3, Zap, AlertTriangle,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import systemConfigService from '../../services/systemConfigService';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Badge from '../../components/ui/Badge';

dayjs.locale('vi');

const CONFIG_META = {
    TEN_CUA_HANG: {
        label: 'Tên cửa hàng',
        inputType: 'text',
        placeholder: 'Ví dụ: Nhà thuốc SecurePharma',
    },
    DIA_CHI_CUA_HANG: {
        label: 'Địa chỉ cửa hàng',
        inputType: 'text',
        placeholder: 'Số nhà, đường, phường/xã, tỉnh/thành',
    },
    SO_DIEN_THOAI_CUA_HANG: {
        label: 'Số điện thoại liên hệ',
        inputType: 'tel',
        placeholder: 'Ví dụ: 0901 234 567',
    },
    SO_NGAY_CANH_BAO_HET_HAN: {
        label: 'Cảnh báo trước hạn sử dụng',
        inputType: 'number',
        min: 0,
        max: 365,
        step: 1,
        unit: 'ngày',
    },
    SO_NGAY_CANH_BAO_HET_HANG: {
        label: 'Ngưỡng cảnh báo sắp hết hàng',
        inputType: 'number',
        min: 0,
        step: 1,
        unit: 'sản phẩm',
    },
    TI_LE_LAI_NHUAN_MAC_DINH: {
        label: 'Tỷ lệ lợi nhuận mặc định',
        inputType: 'number',
        min: 0,
        max: 1000,
        step: 0.1,
        unit: '%',
    },
    VAT_RATE: {
        label: 'Thuế VAT mặc định',
        inputType: 'number',
        min: 0,
        max: 100,
        step: 0.1,
        unit: '%',
    },
    HE_SO_GIA_BAN_MAC_DINH: {
        label: 'Hệ số giá bán mặc định',
        inputType: 'number',
        min: 0,
        step: 0.1,
        unit: 'lần',
    },
};

const CONFIG_SECTIONS = [
    {
        key: 'shop',
        title: 'Thông tin cửa hàng',
        description: 'Thông tin xuất hiện trên hóa đơn, báo cáo và tài liệu giao dịch.',
        icon: Store,
        iconClass: 'bg-primary-50 text-primary-700',
        keys: ['TEN_CUA_HANG', 'DIA_CHI_CUA_HANG', 'SO_DIEN_THOAI_CUA_HANG'],
        className: 'xl:col-span-2',
    },
    {
        key: 'alerts',
        title: 'Ngưỡng cảnh báo',
        description: 'Điều chỉnh thời điểm hệ thống nhắc về hạn dùng và lượng tồn.',
        icon: BellRing,
        iconClass: 'bg-warning-50 text-warning-700',
        keys: ['SO_NGAY_CANH_BAO_HET_HAN', 'SO_NGAY_CANH_BAO_HET_HANG'],
    },
    {
        key: 'business',
        title: 'Nghiệp vụ mặc định',
        description: 'Các giá trị gợi ý khi tính giá bán và thuế cho giao dịch mới.',
        icon: Briefcase,
        iconClass: 'bg-info-50 text-info-700',
        keys: ['TI_LE_LAI_NHUAN_MAC_DINH', 'VAT_RATE', 'HE_SO_GIA_BAN_MAC_DINH'],
    },
];

function serializeValue(value) {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
}

function formatValue(config) {
    const meta = CONFIG_META[config.key] || {};
    const value = serializeValue(config.value);
    if (!value) return 'Chưa thiết lập';
    return meta.unit ? `${value} ${meta.unit}` : value;
}

function validateValue(configKey, value) {
    const meta = CONFIG_META[configKey] || {};
    const trimmed = value.trim();
    if (!trimmed) return 'Giá trị không được để trống';
    if (meta.inputType === 'number') {
        const number = Number(trimmed);
        if (!Number.isFinite(number)) return 'Vui lòng nhập một số hợp lệ';
        if (meta.min !== undefined && number < meta.min) return `Giá trị tối thiểu là ${meta.min}`;
        if (meta.max !== undefined && number > meta.max) return `Giá trị tối đa là ${meta.max}`;
    }
    return '';
}

function ConfigSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="Đang tải cấu hình">
            {[0, 1, 2].map(item => (
                <div
                    key={item}
                    className={`animate-pulse rounded-card border border-neutral-200 bg-white p-5 motion-reduce:animate-none ${item === 0 ? 'xl:col-span-2' : ''}`}
                >
                    <div className="h-10 w-10 rounded-card bg-neutral-100" />
                    <div className="mt-4 h-4 w-44 rounded bg-neutral-200" />
                    <div className="mt-3 h-3 w-full max-w-sm rounded bg-neutral-100" />
                    <div className="mt-6 h-16 rounded-btn bg-neutral-100" />
                </div>
            ))}
        </div>
    );
}

export default function SystemConfigPage() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [savingKey, setSavingKey] = useState(null);
    const [editingKey, setEditingKey] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [originalValue, setOriginalValue] = useState('');
    const [validationError, setValidationError] = useState('');
    const [confirmSave, setConfirmSave] = useState(false);
    const latestRequestId = useRef(0);
    const hasLoadedData = useRef(false);

    const loadConfigs = useCallback(async (showSkeleton = true) => {
        const requestId = ++latestRequestId.current;
        if (showSkeleton) setLoading(true);
        else setRefreshing(true);
        setLoadError(false);
        try {
            const response = await systemConfigService.getAll();
            if (requestId !== latestRequestId.current) return;
            const data = response.data?.data;
            setConfigs(Array.isArray(data) ? data : []);
            hasLoadedData.current = true;
        } catch (error) {
            if (requestId !== latestRequestId.current) return;
            setLoadError(!hasLoadedData.current);
            toast.error(error?.response?.data?.error?.message || 'Không thể tải cấu hình');
        } finally {
            if (requestId === latestRequestId.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        loadConfigs(true);
        return () => {
            latestRequestId.current += 1;
        };
    }, [loadConfigs]);

    const handleStartEdit = (config) => {
        const value = serializeValue(config.value);
        setEditingKey(config.key);
        setEditValue(value);
        setOriginalValue(value);
        setValidationError('');
    };

    const handleCancelEdit = () => {
        setEditingKey(null);
        setEditValue('');
        setOriginalValue('');
        setValidationError('');
        setConfirmSave(false);
    };

    const handleRequestSave = (event) => {
        event?.preventDefault();
        if (!editingKey) return;
        const error = validateValue(editingKey, editValue);
        setValidationError(error);
        if (!error && editValue !== originalValue) setConfirmSave(true);
    };

    const handleSave = async () => {
        if (!editingKey) return;
        const key = editingKey;
        setSavingKey(key);
        try {
            await systemConfigService.set(key, editValue.trim());
            toast.success('Đã cập nhật cấu hình');
            handleCancelEdit();
            await loadConfigs(false);
        } catch (error) {
            toast.error(error?.response?.data?.error?.message || 'Không thể lưu cấu hình');
        } finally {
            setSavingKey(null);
        }
    };

    const knownKeys = useMemo(() => new Set(CONFIG_SECTIONS.flatMap(section => section.keys)), []);

    const sections = useMemo(() => {
        const knownSections = CONFIG_SECTIONS.map(section => ({
            ...section,
            items: section.keys
                .map(key => configs.find(config => config.key === key))
                .filter(Boolean),
        })).filter(section => section.items.length > 0);

        const otherItems = configs.filter(config => !knownKeys.has(config.key));
        if (otherItems.length > 0) {
            knownSections.push({
                key: 'other',
                title: 'Cấu hình mở rộng',
                description: 'Các tham số hệ thống bổ sung chưa thuộc nhóm nghiệp vụ chuẩn.',
                icon: SlidersHorizontal,
                iconClass: 'bg-neutral-100 text-neutral-700',
                items: otherItems,
                className: 'xl:col-span-2',
            });
        }
        return knownSections;
    }, [configs, knownKeys]);

    const lastUpdated = useMemo(() => configs.reduce((latest, config) => {
        const timestamp = config.updatedAt ? new Date(config.updatedAt).getTime() : 0;
        return timestamp > latest.timestamp ? { timestamp, config } : latest;
    }, { timestamp: 0, config: null }).config, [configs]);

    const renderConfig = (config) => {
        const meta = CONFIG_META[config.key] || { label: config.key, inputType: 'text' };
        const isEditing = editingKey === config.key;
        const isDirty = isEditing && editValue !== originalValue;
        const editLocked = editingKey !== null && !isEditing;

        return (
            <article key={config.key} className="border-t border-neutral-100 px-4 py-4 first:border-t-0 sm:px-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-neutral-900">{meta.label}</h3>
                            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-caption text-neutral-600">{config.key}</code>
                            {isDirty && <Badge variant="warning" size="sm">Chưa lưu</Badge>}
                        </div>
                        {config.description && <p className="mt-1 max-w-2xl text-caption leading-relaxed text-neutral-500">{config.description}</p>}
                        {config.updatedAt && (
                            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-caption text-neutral-400">
                                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                Cập nhật {dayjs(config.updatedAt).format('DD/MM/YYYY HH:mm')}
                                {config.updatedBy ? ` bởi ${config.updatedBy}` : ''}
                            </p>
                        )}
                    </div>

                    <div className="w-full shrink-0 lg:w-[360px]">
                        {isEditing ? (
                            <form onSubmit={handleRequestSave} className="rounded-card border border-primary-200 bg-primary-50/50 p-3">
                                <div className={meta.unit ? 'grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2' : ''}>
                                    <Input
                                        label="Giá trị mới"
                                        type={meta.inputType}
                                        min={meta.min}
                                        max={meta.max}
                                        step={meta.step}
                                        placeholder={meta.placeholder}
                                        value={editValue}
                                        error={validationError}
                                        onChange={event => {
                                            setEditValue(event.target.value);
                                            setValidationError('');
                                        }}
                                        autoFocus
                                    />
                                    {meta.unit && <span className="mb-2.5 rounded-btn bg-white px-3 py-2 text-sm font-medium text-neutral-600 ring-1 ring-inset ring-neutral-200">{meta.unit}</span>}
                                </div>
                                <div className="mt-3 flex items-center justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={handleCancelEdit} icon={<X className="h-4 w-4" />}>Hủy</Button>
                                    <Button type="submit" size="sm" disabled={!isDirty} icon={<Save className="h-4 w-4" />}>Lưu thay đổi</Button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex items-center justify-between gap-3 rounded-btn border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-caption text-neutral-500">Giá trị hiện tại</p>
                                    <p className="mt-0.5 break-words text-sm font-semibold text-neutral-900">{formatValue(config)}</p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={editLocked || refreshing}
                                    onClick={() => handleStartEdit(config)}
                                    icon={<Pencil className="h-4 w-4" />}
                                >
                                    Chỉnh sửa
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </article>
        );
    };

    return (
        <div className="space-y-5 pb-4">
            <PageHeader
                title="Cấu hình hệ thống"
                subtitle="Quản lý các tham số nghiệp vụ có hiệu lực ngay trong toàn hệ thống"
                icon={Settings}
                actions={(
                    <Button
                        variant="secondary"
                        onClick={() => loadConfigs(false)}
                        loading={refreshing}
                        disabled={editingKey !== null}
                        icon={<RefreshCw className="h-4 w-4" />}
                    >
                        Làm mới
                    </Button>
                )}
            />

            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Tổng quan cấu hình">
                <div className="flex items-center gap-3 rounded-card border border-neutral-200 bg-white p-4 shadow-card">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-primary-50 text-primary-700"><Database className="h-5 w-5" aria-hidden="true" /></span>
                    <div><p className="text-caption text-neutral-500">Tham số đang quản lý</p><p className="mt-0.5 text-h3 font-semibold text-neutral-900">{loading ? '—' : configs.length}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-card border border-neutral-200 bg-white p-4 shadow-card">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-info-50 text-info-700"><Clock3 className="h-5 w-5" aria-hidden="true" /></span>
                    <div className="min-w-0"><p className="text-caption text-neutral-500">Cập nhật gần nhất</p><p className="mt-0.5 truncate text-sm font-semibold text-neutral-900">{loading ? 'Đang tải...' : lastUpdated?.updatedAt ? dayjs(lastUpdated.updatedAt).format('DD/MM/YYYY HH:mm') : 'Chưa có dữ liệu'}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-card border border-success-100 bg-success-50 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-white text-success-700 ring-1 ring-inset ring-success-100"><Zap className="h-5 w-5" aria-hidden="true" /></span>
                    <div><p className="text-caption text-success-700">Cơ chế áp dụng</p><p className="mt-0.5 text-sm font-semibold text-neutral-900">Có hiệu lực tức thì</p></div>
                </div>
            </section>

            <section className="flex items-start gap-3 rounded-card border border-info-100 bg-info-50 px-4 py-3.5" aria-label="Lưu ý bảo mật">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-info-700" aria-hidden="true" />
                <div>
                    <h2 className="text-sm font-semibold text-info-700">Thông tin bảo mật được tách riêng</h2>
                    <p className="mt-1 text-caption leading-relaxed text-neutral-700">Trang này chỉ quản lý tham số nghiệp vụ. Các bí mật như JWT_SECRET và DB_PASSWORD vẫn được lưu trong biến môi trường và không hiển thị trên giao diện.</p>
                </div>
            </section>

            {loading ? (
                <ConfigSkeleton />
            ) : loadError ? (
                <section className="rounded-card border border-warning-100 bg-warning-50 px-4 py-10 text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-warning-600" aria-hidden="true" />
                    <h2 className="mt-3 text-sm font-semibold text-neutral-900">Không thể tải cấu hình</h2>
                    <p className="mt-1 text-caption text-neutral-600">Kiểm tra kết nối rồi thử tải lại dữ liệu.</p>
                    <Button className="mt-4" variant="secondary" onClick={() => loadConfigs(true)} icon={<RefreshCw className="h-4 w-4" />}>Thử lại</Button>
                </section>
            ) : configs.length === 0 ? (
                <section className="rounded-card border border-dashed border-neutral-300 bg-white px-4 py-12 text-center">
                    <Settings className="mx-auto h-9 w-9 text-neutral-300" aria-hidden="true" />
                    <h2 className="mt-3 text-sm font-semibold text-neutral-900">Chưa có cấu hình nghiệp vụ</h2>
                    <p className="mt-1 text-caption text-neutral-500">Chạy migration hoặc seed dữ liệu cấu hình để bắt đầu.</p>
                </section>
            ) : (
                <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
                    {sections.map(section => {
                        const Icon = section.icon;
                        return (
                            <section
                                key={section.key}
                                className={`overflow-hidden rounded-card border border-neutral-200 bg-white shadow-card ${section.className || ''}`}
                                aria-labelledby={`config-section-${section.key}`}
                            >
                                <div className="flex items-start gap-3 border-b border-neutral-100 px-4 py-4 sm:px-5">
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-card ${section.iconClass}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 id={`config-section-${section.key}`} className="text-body font-semibold text-neutral-900">{section.title}</h2>
                                            <Badge variant="neutral" size="sm">{section.items.length}</Badge>
                                        </div>
                                        <p className="mt-1 text-caption leading-relaxed text-neutral-500">{section.description}</p>
                                    </div>
                                </div>
                                <div>{section.items.map(renderConfig)}</div>
                            </section>
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                open={confirmSave}
                onClose={() => { if (!savingKey) setConfirmSave(false); }}
                onConfirm={handleSave}
                title="Áp dụng thay đổi cấu hình?"
                message={`Giá trị mới của ${CONFIG_META[editingKey]?.label || editingKey || 'cấu hình'} sẽ có hiệu lực ngay trong hệ thống.`}
                confirmLabel="Lưu thay đổi"
                variant="warning"
                loading={!!savingKey}
            />
        </div>
    );
}
