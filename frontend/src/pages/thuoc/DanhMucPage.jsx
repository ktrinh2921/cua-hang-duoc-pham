/**
 * DanhMucPage - Quản lý danh mục thuốc (CRUD)
 *
 * Read: All roles | Write: Admin only.
 * Refactored với design system mới.
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FolderTree, Plus, Edit2, Trash2, FolderOpen } from 'lucide-react';
import danhMucService from '../../services/danhMucService';
import RoleGuard from '../../components/ui/RoleGuard';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Badge from '../../components/ui/Badge';

function DanhMucPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ maDM: '', tenDM: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await danhMucService.getAll();
      setItems(res.data || []);
    } catch (err) {
      toast.error('Không thể tải danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditingItem(null);
    setFormError('');
    setFormData({ maDM: '', tenDM: '' });
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormError('');
    setFormData({ maDM: item.MaDM, tenDM: item.TenDM });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.maDM.trim() || !formData.tenDM.trim()) {
      setFormError('Vui lòng nhập đầy đủ mã và tên danh mục');
      return;
    }
    setSubmitting(true);
    try {
      if (editingItem) {
        await danhMucService.update(editingItem.MaDM, { tenDM: formData.tenDM.trim() });
        toast.success('Cập nhật danh mục thành công');
      } else {
        await danhMucService.create({
          maDM: formData.maDM.trim(),
          tenDM: formData.tenDM.trim(),
        });
        toast.success('Tạo danh mục thành công');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Thao tác thất bại';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await danhMucService.remove(confirmDeleteId);
      toast.success('Xóa danh mục thành công');
      setConfirmDeleteId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Không thể xóa');
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'code',
      label: 'Mã',
      width: '120px',
      render: (it) => <span className="font-mono font-semibold text-primary-700">{it.MaDM}</span>,
    },
    {
      key: 'name',
      label: 'Tên danh mục',
      render: (it) => <span className="font-medium text-neutral-900">{it.TenDM}</span>,
    },
    {
      key: 'count',
      label: 'Số thuốc',
      align: 'center',
      render: (it) => (
        <Badge variant="info" size="sm">
          {it.SoThuoc || 0}
        </Badge>
      ),
    },
    {
      key: 'created',
      label: 'Ngày tạo',
      render: (it) => (
        <span className="text-neutral-500">
          {new Date(it.CreatedAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      width: '100px',
      render: (it) => (
        <RoleGuard roles={['Admin']}>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => openEdit(it)}
              className="p-1.5 rounded-btn text-info-600 hover:bg-info-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              title="Sửa"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(it.MaDM)}
              className="p-1.5 rounded-btn text-danger-600 hover:bg-danger-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              title="Xóa"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </RoleGuard>
      ),
    },
  ];

  const deletingItem = items.find((i) => i.MaDM === confirmDeleteId);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FolderTree />}
        title="Quản lý danh mục"
        subtitle={`Danh sách nhóm thuốc — ${items.length} danh mục`}
        actions={
          <RoleGuard roles={['Admin']}>
            <Button variant="primary" icon={<Plus />} onClick={openCreate}>
              Thêm danh mục
            </Button>
          </RoleGuard>
        }
      />

      <Table
        columns={columns}
        data={items}
        loading={loading}
        rowKey="MaDM"
        emptyTitle="Chưa có danh mục nào"
        emptyIcon={<FolderOpen />}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Sửa danh mục' : 'Thêm danh mục'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Mã danh mục"
            required
            value={formData.maDM}
            onChange={(e) => setFormData({ ...formData, maDM: e.target.value })}
            disabled={!!editingItem}
            maxLength={20}
            placeholder="VD: DM001"
            hint={editingItem ? 'Không thể thay đổi mã' : undefined}
          />
          <Input
            label="Tên danh mục"
            required
            value={formData.tenDM}
            onChange={(e) => setFormData({ ...formData, tenDM: e.target.value })}
            maxLength={200}
            placeholder="VD: Kháng sinh"
          />

          {formError && (
            <div className="p-3 bg-danger-50 border border-danger-100 rounded-btn text-caption text-danger-700">
              {formError}
            </div>
          )}

          <div className="flex gap-2 pt-2 justify-end">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" loading={submitting}>
              {editingItem ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Xóa danh mục"
        message={
          deletingItem
            ? `Bạn có chắc chắn muốn xóa danh mục "${deletingItem.MaDM} - ${deletingItem.TenDM}"?`
            : ''
        }
        confirmLabel="Xóa"
      />
    </div>
  );
}

export default DanhMucPage;
